function PairClient() {
  this.conn_id = null;
  // Create a websocket connection to the server.
  // NOTE(smus): I am no longer running the borismus-pair-ws nodejitsu
  // instance, so to run this demo, you will need to clone the repository
  // and run your own server locally.
  this.socket = new WebSocket('ws://localhost:8080');
  //this.socket = new WebSocket('ws://borismus-pair-ws.nodejitsu.com:80');
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
  this.isServerError = true;
};

module.exports = PairClient;
