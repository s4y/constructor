const textCanvas = document.createElement('canvas');
const textCtx = textCanvas.getContext('2d');

const texture = ctx.globalTextures.editorText = (() => {
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
        gl.TEXTURE_2D, 0, gl.LUMINANCE,
        this.w, this.h, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, textCanvas
      );
      console.log('yee');
      return true;
    }
  }
})();
ctx.uniformsChanged();

const font = 'Helvetica';
const fontSize = 18;
let lastText = '';

textCtx.font =  `${fontSize}px ${font}`;

return () => { 
  if (!ctx.editorState)
    return; 
 
  if (ctx.editorState.text != lastText) {
    lastText = ctx.editorState.text;
    const lines = lastText.split('\n');
    let width = 0;
    for (const line of lines) {
      const measurements = textCtx.measureText(lastText);
      width = Math.max(width, Math.ceil(measurements.width));
    }
    const height = lines.length * fontSize;
    console.log(width, height);
    if (textCanvas.width != width)
      textCanvas.width = width;
    if (textCanvas.height != height)
      textCanvas.height = height;
    textCtx.fillStyle = 'white';
    for (let i = 0; i < lines.length; i++)
      textCtx.fillText(lines[i], 0, i * fontSize);
    texture.needDraw = true;
  } 
}
