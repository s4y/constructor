const textCanvas = document.createElement('canvas');
const textCtx = textCanvas.getContext('2d');

const texture = (() => {
  const { gl } = ctx.canvas;

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return {
    get w() { return textCanvas.width; },
    get h() { return textCanvas.height; },
    tex,
    draw() {
      if (!this.needDraw)
        return true;
      this.needDraw = false;
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        this.w, this.h, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, textCanvas
      );
      return true;
    }
  }
})();
ctx.uniformsChanged();

const font = 'Helvetica';
const fontSize = 48;
let lastText = '';

return () => { 
  if (!ctx.editorState)
    return; 
  if (!ctx.editorState.text)
    return; 
  if (ctx.editorState.text != lastText) {
    lastText = ctx.editorState.text;
    const lines = lastText.split('\n');
    let width = 0;
    for (const line of lines) {
      const measurements = textCtx.measureText(lastText);
      width = Math.max(width, Math.ceil(measurements.width));
    }
    width = Math.min(1024, width);
    const height = Math.min(1024, lines.length * fontSize * 1.25);
    if (textCanvas.width != width)
      textCanvas.width = width;
    if (textCanvas.height != height)
      textCanvas.height = height;
    textCtx.clearRect(0, 0, width, height);
    textCtx.fillStyle = 'red';
    textCtx.font =  `${fontSize}px ${font}`;
    for (let i = 0; i < lines.length; i++)
      textCtx.fillText(lines[i], 0, i * (fontSize * 1.25) + fontSize);
    texture.needDraw = true;
    ctx.globalTextures.editorText = texture;
  } 
}
