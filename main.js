const letterE = document.getElementById('letter-e');
const letterO = document.getElementById('letter-o');
const letterN = document.getElementById('letter-n');

const letters = [letterE, letterO, letterN];

let letterERotation = 7;

letterE.addEventListener('click', (event) => {
    letterERotation += 3;
    letterE.style.transform = `rotate(${letterERotation}deg)`;
});

setInterval(() => { 
    letters.forEach((letter) => {
        letter.style.filter = 'saturate(200%)';
    });

    if(Math.random() > 0.15)
        return;

    let letter = letters[Math.floor(Math.random() * 3)];
    letter.style.filter = 'brightness(20%)';
}, 230);

const nickInput = document.getElementById('nick');
const playButton = document.getElementById('playButton');

nickInput.addEventListener('keydown', (e) => {
    if(e.key == 'Enter') {
        playButton.click();
    }
});

playButton.addEventListener('click', (e) => {
    e.preventDefault();
    clickPlay(nickInput.value);
});

function hideUI() {
    $('#overlay').hide();
}

function fadeInUINow() {
    $('#overlay').fadeIn(300);
}

function fadeInUI() {
    setTimeout(fadeInUINow, 1000);
}

function clickPlay(nick) {
    if(window.network) {
        window.network.spawn(nick);
    }
}

class Network {
    constructor() {
        this.webSocket = null;
        this.lastPing = null;
    }
}