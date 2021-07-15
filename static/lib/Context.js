export default class Context {
  constructor() {
    this.observers = new Set();
  }
  observe(fn) {
    if (this.observers)
      this.observers.add(fn);
    else
      fn();
  }
  unobserve() {
    if (this.observers)
      this.observers.delete(fn);
  }
  cancel() {
    for (const fn of this.observers)
      fn();
    this.observers = null;
  }
}
