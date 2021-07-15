export default class Observers {
  constructor() {
    this.observers = {};
  }
  getObserverList(name) {
    return this.observers[name] || (this.observers[name] = []);
  }
  add(ctx, key, cb) {
    const observers = this.getObserverList(key);
    observers.push(cb);
    ctx.observe(() => {
      observers.splice(observers.indexOf(fn), 1);
    });
  }
  fire(key, ...args) {
    for (const cb of this.getObserverList(key))
      cb(...args);
  }
}
