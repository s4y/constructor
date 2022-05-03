const texture = ctx.globalTextures.snapshot = (() => {
  const { gl } = ctx.canvas;

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return {
    get w() { return ctx.globalTextures.webcam.w; },
    get h() { return ctx.globalTextures.webcam.h; },
    tex,
    draw() {
      if (!this.needDraw)
        return true;
      ctx.globalTextures.webcam.tex;
      this.needDraw = false;
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGB, gl.RGB,
        gl.UNSIGNED_BYTE, ctx.globalTextures.webcam.video
      );
      return true;
    }
  }
})();
ctx.uniformsChanged();

ctx.params.snapshotFlash = 1;

let lastBeat;
return () => {
  ctx.params.snapshotFlash *= 0.98;

  const curBeat = Math.floor(ctx.params.beat / 4);
  if (!isNaN(curBeat) && curBeat != lastBeat) {
    lastBeat = curBeat;
    ctx.params.snapshotFlash = 1;
    setTimeout(() => {
      texture.needDraw = true;
      console.log(ctx.params.beat);
    }, 200);
  }
};
