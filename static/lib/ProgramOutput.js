import Framebuffer from '/lib/Framebuffer.js'
import ShaderProgram from '/lib/ShaderProgram.js'
import Context from '/lib/Context.js'
import Show from '/lib/Show.js'

export default class ProgramOutput {
  constructor(ctx, autoTake) {
    this.ctx = ctx;
    this.autoTake = autoTake;
    this.fade = 1;
    this.takeSpeed = 1;
    this.el = document.createElement('div');
    this.layers = [];
    const renderZone = document.createElement('div');
    renderZone.classList.add('renderZone');
    this.el.appendChild(renderZone);

    this.blackProgram = new ShaderProgram(ctx, '/shaders/default.vert', '/shaders/util/black.frag');
    this.fadeFb = new Framebuffer(ctx);

    this.show = new Show(ctx);

    let changedLayers = null;
    this.show.addObserver(scenes => {
      let layers = scenes[ctx.showTag || 'default'].layers;
      if (changedLayers) {
        changedLayers = layers;
        return;
      }
      changedLayers = layers;
      setTimeout(() => {
        this.showChanged(changedLayers);
        changedLayers = null;
      }, 50);
    });

    ctx.events.add(new Context(), 'take', speed => {
      this.doTake = true;
      if (speed == null)
        this.takeSpeed = 0.04;
      else if (speed == 0)
        this.takeSpeed = 1;
      else
        this.takeSpeed = 1/(10*60*speed);
    });
  }
  showChanged(layers) {
    if (false && this.pendingLayers && this.crossFade != 1) {
      this.nextPendingLayers = layers.slice();
    } else if (this.layers.length) {
      this.pendingLayers = layers.slice();
      this.crossFade = 1;
      this.doTake = this.autoTake;
    } else {
      this.layers = layers;
    }
  }
  checkReady() {
    if (!this.layers)
      return false;
    if (!this.layers.length)
      return false;
    for (const layer of this.layers) {
      if (!layer.checkReady())
        return false;
    }
    return true;
  }
  uniformsChanged() {
    for (const layer of this.layers)
      layer.uniformsChanged();
    if (this.pendingLayers)
      for (const layer of this.pendingLayers)
        layer.uniformsChanged();
  }
  draw() {
    const gl = this.ctx.canvas.gl;
    // if (this.blackProgram.checkReady())
    //   this.blackProgram.draw();
    if (this.fade == 0)
      return;
    let pendingLayersReady = (() => {
      if (!this.doTake)
        return false;
      if (!this.pendingLayers)
        return false;
      for (const layer of this.pendingLayers) {
        if (!layer.checkReady())
          return false;
      }
      return true;
    })();
    if (pendingLayersReady && this.crossFade <= 0) {
      this.layers = this.pendingLayers;
      this.pendingLayers = null
      const next = this.nextPendingLayers;
      this.nextPendingLayers = null;
      if (next)
        this.showChanged(next);
    }
    if (!this.layers.length)
      return;
    const lastLayer = this.layers[this.layers.length-1];
    if (lastLayer.checkReady())
      lastLayer.drawRecursive();
    if (this.pendingLayers && pendingLayersReady) {
      this.crossFade -= this.takeSpeed;
      this.fadeFb.drawInto(() => {
        this.pendingLayers[this.pendingLayers.length-1].drawRecursive();
      });
      gl.blendColor(1, 1, 1, this.crossFade);
      gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.CONSTANT_ALPHA);
      this.ctx.drawCopy(this.fadeFb.tex);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      if (this.crossFade <= 0) {
        this.layers = this.pendingLayers;
        const next = this.nextPendingLayers;
        this.pendingLayers = null
        this.nextPendingLayers = null;
        if (next)
          this.showChanged(next);
      }
    }
    if (this.fade < 1) {
      gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.CONSTANT_ALPHA);
      gl.blendColor(1, 1, 1, this.fade);
      if (this.blackProgram.checkReady())
        this.blackProgram.draw();
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
  }
}

