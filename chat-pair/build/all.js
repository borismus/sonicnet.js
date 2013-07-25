;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var SonicSocket = require('../lib/sonic-socket.js');
var SonicServer = require('../lib/sonic-server.js');
var PairClient = require('./pair-client.js');

var ALPHABET = '0123456789';
var TOKEN_LENGTH = 5;

// Create an ultranet server.
var sonicServer = new SonicServer({alphabet: ALPHABET, debug: false});
// Create an ultranet socket.
var sonicSocket = new SonicSocket({alphabet: ALPHABET});
// Create a connection to the pairing server.
var pairClient = new PairClient();

var token;

// UI Parts
var changeNameButton = document.querySelector('#change-name');
var connectButton = document.querySelector('#connect');
var chatForm = document.querySelector('#say');
var chatBox = chatForm.querySelector('input');
var userName = localStorage.userName || null;
var history = document.querySelector('#history');
var wrap = document.querySelector('#history-wrap');

function init() {
  // Start the pairing thing.
  initPair();
}

function initPair() {
  // Generate a random pairing token.
  token = generateToken();
  // Setup a connection to the pairing server when it's ready.
  pairClient.on('ready', function() {
    pairClient.start(token);
  });
  // Listen for messages from other clients.
  pairClient.on('message', onIncomingChat);
  pairClient.on('connected', onConnected);
  pairClient.on('disconnected', onDisconnected);
  pairClient.on('pair-confirm', onPairReady);

  // Start an ultranet server.
  sonicServer.start();
  // Start listening for messages on the sonic server.
  sonicServer.on('message', onToken);
}

function initUI() {
  connectButton.addEventListener('click', startChatHandler);
  chatForm.addEventListener('submit', submitHandler);
  changeNameButton.addEventListener('click', changeNameHandler);

  function startChatHandler() {
    // Send the pairing token to nearby ultranet clients.
    sonicSocket.send(token);
  }

  function changeNameHandler() {
    var oldName = getUserName();
    var newName = prompt('New user name (was ' + oldName + ')');
    if (newName) {
      localStorage.userName = newName;
    }
  }

  function submitHandler(e) {
    // Broadcast the message out to the other client (if one exists).
    var authorMessage = getAuthorMessage(getUserName(), chatBox.value)
    // Send through socket.
    pairClient.send(authorMessage);
    // Clear form.
    chatBox.value = '';
    // Update the chat box.
    addChatLine(authorMessage);
    // Prevent the page from reloading.
    e.preventDefault();
  }

}

function generateToken() {
  var token = '';
  var count = 0;
  var char;
  var lastChar;
  while (count < TOKEN_LENGTH) {
    // Generate a random value from the alphabet.
    var index = Math.floor(Math.random() * ALPHABET.length);
    char = ALPHABET[index];
    if (char != lastChar) {
      count += 1;
      token += char;
      lastChar = char;
    }
  }
  return token;
}

function onToken(otherToken) {
  console.log('Got token', otherToken);
  // Don't connect to yourself!
  if (token != otherToken) {
    // Attempt to confirm the connection with the pair server.
    pairClient.confirm(otherToken);
  }
}

function onIncomingChat(text) {
  addChatLine(text);
}

function onPairReady() {
  // Change the text to be "Connect!".
  connectButton.querySelector('span').innerHTML = 'Connect!';
  // Change the button styling to be enabled.
  connectButton.classList.remove('disabled');
  // Configure UI.
  initUI();
}

function onConnected() {
  // Hide the overlay.
  document.querySelector('#overlay').style.display = 'none';
  // Place cursor inside input box.
  chatBox.focus();
}

function onDisconnected() {
  // Show the overlay.
  document.querySelector('#overlay').style.display = 'block';
}

function getAuthorMessage(author, message) {
  return author + ': ' + message;
}

function addChatLine(text) {
  var formattedText = getTime() + ' ' + text;
  history.innerHTML += formattedText + '<br/>';

  // Scroll history to the bottom.
  wrap.scrollTop = history.scrollHeight;
}

function getTime() {
  var now = new Date();
  var hours = now.getHours();
  hours = (hours > 9 ? hours: ' ' + hours);
  var mins = now.getMinutes();
  mins = (mins > 9 ? mins : '0' + mins);
  var secs = now.getSeconds();
  secs = (secs > 9 ? secs : '0' + secs);
  return '[' + hours + ':' + mins + ':' + secs + ']';
}

function getUserName() {
  return (localStorage.userName === undefined ?
          'Anonymous' : localStorage.userName);
}

