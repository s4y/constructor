class TextRenderer {
  constructor(gl) {
    const renderCanvas = document.createElement('canvas');
    this.gl = gl;
    renderCanvas.width = 1024;
    renderCanvas.height = 512;
    this.renderCanvas = renderCanvas;
    this.ctx = renderCanvas.getContext('2d');

    this.ctx.font = `bold ${this.fontSize}px sans-serif`;
    this.ctx.fillStyle = 'white';
  }
  render(text) {
    const { renderCanvas, ctx, lineHeight } = this;
    ctx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
    let yPosition = Math.max(0, renderCanvas.height/2 - lineHeight/2);
    yPosition += lineHeight;
    const width = ctx.measureText(text).width;
    ctx.fillText(text, renderCanvas.width/2-width/2, yPosition);
  }

  get fontSize() {
    return Math.ceil(this.renderCanvas.height / 5);
  }
  get lineHeight() {
    return this.fontSize * 1.25;
  }

  drawText(text, tex) {
    const { renderCanvas, gl } = this;
    if (!tex) {
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    this.render(text);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE,
      renderCanvas.width, renderCanvas.height, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, this.renderCanvas,
    );

    return tex;
  }
}

const nyeDate = 1641024000000;
ctx.params.nye_count_number = 999;

const textRenderer = new TextRenderer(ctx.canvas.gl);
ctx.uniforms.nye_2021 = textRenderer.drawText('2021');
ctx.uniforms.nye_2022 = textRenderer.drawText('2022');

let count_number = 999;
let drawn_count = null;

return () => {
  const left = (nyeDate - ctx.clock.now()) / 1000;
  count_number = Math.ceil(left);
  if (drawn_count != count_number) {
    // console.log(count_number);
    ctx.uniforms.nye_count = textRenderer.drawText(count_number, ctx.uniforms.nye_count);
    drawn_count = count_number;
  }
  ctx.params.nye_count_number = left;
};
