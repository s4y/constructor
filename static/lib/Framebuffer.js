export default class Framebuffer {
  constructor(gl) {
    this.gl = gl;
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
    const oldFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, oldFb);
    this.fb = fb;
    this.tex = tex;
    this.viewport = [0, 0, viewport[2], viewport[3]];
  }
  alloc() {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      this.viewport[2], this.viewport[3], 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null
    );
  }
  drawInto(f) {
    const { gl } = this;
    const oldViewport = gl.getParameter(gl.VIEWPORT);
    const oldFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    if (this.viewport[2] != oldViewport[2] || this.viewport[3] != oldViewport[3]) {
      this.viewport = [0, 0, oldViewport[2], oldViewport[3]];
      // Note: other textures are getting stomped here and I don't
      // know why. See the console during a window resize.
      this.alloc();
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(...this.viewport);
    f();
    gl.bindFramebuffer(gl.FRAMEBUFFER, oldFb);
    gl.viewport(...oldViewport);
  }
}

