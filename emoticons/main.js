var EMOTICONS = ['happy', 'sad', 'heart', 'mad', 'star', 'oh'];
// Calculate the alphabet based on the emoticons.
var ALPHABET = generateAlphabet(EMOTICONS);
var PLACEHOLDER = 'img/placeholder.gif';

// Create an ultranet server.
var sonicServer = new SonicServer({alphabet: ALPHABET, debug: false});
// Create an ultranet socket.
var sonicSocket = new SonicSocket({alphabet: ALPHABET});

sonicServer.start();
sonicServer.on('message', onIncomingEmoticon);


// Build the UI that lets you pick emoticons.
createEmoticonList(EMOTICONS);


function generateAlphabet(list) {
  var alphabet = '';
  for (var i = 0; i < Math.min(list.length, 9); i++) {
    alphabet += i.toString();
  }
  return alphabet;
}

function onPickEmoticon(e) {
  var emoticonEl = e.target;
  var name = emoticonEl.dataset.name;
  // Highlight all emoticons except this one.
  var emoticonEls = document.querySelectorAll('.emoticon');
  for (var i = 0; i < emoticonEls.length; i++) {
    var el = emoticonEls[i];
    if (el == emoticonEl) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  }

  var index = EMOTICONS.indexOf(name);
  sonicSocket.send(index.toString());
}

function createEmoticonList(list) {
  var emoticonListEl = document.querySelector('#select-emoticon');
  for (var i = 0; i < list.length; i++) {
    var name = list[i];
    // Create a button for each emoticon with the associated image.
    var emoticonEl = document.createElement('img');
    emoticonEl.classList.add('emoticon');
    emoticonEl.src = getIcon(name);
    emoticonEl.dataset.name = name;
    emoticonEl.addEventListener('click', onPickEmoticon);

    emoticonListEl.appendChild(emoticonEl);
  }
}

function onIncomingEmoticon(message) {
  console.log('message: ' + message);
  var index = parseInt(message);
  // Make the emoticon pop into view.
  var emoticonEl = document.querySelector('#received-emoticon');
  // Validate the message -- it has to be a single valid index.
  var isValid = (!isNaN(index) && 0 <= index && index < EMOTICONS.length);
  if (isValid) {
    emoticonEl.src = getIcon(EMOTICONS[index]);
    emoticonEl.classList.remove('placeholder');
  } else {
    emoticonEl.classList.add('placeholder');
    emoticonEl.src = PLACEHOLDER;
  }
}

function getIcon(name) {
  return 'img/' + name + '.png';
}
