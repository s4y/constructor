export default class Framebuffer {
  constructor(ctx) {
    // if (Framebuffer.reusePool.length) {
    //   const fb = Framebuffer.reusePool.pop();
    //   fb.ctx = ctx;
    //   return fb;
    // }
    this.ctx = ctx;
    const { gl } = this.ctx.canvas;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const depthTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fb = fb;
    this.tex = tex;
    this.depthTex = depthTex;

    this.dims = null;
    this.alloc();
  }
  get viewport() {
    if (this._dims)
      return [0, 0, ...this._dims];
    else
      return [0, 0, this.ctx.viewport[2], this.ctx.viewport[3]];
  }
  get dims() {
    return this.viewport.slice(2);
  }
  set dims(dims) {
    this._dims = dims;
  }
  alloc() {
    const { gl } = this.ctx.canvas;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      this.viewport[2], this.viewport[3], 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null
    );
    gl.bindTexture(gl.TEXTURE_2D, this.depthTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16,
      this.viewport[2], this.viewport[3], 0,
      gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null
    );
  }
  activate(source) {
    const { gl } = this.ctx.canvas;
    gl.bindFramebuffer(gl.FRAMEBUFFER, source ? source.fb : null);
    // gl.viewport(...(source ? source.viewport : this.ctx.viewport));
  }
  drawInto(f) {
    const { gl } = this.ctx.canvas;
    const lastFb = Framebuffer.stack[0];
    Framebuffer.stack.unshift(this);
    const viewport = this.viewport;
    if (!this.lastViewport || viewport[2] != this.lastViewport[2] || viewport[3] != this.lastViewport[3]) {
      // Note: other textures are getting stomped here and I don't
      // know why. See the console during a window resize.
      console.log('realloc');
      this.alloc();
    }
    this.lastViewport = viewport;
    this.activate(this);
    ctx.withViewport(this.viewport, () => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      f();
    });
    Framebuffer.stack.shift();
    this.activate(lastFb);
  }
}

Framebuffer.stack = [];
// Framebuffer.reusePool = [];

// Framebuffer.reuse = framebuffer => {
//   Framebuffer.reusePool.push(framebuffer);
// };
