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
function ReceiverAnalyser(params) {
  params = params || {};
  this.callback = params.callback || function() {};
  this.peakThreshold = params.peakThreshold || -65;
  this.debug = !!params.debug;
  this.minFreq = params.minFreq || 19000;
  this.minRunLength = params.minRunLength || 2;
  // How long a letter should take (for repeated letters).
  this.letterTime = params.letterTime || 200;

  this.peakHistory = new RingBuffer(16);
  this.peakTimes = new RingBuffer(16);
}

/**
 * Start processing the audio stream.
 */
ReceiverAnalyser.prototype.start = function() {
  // Start listening for microphone. Continue init in onStream.
  navigator.webkitGetUserMedia({audio: true},
      this.onStream_.bind(this), this.onStreamError_.bind(this));
};

ReceiverAnalyser.prototype.onStream_ = function(stream) {
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

ReceiverAnalyser.prototype.onStreamError_ = function(e) {
  console.error('Audio input error:', e);
};

/**
 * Given an FFT frequency analysis, return the peak frequency in a frequency
 * range.
 */
ReceiverAnalyser.prototype.getPeakFrequency = function() {
  // Find where to start.
  var start = this.freqToIndex(this.minFreq);
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
    console.log(index);
    return this.indexToFreq(index);
  }
  return null;
};

ReceiverAnalyser.prototype.loop = function() {
  this.analyser.getFloatFrequencyData(this.freqs);
  // Calculate peaks, and add them to history.
  var freq = this.getPeakFrequency();
  if (freq) {
    this.peakHistory.add(freq);
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

ReceiverAnalyser.prototype.indexToFreq = function(index) {
  var nyquist = audioContext.sampleRate/2;
  return nyquist/this.freqs.length * index;
};

ReceiverAnalyser.prototype.freqToIndex = function(frequency) {
  var nyquist = audioContext.sampleRate/2;
  return Math.round(frequency/nyquist * this.freqs.length);
};

/**
 * Analyses the peak history to find true peaks (repeated over several frames).
 *
 * TODO: handle repeated letters properly.
 */
ReceiverAnalyser.prototype.analysePeaks = function() {
  // Look for patterns like "*xxxy$".
  var secondLastIndex = this.peakHistory.length() - 2;
  var secondLastValue = this.peakHistory.get(secondLastIndex);
  // First find xy$.
  if (this.peakHistory.last() != secondLastValue) {
    // Then see if we have a run of enough x's before the y.
    var runLength = 0;
    for (var i = secondLastIndex; i >= 0; i--) {
      if (this.peakHistory.get(i) == secondLastValue) {
        runLength += 1;
      } else {
        break;
      }
    }
    if (runLength >= this.minRunLength) {
      // Found a valid run. Remove it from the buffer.
      this.peakHistory.remove(i + 1, runLength);
      // Callback.
      this.callback(secondLastValue);
    }
  }
};

/**
 * DEBUG ONLY.
 */
ReceiverAnalyser.prototype.debugDraw_ = function() {
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
