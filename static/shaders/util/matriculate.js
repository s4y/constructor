const canvas = document.createElement('canvas');
const renderCtx = canvas.getContext('2d');

canvas.width = 4096;
canvas.height = 128;

const font = new FontFace('Matrix Code', 'url("/assets/matriculate/matrix code nfi.ttf")');


renderCtx.font = '100 64px Matrix Code';
renderCtx.fillStyle = 'white';

ctx.globalTextures.matrixCode = (() => {
  const { gl } = ctx.canvas;

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  font.load().then(font => {
    document.fonts.add(font);
    pos = 0;
    for (let c of "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()<>[]".split(""))
      renderCtx.fillText(c, pos += 64, canvas.height - 32);

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE,
      canvas.width, canvas.height, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, canvas
    );
  });


  return {
    get w() { return canvas.width; },
    get h() { return canvas.height; },
    tex,
    draw() {
      return true;
    }
  }
})();
ctx.uniformsChanged();


return () => {
}
