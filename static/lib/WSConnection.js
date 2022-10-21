export default class WSConnection {
  constructor(url) {
    this.url = url;
  }

  connect() {
    if (this.ws)
      this.ws.close();
    this.ws = new WebSocket(this.url);
    this.ws.onclose = e => {
      this.open = false;
      setTimeout(() => this.connect(), 1000);
    };
    this.ws.onopen = e => {
      this.open = true;
    };
    this.ws.onmessage = e => {
      this.onmessage(JSON.parse(e.data));
    };
  }
}

