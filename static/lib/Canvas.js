export default class Canvas {
  constructor(canvasEl, initFn, opts) {
    this.canvasEl = canvasEl;
    this.initFn = initFn;
    const glOpts = {
      // alpha: false,
      // antialias: false,
      // desynchronized: true,
      ...opts,
    };
    this.gl = canvasEl.getContext('webgl2', glOpts);
    this.webglVersion = '1';
    if (this.gl)
      this.webglVersion = '2';
    else
      this.gl = canvasEl.getContext('webgl', glOpts);

    this.s3tc = this.gl.getExtension('WEBGL_compressed_texture_s3tc');

    this.props = {};
    this.programs = [];
    this.reinit();
    this.heightOffset = 0;
    this.downscale = 1;
  }

  resize() {
    const canvasEl = this.canvasEl;
    canvasEl.width = canvasEl.clientWidth * devicePixelRatio / this.downscale;
    canvasEl.height = canvasEl.clientHeight * devicePixelRatio / this.downscale;
    this.viewport = [0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight - this.heightOffset];
    this.gl.viewport(...this.viewport);
  }

  reinit() {
    if (this.initFn)
      this.initFn(this.gl);
  }

  draw(f) {
    f(this.gl);
  }
}
