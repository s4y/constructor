// reserve:hot_reload

export default class DMX {
  constructor() {
    this.params = {};
    this.state = new Uint8Array(1024);
    this.lastSentState = new Uint8Array(1024);

    // By defualt, echo.
    this.defaultOnMessage = dmx => {
      this.state.set(dmx);
      this.send();
    }
  }
  connect() {
    if (this.ws)
      this.ws.close();
    const ws = this.ws = new WebSocket('ws://127.0.0.1:8878');
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      this.open = true;
      this.sendParams();
      this.ws.send(this.state);
    };
    ws.onclose = () => {
      this.ws = null;
      this.open = false;
      setTimeout(() => this.connect(), 1000);
    };
    ws.onmessage = async e => {
      const buf = e.data;
      // (this.onmessage || this.defaultOnMessage)(new Uint8Array(buf.slice(1)));
    };
  }
  setBlend(blend) {
    if (blend == this.params.blend)
      return;
    this.params.blend = blend;
    this.sendParams();
  }
  sendParams() {
    if (!this.open)
      return;
    this.ws.send(JSON.stringify(this.params));
  }
  send() {
    if (!this.open)
      return;
    const isEqual = (() => {
      for (let i = 0; i < this.state.length; i++) {
        if (this.lastSentState[i] != this.state[i])
          return false;
      }
      return true;
    })();
    if (isEqual)
      return;
    this.ws.send(this.state);
    this.lastSentState.set(this.state);
  }
}
