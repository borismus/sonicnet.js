var WS_PORT = 8080;
var PROXY_PORT = 8081;
var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({port: WS_PORT});

// Associations of token:PairRequest.
var pairRequests = {};
// Associations of conn_id:Connection.
var connections = {};

wss.on('connection', function(socket) {
  console.log('Opening socket');
  socket.on('message', function(message) {
    console.log('received: %s', message);
    try {
      // Parse the message.
      var json = JSON.parse(message);
    } catch (err) {
      // If the message isn't JSON, ignore but log it.
      error('Message must be in JSON format.', err);
      return;
    }

    // Initialize a pairing.
    // q: {token: ...}
    // a: {error: ...}
    if (json.type == 'start') {
      handleStart(socket, json);
    }
    // Confirm a pairing.
    // q: {token: ...}
    // a: {type: connected, conn_id: ...} or {error: ...}
    if (json.type == 'confirm') {
      handleConfirm(socket, json);
    }
    // Send a message.
    // q: {conn_id: ..., message: ...}
    // a: {error: ...}
    //
    // Also sends message in format a: {type: message, message: ...}
    if (json.type == 'message') {
      handleMessage(socket, json);
    }
  });

  // When a client closes the socket.
  socket.on('close', function() {
    handleClose(socket);
  });
});

function handleStart(socket, json) {
  var token = json.token;
  // If there's no token, error out.
  if (token) {
    // Add this token:ws pair to the list of pair requests.
    pairRequests[token] = new PairRequest({
      token: token,
      socket: socket
    });
    socket.send(info('Got a pair request.'));
  } else {
    socket.send(error('No token provided.'));
  }
}

function handleConfirm(socket, json) {
  var token = json.token;
  // Check if this token is already in the list of pair requests.
  if (token in pairRequests) {
    var pairRequest = pairRequests[token];
    // If yes, create a connection between the two sockets.
    var conn = new Connection({
      socketA: socket,
      socketB: pairRequest.socket
    })
    // Save the connection for later.
    connections[conn.id] = conn;
    // Notify both sockets that the connection is established.
    var response = JSON.stringify({type: 'connected', conn_id: conn.id});
    conn.socketA.send(response);
    conn.socketB.send(response);
    socket.send(info('Opened connection #' + conn.id));
  } else {
    // Otherwise, error.
    socket.send(error('No pair request found for token.'));
  }
}

function handleMessage(socket, json) {
  var conn_id = json.conn_id;
  var message = json.message;
  // Check to see if this connection is valid.
  if (conn_id in connections) {
    // If yes, relay the message to the other socket
    var conn = connections[conn_id];
    var response = JSON.stringify({type: 'message', message: message});
    if (conn.socketA == socket) {
      conn.socketB.send(response);
    } else if (conn.socketB == socket) {
      conn.socketA.send(response);
    }
  } else {
    // Otherwise, error.
    socket.send(error('No connection found for connection ID.'));
  }
}

function handleClose(socket) {
  // Check if there was a connection associated with the socket.
  var otherSocket;
  var conn;
  for (var connId in connections) {
    conn = connections[connId];
    if (conn.socketA == socket) {
      otherSocket = conn.socketB;
      break;
    }
    if (conn.socketB == socket) {
      otherSocket = conn.socketA;
      break;
    }
  }
  // If yes, also disconnect the other client.
  if (otherSocket) {
    var response = JSON.stringify({type: 'disconnected', conn_id: conn.id});
    console.log('Closing connection #' + conn.id);
    otherSocket.send(response);
    delete connections[conn.id];
  } else {
    console.log('Closing socket (no connection).');
  }
}

function error(msg) {
  return JSON.stringify({error: msg});
}

function info(msg) {
  return JSON.stringify({info: msg});
}

function PairRequest(params) {
  this.created = new Date();
  this.token = params.token;
  this.socket = params.socket;
}

var lastConnectionId = 0;

function Connection(params) {
  this.id = lastConnectionId++;
  this.socketA = params.socketA;
  this.socketB = params.socketB;
}
