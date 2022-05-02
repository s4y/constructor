import ProgramOutput from '/lib/ProgramOutput.js'
import S4r from '/lib/S4r.js'
import Show from '/lib/Show.js'

class MultiCanvas {
  constructor(gl, canvas) {
    this.gl = gl;
    this.canvas = canvas;
    const scenes = [];
  }
  draw() {
    const { gl, canvas } = this;
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
      output.drawPreview ? output.drawPreview() : output.draw();
    if (output.error && !this.error)
      this.error = output.error
  }
}

export default class Live {
  constructor(ctx) {
    this.ctx = ctx;

    const el = this.el = document.createElement('div');
    // el.classList.add('desk');

    this.scenes = [];
    // this.programOutput = new ProgramOutput(ctx, true);
    // this.show = {};
    this.outputs = [];
    this.renderEls = [];
    // this.buildDOM();

    this.show = new Show(ctx);
    this.show.addObserver(scenes => this.showChanged(scenes));
  }
  showChanged(scenes) {
    this.scenes = scenes;
    // this.buildDOM();
  }
  buildDOM() {
    this.renderEls.length = 0;
    while (this.el.firstChild)
      this.el.removeChild(this.el.firstChild);
    this.outputs = Object.keys(this.scenes).map(k => new ProgramOutput({
      ...this.ctx,
      sceneTag: k,
    }, true));
    for (const output of this.outputs) {
      const el = document.createElement('div');
      const renderZone = document.createElement('div');
      renderZone.classList.add('renderZone');
      el.appendChild(renderZone);
      this.renderEls.push(renderZone);
      this.el.insertBefore(el, this.el.firstChild);
    }
  }
  uniformsChanged() {
    for (const output of this.outputs)
      output.uniformsChanged();
  }
  draw() {
    const canvas = this.ctx.canvas.canvasEl;
    const gl = this.ctx.canvas.gl;
    this.error = null;
    const previews = this.outputs;
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
      if (output.checkReady())
        output.drawPreview ? output.drawPreview() : output.draw();
      if (output.error && !this.error)
        this.error = output.error
    }
  }
}
