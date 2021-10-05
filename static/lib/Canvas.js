export default class Canvas {
  constructor(canvasEl, initFn, opts) {
    this.canvasEl = canvasEl;
    this.initFn = initFn;
    const glOpts = {
      alpha: false,
      depth: false,
      antialias: false,
      ...opts,
    };
    this.gl = canvasEl.getContext('webgl2', glOpts);
    this.webglVersion = '1';
    if (this.gl)
      this.webglVersion = '2';
    else
      this.gl = canvasEl.getContext('webgl', glOpts);
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
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight - this.heightOffset);
  }

  reinit() {
    if (this.initFn)
      this.initFn(this.gl);
  }

  draw(f) {
    f(this.gl);
  }
}
