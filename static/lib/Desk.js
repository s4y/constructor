import XTouchController from '/lib/XTouchController.js'
import ProgramOutput from '/lib/ProgramOutput.js'

class Fader {
  constructor() {
    this.el = document.createElement('div');
    this.el.classList.add('fader');
    this.el.addEventListener('mousedown', e => {
      this.handleMouseEvent(e);
      const moveListener = e => this.handleMouseEvent(e);
      window.addEventListener('mousemove', moveListener);
      window.addEventListener('mouseup', e => {
        window.removeEventListener('mousemove', moveListener);
      }, { once: true });
    });
  }
  handleMouseEvent(e) {
    e.preventDefault();
    this.value = Math.max(0, Math.min(1,
      (this.el.offsetTop + this.el.offsetHeight - e.pageY) / this.el.offsetHeight));
  }
  get value() {
    return this.el.style.getPropertyValue('--value');
  }
  set value(value) {
    this.el.style.setProperty('--value', value);
    this.onchange(value);
  }
}

export default class Desk {
  constructor(ctx) {
    this.ctx = ctx;
    this.controller = new XTouchController();
    this.controller.addObserver((k, v) => this.handleControllerEvent(k, v));

    const el = this.el = document.createElement('div');
    el.classList.add('desk');

    this.programOutput = new ProgramOutput(ctx);
    this.outputs = [this.programOutput];
    this.pendingOutputs = [];
    this.renderEls = [];
    this.faders = [];
    this.buildDOM();

    ctx.show.addObserver(layers => this.showChanged(layers));
  }
  handleControllerEvent(k, v) {
    console.log(this.faders, k, v);
    if (this.faders[k])
      this.faders[k].value = v;
  }
  showChanged(layers) {
    this.outputs.length = 1;
    this.outputs.push(...layers.map(layer => layer.instance));
    this.buildDOM();
  }
  buildDOM() {
    this.renderEls.length = 0;
    this.faders.length = 0;
    while (this.el.firstChild)
      this.el.removeChild(this.el.firstChild);
    for (let i = 0; i < this.outputs.length; i++) {
      const ii = i;
      const prog = this.outputs[i];
      const el = document.createElement('div');
      if (prog == this.programOutput)
        el.classList.add('program');
      const renderZone = document.createElement('div');
      renderZone.classList.add('renderZone');
      el.appendChild(renderZone);
      const fader = new Fader();
      fader.onchange = v => {
        this.ctx.show.setFade(ii-1, v);
        this.controller.setFader(ii, v);
      };
      this.faders.push(fader);
      el.appendChild(fader.el);
      this.renderEls.push(renderZone);
      this.el.appendChild(el);
    }
  }
  draw() {
    const canvas = this.ctx.canvas.canvasEl;
    const gl = this.ctx.canvas.gl;
    this.error = null;
    for (let i = 0; i < this.outputs.length; i++) {
      const output = this.outputs[i];
      const el = this.renderEls[i];
      const rect = el.getBoundingClientRect();
      const widthMultiple = gl.drawingBufferWidth/canvas.clientWidth;
      const heightMultiple = gl.drawingBufferHeight/canvas.clientHeight;
      gl.viewport(
        rect.left * widthMultiple,
        gl.drawingBufferHeight - (rect.bottom) * heightMultiple,
        rect.width * widthMultiple,
        rect.height * heightMultiple);
      if (output.checkReady())
        output.draw();
      if (output.error && !this.error)
        this.error = output.error
    }
  }
}
