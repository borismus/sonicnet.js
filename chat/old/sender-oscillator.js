/**
 * Encodes text as audio streams.
 *
 * 1. Receives a string of text.
 * 2. Creates an oscillator.
 * 3. Converts characters into frequencies.
 * 4. Transmits frequencies, waiting in between appropriately.
 */
function SenderOscillator(params) {
  params = params || {};
  this.coder = params.coder || new SonicCoder();
  this.charDuration = params.charDuration || 0.2;
}

SenderOscillator.prototype.sendWord = function(input) {
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
