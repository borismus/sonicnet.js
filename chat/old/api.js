var audioContext = new webkitAudioContext();
function UltraSocket(params) {
  params = params || {};
  this.alphabet = params.alphabet;
  this.coder = new SonicCoder({alphabet: this.alphabet});
  this.sender = new SenderOscillator({coder: this.coder});
}

UltraSocket.prototype.send = function(message) {
  this.sender.sendWord(message);
};




function UltraServer(params) {
  params = params || {};
  this.alphabet = params.alphabet;
  this.coder = new SonicCoder({alphabet: this.alphabet});
  this.analyser = new ReceiverAnalyser({
    callback: this.onPeakFrequency_.bind(this),
    coder: this.coder,
    debug: params.debug
  });
  this.stopLoop = false;
  this.lastMessageTime = new Date();
  this.buffer = '';

  this.IDLE_BUFFER_TIME = 800;
}

UltraServer.prototype.start = function() {
  this.analyser.start();
  // Setup a lightweight loop.
  this.startLoop_();
}

UltraServer.prototype.stop = function() {
  this.analyser.stop();
  this.stopLoop = true;
}

UltraServer.prototype.on = function(event, callback) {
  if (event == 'message') {
    this.messageCallback = callback;
  }
};

UltraServer.prototype.onPeakFrequency_ = function(frequency) {
  var char = this.coder.freqToChar(frequency);
  // Make the assumption that we do not allow repeated characters.
  if (char != this.lastChar) {
    this.buffer += char;
    this.lastChar = char;
  }
  this.lastMessageTime = new Date();
};

UltraServer.prototype.startLoop_ = function() {
  this.doLoop_();
};

UltraServer.prototype.doLoop_ = function() {
  // Check to see if we are ready to flush the buffer.
  var elapsedTime = new Date() - this.lastMessageTime;
  if (elapsedTime > this.IDLE_BUFFER_TIME) {
    // Callback.
    if (this.messageCallback && this.buffer) {
      this.messageCallback(this.buffer);
      // Clear the buffer.
      this.buffer = '';
    }
  }
  if (!this.stopLoop) {
    // Loop continuously.
    requestAnimationFrame(this.doLoop_.bind(this));
  }
};
