function PairServer() {
  this.conn_id = null;
  // Create a websocket connection to the server.
  //this.socket = new WebSocket('ws://localhost:8080');
  this.socket = new WebSocket('ws://borismus-pair-ws.nodejitsu.com:80');
  this.socket.onmessage = this.onMessage_.bind(this);
  this.socket.onerror = this.onError_.bind(this);
}

PairServer.prototype.start = function(token) {
  var msg = JSON.stringify({type: 'start', token: token});
  this.socket.send(msg);
};

PairServer.prototype.confirm = function(token) {
  var msg = JSON.stringify({type: 'confirm', token: token});
  this.socket.send(msg);
};

PairServer.prototype.send = function(message) {
  if (this.conn_id === null) {
    console.error('No connection ID.');
    return;
  }
  var msg = JSON.stringify(
      {type: 'message', conn_id: this.conn_id, message: message});
  this.socket.send(msg);
};

PairServer.prototype.on = function(event, callback) {
  if (event == 'ready') {
    this.socket.onopen = callback;
  }
};

/***** Private *******/
PairServer.prototype.onMessage_ = function(e) {
  try {
    var json = JSON.parse(e.data);
  } catch (err) {
    console.error('Message must be in JSON format.', err, e.data);
    return;
  }
  if (json.type == 'connected') {
    this.conn_id = json.conn_id;
    console.log('Connection #' + this.conn_id + ' opened.');
  }
  if (json.type == 'message') {
    console.log('Received: ' + json.message);
  }
  if (json.info) {
    console.log('Info: ' + json.info);
  }
  if (json.error) {
    console.error('Error: ' + json.error);
  }
};

PairServer.prototype.onError_ = function(err) {
  console.error(err);
};
