export default class BPMSampler {
  constructor() {
    window.addEventListener('keydown', e => this.handleKeydown(e));
    this.tapTimes = [];
  }

  handleKeydown(e) {
    if (e.code == 'KeyT') {
      this.lastTap = reserve.now() / 1000;
      if (this.lastTap - this.tapTimes[this.tapTimes.length-1] > 2)
        this.tapTimes.length = 0;
      this.tapTimes.push(this.lastTap);
      if (this.tapTimes.length > 7)
        this.tapTimes.shift();
      // if (this.tapTimes.length < 4)
      //   return;
      // const bpms = this.tapTimes.slice(1).map((x, i) => 60 / (x - this.tapTimes[i])).sort();
      // console.log(bpms);
      // this.softBpm = Math.round(bpms[1]);
      this.softBpm = Math.round(60 / ((this.tapTimes[this.tapTimes.length-1] - this.tapTimes[0]) / (this.tapTimes.length - 1)));

      // console.log('BPM', this.softBpm, this.hardBpm, this.beatOffset);
    } else {
      return;
    }
    e.preventDefault();
    this.onchange && this.onchange(this.bpm, this.beatOffset);
  }

  get bpm() {
    return this.hardBpm || this.softBpm;
  }

  set bpm(bpm) {
    this.hardBpm = bpm;
  }

  get beatOffset() {
    return (this.lastTap / 60 * this.bpm) % 1;
  }
}
