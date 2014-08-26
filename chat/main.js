var SonicSocket = require('../lib/sonic-socket.js');
var SonicServer = require('../lib/sonic-server.js');
var SonicCoder = require('../lib/sonic-coder.js');

var ALPHABET = ' abcdefghijklmnopqrstuvwxyz';
// Create an ultranet server.
var sonicServer = new SonicServer({alphabet: ALPHABET, debug: true});
// Create an ultranet socket.
var sonicSocket = new SonicSocket({alphabet: ALPHABET});


var history = document.querySelector('#history');
var wrap = document.querySelector('#history-wrap');
var form = document.querySelector('form');
var input = document.querySelector('input');

function init() {
  sonicServer.start();
  sonicServer.on('message', onIncomingChat);
  form.addEventListener('submit', onSubmitForm);
}

function onSubmitForm(e) {
  // Get contents of input element.
  var message = input.value;
  // Send via oscillator.
  sonicSocket.send(message);
  // Clear the input element.
  input.value = '';
  // Don't actually submit the form.
  e.preventDefault();
}

function onIncomingChat(message) {
  console.log('chat inbound.');
  history.innerHTML += time() + ': ' + message + '<br/>';
  // Scroll history to the bottom.
  wrap.scrollTop = history.scrollHeight;
}

function time() {
  var now = new Date();
  var hours = now.getHours();
  hours = (hours > 9 ? hours: ' ' + hours);
  var mins = now.getMinutes();
  mins = (mins > 9 ? mins : '0' + mins);
  var secs = now.getSeconds();
  secs = (secs > 9 ? secs : '0' + secs);
  return '[' + hours + ':' + mins + ':' + secs + ']';
}

window.addEventListener('load', init);
