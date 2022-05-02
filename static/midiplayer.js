const frequencyForNote = note => {
  return 440 * Math.pow(2, note / 12);
};

// const ac = new AudioContext();

class MidiPlayer {
  constructor(handleEvent) {
    this.handleEvent = handleEvent;
    this.playIndex = 0;
    this.seekTime = 0;
    this.playTime = null;
    this.events = [];
  }
  seek(t) {
    this.seekTime = this.events[0].now + t * 1000;
    this.playIndex = 0;
    while (this.events[this.playIndex].now < this.seekTime)
      this.playIndex++;
  }
  peek() {
    return this.events[this.playIndex];
  }
  pop() {
    return this.events[this.playIndex++];
  }
  step() {
    if (this.playIndex >= this.events.length) {
      this.seek(0);
      this.play();
    } else if (this.peek().now <= Date.now() - this.playTime) {
      this.handleEvent(this.pop().midi);
      this.step();
    } else if (this.playTime) {
      this.schedule();
    }
  }
  schedule() {
    this.schedTimeout = setTimeout(
      () => this.step(),
      this.peek().now - (Date.now() - this.playTime));
  }
  play() {
    this.playTime = Date.now() - this.seekTime;
    this.step();
  }
  pause() {
    this.seekTime = Date.now() - this.playTime;
    clearTimeout(this.schedTimeout);
    this.handleEvent(null);
  }
}

const notesTable = document.getElementById('notesTable');
const noteEls = {};
const noteOscs = {};
const send = value => {
  reserve.broadcast({
    type: 'midiChannel',
    value,
  });
};
const midiPlayer = new MidiPlayer(midi => {
  if (!midi) {
    send({ type: 'allOff', });
    return;
  }
  const [channel, note, value] = midi;
  if (channel >= 144 && channel < 144+16) {
    const noteEl = noteEls[note] = document.createElement('div');
    noteEl.textContent = `${note}@${value}`;
    notesTable.appendChild(noteEl);

    // const osc = ac.createOscillator();
    // osc.type = 'sawtooth';
    // const g = ac.createGain();
    // g.gain.value = 0.01;
    // osc.frequency.value = frequencyForNote(note-60);
    // osc.connect(g);
    // g.connect(ac.destination);
    // osc.start();
    // noteOscs[note] = osc;
    send({ type: 'noteOn', midi, });
  } else if (channel >= 128 && channel <= 128+16) {
    if (!noteEls[note])
      return
    notesTable.removeChild(noteEls[note]);
    delete noteEls[note];

    // noteOscs[note].stop();
    // delete noteOscs[note];

    send({ type: 'noteOff', midi, });
  } else {
    console.log('unknown midi:', midi);
  }
});
playButton.addEventListener('click', e => midiPlayer.play());
pauseButton.addEventListener('click', e => midiPlayer.pause());

const loadMidi = midiText => {
  const events = midiText
    .split('\n')
    .map(line => JSON.parse(line));
  midiPlayer.events = events;
  midiPlayer.seek(0);
  midiPlayer.play();
};

const storageKey = 'constructor.midiplayer.midiText';
if (localStorage[storageKey])
  loadMidi(localStorage[storageKey]);
loadButton.addEventListener('click', e => {
  const midiText = prompt('MIDI log');
  loadMidi(midiText);
  localStorage[storageKey] = midiText;
});

window.addEventListener('sourcechange', e => {
  if (e.detail.indexOf('midiplayer') == -1)
    e.preventDefault();
});
