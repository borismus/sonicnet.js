var SonicSocket = require('../lib/sonic-socket.js');
var SonicServer = require('../lib/sonic-server.js');
var SonicCoder = require('../lib/sonic-coder.js');
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
  if (pairClient.isServerError) {
    onServerError();
  }
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

function onServerError() {
  // Update the error dialog.
  connectButton.querySelector('span').innerHTML = 'Server error!';
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
