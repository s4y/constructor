import ShaderProgram from '/lib/ShaderProgram.js'

export default class ProgramOutput {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.createElement('div');
    this.layers = [];
    this.layerBufs = new WeakMap();
    const renderZone = document.createElement('div');
    renderZone.classList.add('renderZone');
    this.el.appendChild(renderZone);

    this.copyProgram = new ShaderProgram({
      ...ctx,
      state: { fade: 1 },
    }, '/shaders/default.vert', '/shaders/util/copy.frag');

    ctx.show.addObserver(layers => {
      // setTimeout(() => {
        this.showChanged(layers);
      // }, 0);
    });
  }
  showChanged(layers) {
    // console.log('show changed');
    if (this.layers.length) {
      this.pendingLayers = layers.slice();
      this.fade = 1;
      this.allocFadeBuf();
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
  allocFadeBuf() {
    const gl = this.ctx.canvas.gl;
    const viewport = gl.getParameter(gl.VIEWPORT);
    this.fadeTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fadeTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      viewport[2], viewport[3], 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null
    );
    this.fadeFb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fadeFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fadeTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.copyProgram.uniforms.buf = this.fadeTex;
    this.copyProgram.buildUniforms();
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
      buf = this.allocLayerBuf();
      this.layerBufs.set(layer, buf);
    }
    const [tex, fb] = buf;
    const gl = this.ctx.canvas.gl;
    // gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // gl.clear(gl.COLOR_BUFFER_BIT);
    layer.draw();
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  draw() {
    const gl = this.ctx.canvas.gl;
    let pendingLayersReady = (() => {
      if (!this.pendingLayers)
        return false;
      for (const layer of this.pendingLayers) {
        if (!layer.instance.checkReady())
          return false;
      }
      return true;
    })();
    if (pendingLayersReady && this.fade <= 0) {
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
      // this.copyProgram.uniforms.buf = this.layerBufs.get(layer.instance)[0];
      // this.copyProgram.uniforms.u_fade = 1.;
      // this.copyProgram.draw();
    }
    if (this.pendingLayers && pendingLayersReady) {
      this.fade -= 0.01;
      const oldViewport = gl.getParameter(gl.VIEWPORT);
      gl.viewport(0, 0, oldViewport[2], oldViewport[3]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fadeFb);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.fade -= 0.01;
      for (const layer of this.pendingLayers)
        layer.instance.draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(...oldViewport);
      gl.blendColor(1, 1, 1, this.fade);
      gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.CONSTANT_ALPHA);
      if (this.copyProgram.checkReady())
        this.copyProgram.draw();
      else if (this.copyProgram.error)
        console.error(this.copyProgram.error.infoLog);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      if (this.fade <= 0) {
        this.layers = this.pendingLayers;
        this.pendingLayers = null;
      }
    }
  }
}

