class Latch {
  constructor(f) {
    this.f = f;
  }
  check() {
    const latched = this.f();
    const ret = latched && !this.latched;
    this.latched = latched;
    return ret;
  }
}

const rotX = angle => [
  [1, 0, 0, 0,],
  [0, Math.cos(angle), -Math.sin(angle), 0,],
  [0, Math.sin(angle), Math.cos(angle), 0,],
  [0, 0, 0, 1],
];

const rotY = angle => [
    [Math.cos(angle), 0, Math.sin(angle), 0],
    [0, 1, 0, 0],
    [-Math.sin(angle), 0, Math.cos(angle), 0],
    [0, 0, 0, 1],
];

const rotZ = angle => [
    [Math.cos(angle), -Math.sin(angle), 0, 0],
    [Math.sin(angle), Math.cos(angle), 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
];

const translate = (x, y, z) => [
    [1, 0, 0, x],
    [0, 1, 0, y],
    [0, 0, 1, z],
    [0, 0, 0, 1],
];

const perspectiveProj = (fov, aspect, near, far) => {
  const f = 1 / Math.tan(fov/2);
  return [
    [f / aspect, 0.0, 0.0, 0.0],
    [0.0, f, 0.0, 0.0],
    [0.0, 0.0, (far + near) / (far - near), 1.0],
    [0.0, 0.0, (2.0 * far * near) / (near - far), 1.],
  ];
}

const frustum = (l, r, b, t, n, f) => {
  const A = (r + l) / (r - l);
  const B = (t + b) / (t - b);
  const C = (f + n) / (f - n);
  const D = (2 * f * n) / (f - n);
  return [
    [(2 * n) / (r - l), 0, A, 0],
    [0, (2 * n) / (t - b), B, 0],
    [0, 0, C, D],
    [0, 0, -1, 0],
  ];
};

const transform = (p, t) => {
  let ret = math.multiply(p.concat([1]), t)
  return math.divide(ret, ret[ret.length-1]).slice(0, 3);
}


ctx.params.gHue ||= new ctx.Gradual(0);
ctx.params.gSat ||= new ctx.Gradual(0);
ctx.params.gVal ||= new ctx.Gradual(0);
ctx.params.chaos ||= new ctx.Gradual(0);
ctx.params.gRotX ||= 0;
ctx.params.gRotY ||= 0;
ctx.params.gRotZ ||= 0;
ctx.params.sndGo = 0;
ctx.params.sndVel ||= new ctx.Gradual(1, 0.0);
ctx.params.sT ||= 0;
ctx.params.vel ||= new ctx.Gradual(1, 0.99);
ctx.params.gTimeOfDay ||= new ctx.Gradual(1, 0.97);
ctx.params.beat = 0;
ctx.params.beatAmt = new ctx.Gradual(0);
ctx.params.beatVol = new ctx.Gradual(1, 0.9);

ctx.params.intensity = new ctx.Gradual(0, 0.99);
ctx.params.goVel = new ctx.Gradual(0);
ctx.params.go = 0;

ctx.midiByNonce ||= {}
ctx.uniforms.midiNotes ||= new Float32Array(32*4);
ctx.uniforms.beat = ctx.params.beat;
ctx.uniforms.proj_mat = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);
ctx.uniforms.inv_proj_mat = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);
ctx.uniforms.camera_mat = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);
ctx.uniforms.inv_camera_mat = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);
ctx.uniformsChanged();

ctx.params.lo = 0;
ctx.uniforms.lo = () => ctx.params.lo;

// Angel mike

ctx.params.angelPhase ||= new ctx.Gradual(0, 0.9);
ctx.params.phase1 = 0;

// / Angel mike

const velX = ctx.params.gVelX ||= new ctx.Gradual(0);
const velY = ctx.params.gVelY ||= new ctx.Gradual(0);
const velZ = ctx.params.gVelZ ||= new ctx.Gradual(0);
const velSnd = new ctx.Gradual(0);

let lastNow = null;

// ctx.textures.midiTex = 


const mix = (a, b, x) => a*(1-x)+b*x;

let then = 0;
let midiBeat = 0;
let lastClock = 0;

ctx.params.midiBeat = { valueOf() { return midiBeat } };

ctx.params.phaseUpLatch = new Latch(() => ctx.midi.button1);
ctx.params.phaseDownLatch = new Latch(() => ctx.midi.button2);

