import ShaderProgram from '/lib/ShaderProgram.js'
import S4r from '/lib/S4r.js'

export default class Program {
  constructor(canvas, uniforms) {
    this.canvas = canvas;
    this.uniforms = uniforms;
    this.programs = [
      new S4r(canvas.gl, [
        'shaders/s4y/common.s4r',
        'shaders/s4y/flower.s4r',
      ], {
        get freqTex() {
          return uniforms.u_freq();
        },
        get t() {
          return (Date.now()/1000) % (1 << 15) - (1 << 14);
        },
      }),
      new S4r(canvas.gl, [
        'shaders/s4y/common.s4r',
        'shaders/s4y/redSlice.s4r',
      ], {
        get freqTex() {
          return uniforms.u_freq();
        },
        get t() {
          return (Date.now()/1000) % (1 << 15) - (1 << 14);
        },
      }),
      (() => {
        const program = new ShaderProgram(
          canvas.gl,
          '/shaders/default.vert',
          '/shaders/s4y/01.frag');
        program.uniforms = uniforms;
        return program;
      })(),
    ];
  }
  draw() {
    const canvas = this.canvas.canvasEl;
    const gl = this.canvas.gl;
    for (const program of this.programs) {
      if (program.checkReady())
        program.draw();
    }
  }
}
