import BPMSampler from './BPMSampler.js'
import ProgramOutput from '/lib/ProgramOutput.js'
import S4r from '/lib/S4r.js'
import Show from '/lib/Show.js'
import XTouchController from '/lib/XTouchController.js'

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
    this.ctx = Object.create(ctx);
    this.bpmSampler = new BPMSampler();
    this.bpmSampler.onchange = (bpm, offset) => {
      this.ctx.knobs.set('bpm', bpm);
      this.ctx.knobs.set('downbeat', reserve.now());
      this.lastBeat = null;
      this.showBPM();
    };
    this.ctx.knobs.observe('bpm', bpm => {
      this.bpmSampler.softBpm = bpm;
      this.showBPM();
    });
    window.addEventListener('keydown', e => {
      if (e.shiftKey || e.metaKey || e.altKey)
        return;
      if (e.code == 'KeyR') {
        this.ctx.knobs.set('downbeat', reserve.now());
        this.ctx._currentDownbeat = null;
        this.lastBeat = null;
        e.preventDefault();
      }
    });
    this.bpmEl = document.createElement('div');
    this.bpmEl.classList.add('bpm');

    this.bpmDownButton = (() => {
      const el = document.createElement('button');
      el.textContent = '⬇';
      el.addEventListener('click', e => {
        e.preventDefault();
        this.ctx.knobs.set('bpm', this.ctx.knobs.knobs.bpm - 1);
        this.lastBeat = null;
        this.showBPM();
      });
      return el;
    })();
    this.bpmUpButton = (() => {
      const el = document.createElement('button');
      el.textContent = '⬆';
      el.addEventListener('click', e => {
        e.preventDefault();
        this.ctx.knobs.set('bpm', this.ctx.knobs.knobs.bpm + 1);
        this.showBPM();
      });
      return el;
    })();
    this.bpmTextNode = document.createTextNode('');
    this.bpmEl.appendChild(this.bpmDownButton);
    this.bpmEl.appendChild(this.bpmTextNode);
    this.bpmEl.appendChild(this.bpmUpButton);

    this.controller = new XTouchController();
    this.controller.addObserver((k, v) => this.handleControllerEvent(k, v));

    const el = this.el = document.createElement('div');
    el.classList.add('desk');

    this.programOutput = new ProgramOutput(this.ctx, true);
    this.layers = [];
    this.outputs = [this.programOutput];
    this.pendingOutputs = [];
    this.renderEls = [];
    this.faders = [];
    this.buildDOM();

    this.gridProgram = new S4r(this.ctx, [
      'shaders/s4y/common.s4r',
      'shaders/util/grid.s4r',
    ]);

    this.show = new Show(this.ctx);
    this.show.addObserver(layers => this.showChanged(layers[this.ctx.showTag].layers));
  }
  handleControllerEvent(k, v) {
    if (this.faders[k])
      this.faders[k].value = v;
  }
  showChanged(layers) {
    this.layers.length = 0;
    this.layers.push(...layers.map(layer => layer));
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
      this.renderEls.push(renderZone);
      this.el.insertBefore(el, this.el.firstChild);
    }
  }
  uniformsChanged() {
    for (const layer of [this.programOutput, ...this.layers])
      layer.uniformsChanged();
  }
  showBPM() {
    const bpm = this.ctx.bpm;
    const downbeat = this.ctx.downbeat;
    if (!bpm || !downbeat)
      return;

    const beat = this.ctx.beat;
    if (beat == this.lastBeat)
      return;
    this.bpmTextNode.nodeValue = Math.round(bpm * 100) / 100;
    this.bpmEl.classList.add('beat');
    this.bpmEl.style.transition = ``;
    this.bpmEl.offsetLeft;
    this.bpmEl.style.transition = `background linear ${60/bpm}s`;
    this.bpmEl.classList.remove('beat');
    this.lastBeat = beat;
  }
  draw() {
    this.showBPM();

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
      this.ctx.withViewport([
        rect.left * widthMultiple,
        gl.drawingBufferHeight - (rect.bottom) * heightMultiple,
        rect.width * widthMultiple,
        rect.height * heightMultiple], () => {
        if (output != this.programOutput && this.gridProgram.checkReady())
          this.gridProgram.draw();
        if (output.checkReady()) {
          output.drawPreview ? output.drawPreview() : output.draw();
        }
        if (output.error && !this.error)
          this.error = output.error;
      });
    }
  }
}
