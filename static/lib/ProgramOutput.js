import Framebuffer from '/lib/Framebuffer.js'
import ShaderProgram from '/lib/ShaderProgram.js'
import Context from '/lib/Context.js'

export default class ProgramOutput {
  constructor(ctx, autoTake) {
    this.ctx = ctx;
    this.autoTake = autoTake;
    this.fade = 1;
    this.el = document.createElement('div');
    this.layers = [];
    this.layerBufs = new WeakMap();
    const renderZone = document.createElement('div');
    renderZone.classList.add('renderZone');
    this.el.appendChild(renderZone);

    this.copyProgram = new ShaderProgram(ctx, '/shaders/default.vert', '/shaders/util/copy.frag');
    this.blackProgram = new ShaderProgram(ctx, '/shaders/default.vert', '/shaders/util/black.frag');
    this.fadeFb = new Framebuffer(ctx.canvas.gl);
    this.copyProgram.uniforms.buf = this.fadeFb.tex;

    ctx.show.addObserver(layers => {
      // setTimeout(() => {
        this.showChanged(layers);
      // }, 0);
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
    // console.log('show changed');
    if (this.layers.length) {
      this.pendingLayers = layers.slice();
      this.crossFade = 1;
      this.doTake = this.autoTake;
    } else {
      this.layers = layers;
    }
  }
  allocLayerBuf() {
    const gl = this.ctx.canvas.gl;
    const viewport = gl.getParameter(gl.VIEWPORT);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      viewport[2], viewport[3], 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null
    );
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return [tex, fb];
  }
  checkReady() {
    for (const layer of this.layers) {
      if (!layer.instance.checkReady())
        return false;
    }
    return true;
  }
  drawLayer(layer) {
    let buf = this.layerBufs.get(layer);
    if (!buf) {
      buf = new Framebuffer(this.ctx.canvas.gl);
      this.layerBufs.set(layer, buf);
    }
    const gl = this.ctx.canvas.gl;
    // gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // gl.clear(gl.COLOR_BUFFER_BIT);
    layer.draw();
    return;
    buf.drawInto(() => {
      layer.draw();
    });
    this.copyProgram.uniforms.buf = buf.tex;
    if (this.copyProgram.checkReady())
      this.copyProgram.draw();
  }
  draw() {
    const gl = this.ctx.canvas.gl;
    if (this.blackProgram.checkReady())
      this.blackProgram.draw();
    if (this.fade == 0)
      return;
    let pendingLayersReady = (() => {
      if (!this.doTake)
        return false;
      if (!this.pendingLayers)
        return false;
      for (const layer of this.pendingLayers) {
        if (!layer.instance.checkReady())
          return false;
      }
      return true;
    })();
    if (pendingLayersReady && this.crossFade <= 0) {
      this.layers = this.pendingLayers;
      this.pendingLayers = null;
    }
    for (const layer of this.layers) {
      if (layer.instance.checkReady())
        this.drawLayer(layer.instance);
    }
    if (!this.copyProgram.checkReady()) {
      if (this.copyProgram.error)
        console.error(this.copyProgram.error.infoLog);
      return;
    }
    for (const layer of this.layers) {
      if (!layer.instance.checkReady())
        continue;
      this.drawLayer(layer.instance);
    }
    if (this.pendingLayers && pendingLayersReady) {
      this.crossFade -= this.takeSpeed;
      this.fadeFb.drawInto(() => {
        for (const layer of this.pendingLayers)
          layer.instance.draw();
      });
      this.copyProgram.uniforms.buf = this.fadeFb.tex;
      if (this.copyProgram.checkReady()) {
        gl.blendColor(1, 1, 1, this.crossFade);
        gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.CONSTANT_ALPHA);
        this.copyProgram.draw();
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      }
      else if (this.copyProgram.error)
        console.error(this.copyProgram.error.infoLog);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      if (this.crossFade <= 0) {
        this.layers = this.pendingLayers;
        this.pendingLayers = null;
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