window.addEventListener('load', init);

},{"../lib/sonic-server.js":5,"../lib/sonic-socket.js":6,"./pair-client.js":2}],2:[function(require,module,exports){
function PairClient() {
  this.conn_id = null;
  // Create a websocket connection to the server.
  //this.socket = new WebSocket('ws://localhost:8080');
  this.socket = new WebSocket('ws://borismus-pair-ws.nodejitsu.com:80');
  this.socket.onmessage = this.onMessage_.bind(this);
  this.socket.onerror = this.onError_.bind(this);

  // All callbacks.
  this.callbacks = {};
}

PairClient.prototype.start = function(token) {
  var msg = JSON.stringify({type: 'start', token: token});
  this.socket.send(msg);
};

PairClient.prototype.confirm = function(token) {
  var msg = JSON.stringify({type: 'confirm', token: token});
  this.socket.send(msg);
};

PairClient.prototype.send = function(message) {
  if (this.conn_id === null) {
    console.error('No connection ID.');
    return;
  }
  var msg = JSON.stringify(
      {type: 'message', conn_id: this.conn_id, message: message});
  this.socket.send(msg);
};

PairClient.prototype.on = function(event, callback) {
  if (event == 'ready') {
    this.socket.onopen = callback;
  }
  if (event == 'message') {
    this.callbacks.message = callback;
  }
  if (event == 'connected') {
    this.callbacks.connected = callback;
  }
  if (event == 'disconnected') {
    this.callbacks.disconnected = callback;
  }
  if (event == 'pair-confirm') {
    this.callbacks.pairConfirm = callback;
  }
};

/***** Private *******/
PairClient.prototype.onMessage_ = function(e) {
  try {
    var json = JSON.parse(e.data);
  } catch (err) {
    console.error('Message must be in JSON format.', err, e.data);
    return;
  }
  if (json.type == 'connected') {
    this.conn_id = json.conn_id;
    console.log('Connection #' + this.conn_id + ' opened.');
    this.fire_(this.callbacks.connected);
  }
  if (json.type == 'message') {
    console.log('Received: ' + json.message);
    this.fire_(this.callbacks.message, json.message);
  }
  if (json.type == 'disconnected') {
    this.conn_id = null;
    this.fire_(this.callbacks.disconnected);
  }
  if (json.type == 'pair-confirm') {
    this.fire_(this.callbacks.pairConfirm);
  }
  if (json.info) {
    console.log('Info: ' + json.info);
    // TODO(smus): Get rid of this bit and replace it with pair-confirm event
    // from server.
    if (json.info == 'Got a pair request.') {
      this.fire_(this.callbacks.pairConfirm);
    }
  }
  if (json.error) {
    console.error('Error: ' + json.error);
  }
};

PairClient.prototype.fire_ = function(callback, arg) {
  if (callback) {
    callback(arg);
  }
};

PairClient.prototype.onError_ = function(err) {
  console.error(err);
};

module.exports = PairClient

},{}],3:[function(require,module,exports){
function RingBuffer(maxLength) {
  this.array = [];
  this.maxLength = maxLength;
}

RingBuffer.prototype.get = function(index) {
  if (index >= this.array.length) {
    return null;
  }
  return this.array[index];
};

RingBuffer.prototype.last = function() {
  if (this.array.length == 0) {
    return null;
  }
  return this.array[this.array.length - 1];
}

RingBuffer.prototype.add = function(value) {
  // Append to the end, remove from the front.
  this.array.push(value);
  if (this.array.length >= this.maxLength) {
    this.array.splice(0, 1);
  }
};

RingBuffer.prototype.length = function() {
  // Return the actual size of the array.
  return this.array.length;
};

RingBuffer.prototype.clear = function() {
  this.array = [];
};

RingBuffer.prototype.copy = function() {
  // Returns a copy of the ring buffer.
  var out = new RingBuffer(this.maxLength);
  out.array = this.array.slice(0);
  return out;
};

RingBuffer.prototype.remove = function(index, length) {
  //console.log('Removing', index, 'through', index+length);
  this.array.splice(index, length);
};

module.exports = RingBuffer;

},{}],4:[function(require,module,exports){
/**
 * A simple sonic encoder/decoder for [a-z0-9] => frequency (and back).
 * A way of representing characters with frequency.
 */
var ALPHABET = '\n abcdefghijklmnopqrstuvwxyz0123456789,.!?@*';

function SonicCoder(params) {
  params = params || {};
  this.freqMin = params.freqMin || 18500;
  this.freqMax = params.freqMax || 19500;
  this.freqError = params.freqError || 50;
  var alphabetString = params.alphabet || ALPHABET;
  this.startChar = params.startChar || '^';
  this.endChar = params.endChar || '$';
  // Make sure that the alphabet has the start and end chars.
  this.alphabet = this.startChar + alphabetString + this.endChar;
}

/**
 * Given a character, convert to the corresponding frequency.
 */
SonicCoder.prototype.charToFreq = function(char) {
  // Get the index of the character.
  var index = this.alphabet.indexOf(char);
  if (index == -1) {
    // If this character isn't in the alphabet, error out.
    console.error(char, 'is an invalid character.');
    index = this.alphabet.length - 1;
  }
  // Convert from index to frequency.
  var freqRange = this.freqMax - this.freqMin;
  var percent = index / this.alphabet.length;
  var freqOffset = Math.round(freqRange * percent);
  return this.freqMin + freqOffset;
};

/**
 * Given a frequency, convert to the corresponding character.
 */
SonicCoder.prototype.freqToChar = function(freq) {
  // If the frequency is out of the range.
  if (!(this.freqMin < freq && freq < this.freqMax)) {
    // If it's close enough to the min, clamp it (and same for max).
    if (this.freqMin - freq < this.freqError) {
      freq = this.freqMin;
    } else if (freq - this.freqMax < this.freqError) {
      freq = this.freqMax;
    } else {
      // Otherwise, report error.
      console.error(freq, 'is out of range.');
      return null;
    }
  }
  // Convert frequency to index to char.
  var freqRange = this.freqMax - this.freqMin;
  var percent = (freq - this.freqMin) / freqRange;
  var index = Math.round(this.alphabet.length * percent);
  return this.alphabet[index];
};

module.exports = SonicCoder;

},{}],5:[function(require,module,exports){
(function(){var RingBuffer = require('./ring-buffer.js');
var SonicCoder = require('./sonic-coder.js');

var audioContext = window.audioContext || new webkitAudioContext();
/**
 * Extracts meaning from audio streams.
 *
 * (assumes audioContext is a WebAudioContext global variable.)
 *
 * 1. Listen to the microphone.
 * 2. Do an FFT on the input.
 * 3. Extract frequency peaks in the ultrasonic range.
 * 4. Keep track of frequency peak history in a ring buffer.
 * 5. Call back when a peak comes up often enough.
 */
function SonicServer(params) {
  params = params || {};
  this.peakThreshold = params.peakThreshold || -65;
  this.debug = !!params.debug;
  this.minRunLength = params.minRunLength || 2;
  this.coder = params.coder || new SonicCoder({alphabet: params.alphabet});

  this.peakHistory = new RingBuffer(16);
  this.peakTimes = new RingBuffer(16);

  this.callbacks = {};

  this.buffer = '';
  this.state = State.IDLE;
}

var State = {
  IDLE: 1,
  RECV: 2
};

/**
 * Start processing the audio stream.
 */
SonicServer.prototype.start = function() {
  // Start listening for microphone. Continue init in onStream.
  navigator.webkitGetUserMedia({audio: true},
      this.onStream_.bind(this), this.onStreamError_.bind(this));
};

SonicServer.prototype.on = function(event, callback) {
  if (event == 'message') {
    this.callbacks.message = callback;
  }
};

SonicServer.prototype.fire_ = function(callback, arg) {
  callback(arg);
};

SonicServer.prototype.onStream_ = function(stream) {
  // Setup audio graph.
  var input = audioContext.createMediaStreamSource(stream);
  var analyser = audioContext.createAnalyser();
  input.connect(analyser);
  // Create the frequency array.
  this.freqs = new Float32Array(analyser.frequencyBinCount);
  // Save the analyser for later.
  this.analyser = analyser;
  // Do an FFT and check for inaudible peaks.
  requestAnimationFrame(this.loop.bind(this));
};

SonicServer.prototype.onStreamError_ = function(e) {
  console.error('Audio input error:', e);
};

/**
 * Given an FFT frequency analysis, return the peak frequency in a frequency
 * range.
 */
SonicServer.prototype.getPeakFrequency = function() {
  // Find where to start.
  var start = this.freqToIndex(this.coder.freqMin);
  // TODO: use first derivative to find the peaks, and then find the largest peak.
  // Just do a max over the set.
  var max = -Infinity;
  var index = -1;
  for (var i = start; i < this.freqs.length; i++) {
    if (this.freqs[i] > max) {
      max = this.freqs[i];
      index = i;
    }
  }
  // Only care about sufficiently tall peaks.
  if (max > this.peakThreshold) {
    return this.indexToFreq(index);
  }
  return null;
};

SonicServer.prototype.loop = function() {
  this.analyser.getFloatFrequencyData(this.freqs);
  // Calculate peaks, and add them to history.
  var freq = this.getPeakFrequency();
  if (freq) {
    var char = this.coder.freqToChar(freq);
    console.log(char);
    this.peakHistory.add(char);
    this.peakTimes.add(new Date());
  }
  // Analyse the peak history.
  this.analysePeaks();
  // DEBUG ONLY: Draw the frequency response graph.
  if (this.debug) {
    this.debugDraw_();
  }
  requestAnimationFrame(this.loop.bind(this));
};

SonicServer.prototype.indexToFreq = function(index) {
  var nyquist = audioContext.sampleRate/2;
  return nyquist/this.freqs.length * index;
};

SonicServer.prototype.freqToIndex = function(frequency) {
  var nyquist = audioContext.sampleRate/2;
  return Math.round(frequency/nyquist * this.freqs.length);
};

/**
 * Analyses the peak history to find true peaks (repeated over several frames).
 */
SonicServer.prototype.analysePeaks = function() {
  // Look for runs of repeated characters.
  var char = this.getLastRun();
  if (!char) {
    return;
  }
  if (this.state == State.IDLE) {
    // If idle, look for start character to go into recv mode.
    if (char == this.coder.startChar) {
      this.buffer = '';
      this.state = State.RECV;
    }
  } else if (this.state == State.RECV) {
    // If receiving, look for character changes.
    if (char != this.lastChar &&
        char != this.coder.startChar && char != this.coder.endChar) {
      this.buffer += char;
      this.lastChar = char;
    }
    // Also look for the end character to go into idle mode.
    if (char == this.coder.endChar) {
      this.state = State.IDLE;
      this.fire_(this.callbacks.message, this.buffer);
      this.buffer = '';
    }
  }
};

SonicServer.prototype.getLastRun = function() {
  var lastChar = this.peakHistory.last();
  var runLength = 0;
  // Look at the peakHistory array for patterns like ajdlfhlkjxxxxxx$.
  for (var i = this.peakHistory.length() - 2; i >= 0; i--) {
    var char = this.peakHistory.get(i);
    if (char == lastChar) {
      runLength += 1;
    } else {
      break;
    }
  }
  if (runLength > this.minRunLength) {
    // Remove it from the buffer.
    this.peakHistory.remove(i + 1, runLength + 1);
    return lastChar;
  }
  return null;
};

/**
 * DEBUG ONLY.
 */
SonicServer.prototype.debugDraw_ = function() {
  var canvas = document.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
  }
  canvas.width = document.body.offsetWidth;
  canvas.height = 480;
  drawContext = canvas.getContext('2d');
  // Plot the frequency data.
  for (var i = 0; i < this.freqs.length; i++) {
    var value = this.freqs[i];
    // Transform this value (in db?) into something that can be plotted.
    var height = value + 400;
    var offset = canvas.height - height - 1;
    var barWidth = canvas.width/this.freqs.length;
    drawContext.fillStyle = 'black';
    drawContext.fillRect(i * barWidth, offset, 1, 1);
  }
};

module.exports = SonicServer;

})()
},{"./ring-buffer.js":3,"./sonic-coder.js":4}],6:[function(require,module,exports){
var SonicCoder = require('./sonic-coder.js');

var audioContext = window.audioContext || new webkitAudioContext();

/**
 * Encodes text as audio streams.
 *
 * 1. Receives a string of text.
 * 2. Creates an oscillator.
 * 3. Converts characters into frequencies.
 * 4. Transmits frequencies, waiting in between appropriately.
 */
function SonicSocket(params) {
  params = params || {};
  this.coder = params.coder || new SonicCoder();
  this.charDuration = params.charDuration || 0.2;
  this.coder = params.coder || new SonicCoder({alphabet: params.alphabet});
}


SonicSocket.prototype.send = function(input) {
  // Surround the word with start and end characters.
  input = this.coder.startChar + input + this.coder.endChar;
  var osc = audioContext.createOscillator();
  osc.connect(audioContext.destination);
  osc.start(0);
  // Use WAAPI to schedule the frequencies.
  for (var i = 0; i < input.length; i++) {
    var char = input[i];
    var freq = this.coder.charToFreq(char);
    var time = audioContext.currentTime + this.charDuration * i;
    osc.frequency.setValueAtTime(freq, time);
  }
  var stopTime = audioContext.currentTime + this.charDuration * input.length;
  osc.stop(stopTime);
};

module.exports = SonicSocket;

},{"./sonic-coder.js":4}]},{},[1])
;