let lastDrewAt;
return () => {
  const now = ctx.now();
  if (now == lastDrewAt)
    return;
  lastDrewAt = now;

  let delta = (1/60) / (now - then);
  delta = Math.min(delta, 5);
  then = now;

  ctx.params.intensity.value = ctx.midi.knob7;
  ctx.params.goVel.value = ctx.midi.knob3;
  ctx.params.go += ctx.params.goVel * 1;

  if (ctx.params.phaseUpLatch.check())
    ctx.params.angelPhase.value = ctx.params.angelPhase.targetValue + 1;
  if (ctx.params.phaseDownLatch.check())
    ctx.params.angelPhase.value = ctx.params.angelPhase.targetValue - 1;
  ctx.params.angelPhase.step();

  ctx.params.phase1 = Math.max(0, Math.min(1, ctx.params.angelPhase.value));

  const bpm = ctx.knobs.knobs.bpm;
  if (bpm) {
    ctx.params.bpm = bpm;
    ctx.params.beat = (((ctx.clock.now() - ctx.knobs.knobs.downbeat) / 60000) * bpm) % 256;
  }
  ctx.uniforms.beat = ctx.params.beat;
  ctx.params.beatAmt = ctx.params.beat % 1;
  ctx.params.beatVol.value = ctx.midi.knob11;

  if (ctx.cursorTok)
    ctx.cursorTok.style.opacity = ctx.params.beat % 1;

  ctx.params.gHue.value = ctx.midi.knob0;
  ctx.params.gSat.value = ctx.midi.knob1;
  ctx.params.gVal.value = ctx.midi.knob2;
  ctx.params.chaos.value = ctx.midi.knob4;
  velX.value = ctx.midi.knob12;
  velY.value = ctx.midi.knob13;
  velZ.value = ctx.midi.knob14;
  velSnd.value += 0;

  midiBeat *= 0.99;
  const midiClock = Math.floor(ctx.midiClock.t / 4 / 2 / 3);
  if (midiClock != lastClock) {
    midiBeat = 1;
    lastClock = midiClock;
  }

  const newLo = Math.pow(ctx.medFFT.buf.slice(0, 10).reduce((a, b) => Math.max(a, b)) / 255, 2);
  ctx.params.thump *= 0.98;
  if (newLo - ctx.params.lo > 0.05)
    ctx.params.thump = 1;
  ctx.params.lo = newLo;

  ctx.params.sndVel.value = ctx.params.sndVel * 0.9 + 0.02 * Math.pow(ctx.fastFFT.buf[2] / 255, 5);
  ctx.params.sndGo += ctx.params.sndVel * 0.01;

  ctx.params.gRotX += velX.value * 0.05;
  ctx.params.gRotY += velY.value * 0.05;
  ctx.params.gRotZ += velZ.value * 0.05;

  // ctx.params.gTimeOfDay.value = ctx.midi.knob11;

  const camera_mat = math.multiply(...[
    translate(0, 0, 0),
    rotY(Math.sin(ctx.params.go / 100 * Math.PI * 2) * (1.5 * ctx.params.intensity)),
    rotX(Math.sin(ctx.params.go / 120 * Math.PI * 2) * (1.3 * ctx.params.intensity)),
    // rotZ(Math.sin(ctx.now()) * 0.5),
  ]);
  const proj_mat = math.multiply(
    perspectiveProj(Math.PI/5, ctx.viewport[2]/ctx.viewport[3], -0.0, 1),
    translate(0, 0, 0)
  )
  ctx.uniforms.camera_mat.set(math.flatten(camera_mat));
  ctx.uniforms.inv_camera_mat.set(math.flatten(math.inv(camera_mat)));
  ctx.uniforms.proj_mat.set(math.flatten(proj_mat));
  ctx.uniforms.inv_proj_mat.set(math.flatten(math.inv(proj_mat)));

  const currentNotes = {};
  for (const entry of ctx.midiNotes) {
    const [note, nonce] = entry;
    currentNotes[nonce] = note;
  }
  for (const nonce in currentNotes) {
    if (nonce in ctx.midiByNonce)
      ctx.midiByNonce[nonce][2] = mix(ctx.midiByNonce[nonce][2], currentNotes[nonce][2], .1);
    else
      ctx.midiByNonce[nonce] = [currentNotes[nonce][0], currentNotes[nonce][1], 0];
  }
  for (const nonce in ctx.midiByNonce) {
    if (nonce in currentNotes)
      continue;
    if (ctx.midiByNonce[nonce][2] > 0.01)
      ctx.midiByNonce[nonce][2] *= 0.8;
    else
      delete ctx.midiByNonce[nonce];
  }

  const keys = Object.keys(ctx.midiByNonce);
  keys.forEach((k, i) => {
    const [channel, note, val] = ctx.midiByNonce[k];
    ctx.uniforms.midiNotes[i*4+0] = (channel&0xf)/16;
    ctx.uniforms.midiNotes[i*4+1] = note/128;
    ctx.uniforms.midiNotes[i*4+2] = +val/128;
    ctx.uniforms.midiNotes[i*4+3] = (k%256);
  });
  ctx.uniforms.midiNotes.fill(0, keys.length*4, ctx.uniforms.midiNotes.length);
  // console.log(ctx.midiByNonce);
}
