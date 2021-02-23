export default class Canvas {
  constructor(canvasEl, initFn) {
    this.canvasEl = canvasEl;
    this.initFn = initFn;
    const glOpts = {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance'
    };
    // this.gl = canvasEl.getContext('webgl2', glOpts);
    this.webglVersion = '1';
    if (this.gl)
      this.webglVersion = '2';
    else
      this.gl = canvasEl.getContext('webgl', glOpts);
    this.props = {};
    this.programs = [];
    this.reinit();
    this.heightOffset = 0;
  }

  resize() {
    const canvasEl = this.canvasEl;
    canvasEl.width = canvasEl.clientWidth * devicePixelRatio;
    canvasEl.height = canvasEl.clientHeight * devicePixelRatio;
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
