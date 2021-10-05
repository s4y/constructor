export default class Gradual {
  constructor(value = null, ease = 0.95) {
    this.value = value;
    this.ease = ease;
    this.velocity = 0;
  }
  step() {
    this.velocity *= 0.90;
    const proposedChange =
      this.currentValue * this.ease
      + this.targetValue * (1-this.ease)
      - this.currentValue;
    this.velocity = this.velocity * this.ease + (1-this.ease) * proposedChange;
    this.currentValue += this.velocity;
  }
  set value(targetValue) {
    this.targetValue = targetValue;
    if (this.currentValue == null)
      this.currentValue = targetValue;
    else
      this.step();
  }
  get value() {
    return this.currentValue;
  }
  valueOf() {
    return this.value;
  }
}

