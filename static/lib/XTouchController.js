export default class XTouchController {
  constructor() {
    const self = this;
    this.buttons = {
      set 46(value) {
        if (!value)
          return;
        if (self.bankNumber == 0)
          return;
        self.bankNumber -= 1;
        self.sendBank();
      },
      set 47(value) {
        if (!value)
          return;
        self.bankNumber += 1;
        self.sendBank();
      },
    };
    this.banks = [];
    this.bankNumber = 0;
    this.observers = [];
    this.ready = this.init();

  }
  handlePort(port) {
    if (port.state == 'connected') {
      if (port.type == 'input') {
        this.input = port;
        port.onmidimessage = e => this.handleData(e.data);
        port.open();
      } else if (port.type == 'output') {
        this.output = port;
        console.log('big bank', this.bank.faders);
        this.sendBank();
      }
    } else {
      if (port.type == 'input')
        this.input = null;
      else if (port.type == 'output')
        this.output = null;
    }
  }
  discoverPorts(ports) {
    for (const [id, port] of ports) {
      if (port.name == 'X-Touch MIDI 1')
        this.handlePort(port);
    }
  }
  addObserver(cb) {
    this.observers.push(cb);
  }
  get bank() {
    if (this.banks.length < this.bankNumber+1) {
      this.banks[this.bankNumber] = {
        faders: [0, 0, 0, 0, 0, 0, 0, 0],
        buttons: {},
      }
    }
    return this.banks[this.bankNumber];
  }
  sendBank() {
    const faders = this.bank.faders;
    for (let i = 0; i < faders.length; i++)
      this.sendFader(i, faders[i] || 0);
  }
  get output() {
    return this._output;
  }
  set output(output) {
    this._output = output;
    if (!output)
      return;
    this.sendBank();
  }
  async init() {
    if (!navigator.requestMIDIAccess)
      return;
    const midi = this.midi = await navigator.requestMIDIAccess({ sysex: true });
    this.discoverPorts(midi.inputs);
    this.discoverPorts(midi.outputs);
    midi.onstatechange = e => {
      this.handlePort(e.port);
    };
  }
  setButton(button, value) {
    console.log(button, value);
    this.buttons[button] = value;
    if (this.output)
      this.output.send([0x90, button, value]);
  }
  handleFader(button, value) {
    const faders = this.bank.faders;
    if (faders[button] == value)
      return;
    this.bank.faders[button] = value;
    for (const observer of this.observers)
      observer(button + this.bankNumber * faders.length, value / 16383);
  }
  setFader(i, value) {
    this.sendFader(i, value * 16383);
  }
  sendFader(i, value) {
    if (!this.output)
      return;
    console.log('send', i, value);
    this.output.send([0xe0 + i, (value & 0x7f), value >> 7]);
  }
  handleData([channel, note, value]) {
    if (channel >= 0xe0 && channel <= 0xe8) {
      this.handleFader(channel-0xe0, value << 7 | note);
      if (this.output)
        this.output.send([channel, note, value]);
      return;
    }
    switch (channel) {
      case 0x90:
        this.setButton(note, value);
        break;
      case 0xe7:
        this.setFader(note, value);
        break;
      default:
        console.log(channel, note, value);
    }
  }
}
