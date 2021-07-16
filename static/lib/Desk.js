import XTouchController from '/lib/XTouchController.js'
import ProgramOutput from '/lib/ProgramOutput.js'
import S4r from '/lib/S4r.js'
import Show from '/lib/Show.js'

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

    this.programOutput = new ProgramOutput(ctx, true);
    this.layers = [];
    this.outputs = [this.programOutput];
    this.pendingOutputs = [];
    this.renderEls = [];
    this.faders = [];
    this.buildDOM();

    this.gridProgram = new S4r(ctx, [
      'shaders/s4y/common.s4r',
      'shaders/util/grid.s4r',
    ]);

    this.show = new Show(ctx);
    this.show.addObserver(layers => this.showChanged(layers));
  }
  handleControllerEvent(k, v) {
    if (this.faders[k])
      this.faders[k].value = v;
  }
  showChanged(layers) {
    this.layers.length = 0;
    this.layers.push(...layers.map(layer => layer.instance));
    this.buildDOM();
  }
  buildDOM() {
    this.renderEls.length = 0;
    this.faders.length = 0;
    while (this.el.firstChild)
      this.el.removeChild(this.el.firstChild);
    const previews = this.layers.concat(this.outputs);
    for (let i = 0; i < previews.length; i++) {
      const ii = i;
      const prog = previews[i];
      const el = document.createElement('div');
      if (prog == this.programOutput)
        el.classList.add('program');
      const renderZone = document.createElement('div');
      renderZone.classList.add('renderZone');
      el.appendChild(renderZone);
      const fader = new Fader();
      fader.onchange = v => {
        if (ii == 0)
          this.programOutput.fade = v;
        else
          this.show.setFade(ii-1, v);
        this.controller.bank;
        this.controller.banks[0].faders[ii] = v;
        this.controller.sendBank();
      };
      this.faders.push(fader);
      el.appendChild(fader.el);
      this.renderEls.push(renderZone);
      this.el.appendChild(el);
      fader.value = prog.fade;
    }
  }
  draw() {
    const canvas = this.ctx.canvas.canvasEl;
    const gl = this.ctx.canvas.gl;
    this.error = null;
    const previews = this.layers.concat(this.outputs);
    for (let i = 0; i < previews.length; i++) {
      const output = previews[i];
      const el = this.renderEls[i];
      const rect = el.getBoundingClientRect();
      const widthMultiple = gl.drawingBufferWidth/canvas.clientWidth;
      const heightMultiple = gl.drawingBufferHeight/canvas.clientHeight;
      gl.viewport(
        rect.left * widthMultiple,
        gl.drawingBufferHeight - (rect.bottom) * heightMultiple,
        rect.width * widthMultiple,
        rect.height * heightMultiple);
      if (output != this.programOutput && this.gridProgram.checkReady())
        this.gridProgram.draw();
      if (output.checkReady())
        output.draw();
      if (output.error && !this.error)
        this.error = output.error
    }
  }
}
