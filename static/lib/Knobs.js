const storageKey = 'constructor.knobs';

export default class Knobs {
  constructor(isSource) {
    this.knobs = {};
    this.observers = {};
    try {
      this.knobs = JSON.parse(localStorage[storageKey]);
    } catch (e) {}
    if (isSource) {
      for (const k in this.knobs)
        this.broadcast(k, this.knobs[k]);
    }
    window.addEventListener('broadcast', e => {
      if (e.detail.type != 'knob')
        return;
      const { name, value } = e.detail.value;
      this.knobs[name] = value;
      this.broadcastLocal(name, value);
      this.setNeedsSave();
    });
  }
  observe(knob, cb) {
    (this.observers[knob] ||= []).push(cb);
  }
  setNeedsSave() {
    if (this.needsSave)
      return;
    this.needsSave = true;
    setTimeout(() => this.save(), 100);
  }
  save() {
    this.needsSave = false;
    localStorage[storageKey] = JSON.stringify(this.knobs);
  }
  broadcast(name, value) {
    reserve.broadcast({
      type: 'knob',
      value: { name, value }
    });
  }
  broadcastLocal(name, value) {
    for (const observer of this.observers[name] || []) {
      observer(value);
    }
  }
  set(k, v) {
    if (this.knobs[k] == v)
      return;
    this.knobs[k] = v;
    this.broadcast(k, v);
    this.broadcastLocal(k, v);
    this.setNeedsSave();
  }
}
