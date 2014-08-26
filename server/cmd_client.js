#!/usr/bin/env node
// Connects to the server with the specified token. Once connected, enters
// interactive mode.

var WebSocket = require('ws');
// NOTE: No longer running this pairing server. Run the server locally.
//var ws = new WebSocket('ws://borismus-pair-ws.nodejitsu.com:80');
var ws = new WebSocket('ws://localhost:8080');

if (process.argv.length != 3) {
  console.log('Usage: ./cmd_client.js <token>');
  process.exit(1);
}
// Get the token from input.
var token = process.argv[2];
console.log('Token is', token);

// Listen for messages from the command line.
var stdin = process.openStdin();
stdin.on('data', function(chunk) {
  if (!conn_id) {
    console.log('Error: connection is invalid.');
    process.exit(1);
  }
  var body = chunk.toString();
  var msg = JSON.stringify({type: 'message', conn_id: conn_id, message: body});
  ws.send(msg);
  console.log('Sent.');
});

var conn_id = null;
ws.on('open', function() {
  console.log('Socket opened.');
  var msg = JSON.stringify({type: 'confirm', token: token});
  ws.send(msg);
});

ws.on('message', function(text, flags) {
  var data = JSON.parse(text);
  console.log(data);
  if (data.type == 'connected') {
    conn_id = data.conn_id;
    console.log('Connection ', conn_id, ' established');
  } else if (data.type == 'message') {
    console.log('Got message: ', data.message);
  }
});
