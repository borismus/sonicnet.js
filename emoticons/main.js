var SonicSocket = require('../lib/sonic-socket.js');
var SonicServer = require('../lib/sonic-server.js');
var SonicCoder = require('../lib/sonic-coder.js');


var EMOTICONS = ['happy', 'sad', 'heart', 'mad', 'star', 'oh'];
// Calculate the alphabet based on the emoticons.
var ALPHABET = generateAlphabet(EMOTICONS);
var PLACEHOLDER = 'img/placeholder.gif';

var sonicSocket;
var sonicServer;

createSonicNetwork();

function createSonicNetwork(opt_coder) {
  // Stop the sonic server if it is listening.
  if (sonicServer) {
    sonicServer.stop();
  }
  if (opt_coder) {
    sonicServer = new SonicServer({coder: opt_coder});
    sonicSocket = new SonicSocket({coder: opt_coder});
  } else {
    sonicServer = new SonicServer({alphabet: ALPHABET, debug: false});
    sonicSocket = new SonicSocket({alphabet: ALPHABET});
  }

  sonicServer.start();
  sonicServer.on('message', onIncomingEmoticon);
}


// Build the UI that lets you pick emoticons.
createEmoticonList(EMOTICONS);
if (isMobile()) {
  document.querySelector('#mobile-warning').style.display = 'block';
}

var isAudibleEl = document.querySelector('#is-audible');
isAudibleEl.addEventListener('click', function(e) {
  if (e.target.checked) {
    var coder = new SonicCoder({
      freqMin: 440,
      freqMax: 1760
    });
    createSonicNetwork(coder);
  } else {
    createSonicNetwork();
  }
});

var isFullScreenEl = document.querySelector('#is-full-screen');
isFullScreenEl.addEventListener('click', function(e) {
  var selectEl = document.querySelector('#select-emoticon');
  var recvEl = document.querySelector('#received-emoticon');
  if (e.target.checked) {
    selectEl.style.display = 'none';
    recvEl.classList.add('big');
  } else {
    selectEl.style.display = 'block';
    recvEl.classList.remove('big');
  }
});

var isVisualizer = document.querySelector('#is-visualizer');
isVisualizer.addEventListener('click', function(e) {
  sonicServer.setDebug(e.target.checked);
});

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

function isMobile() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}
