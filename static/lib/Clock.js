// reserve:hot_reload

export default class Clock {
  constructor() {
    this.pingInterval = setInterval(() => this.ping(), 1000 + Math.random() * 500);
    this.bestRtt = null;
    this.clockOffset = null;
    this.fixedOffset = 0;
    this.connect();
  }
  doPing(now) {
    this.ws.send(JSON.stringify({
      type: "ping",
      startTime: now,
    }));
    return new Promise(r => this.pendingPong = r);
  }
  connect() {
    if (this.ws)
      this.ws.close();
    this.ws = new WebSocket(`${location.protocol == 'https:' ? 'wss' : 'ws'}://${location.host}/.clock`)
    this.ws.onclose = () => {
      this.ws = null;
      clearInterval(this.pingInterval);
      setTimeout(() => this.connect(), 1000);
    }
    this.ws.onopen = () => {
      this.pingInterval = setInterval(() => this.ping(), 1000 + Math.random() * 500);
      this.ping();
    }
    this.ws.onmessage = e => {
      const message = JSON.parse(e.data);
      const { type } = message;
      if (type == 'pong') {
        this.pendingPong(message);
      }
    };
  }
  async ping() {
    const pong = await this.doPing(Date.now());
    // console.log(pong);
    const { startTime, serverTime } = pong;
    const now = Date.now();
    const rtt = now - startTime;
    const proposedOffset = now - serverTime;
    if (this.bestRtt == null || (rtt <= this.bestRtt && proposedOffset >= this.clockOffset)) {
      this.clockOffset = proposedOffset;
      this.bestRtt = rtt;
    }
    // console.log(`rtt: ${rtt.toFixed(2)} (best: ${this.bestRtt.toFixed(2)})`);
    // console.log(`offset: ${(now - serverTime).toFixed(2)} (best: ${this.clockOffset.toFixed(2)})`);
  }
  now() {
    let now = Date.now();
    if (this.clockOffset)
      now -= this.clockOffset - this.bestRtt / 2;
    return now + this.fixedOffset;
  }
}


