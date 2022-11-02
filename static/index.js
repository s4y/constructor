// const astream = document.createElement('audio');
// astream.autoplay = true;
// 
// var hls = new Hls();
// hls.loadSource('/astream/audio.m3u8');
// hls.attachMedia(astream);
// // hls.on(Hls.Events.MANIFEST_PARSED,function() {
// //     astream.play();
// // });

const qs = location.search
  .substr(1)
  .split('&')
  .filter(v => v)
  .map(c => c.split('=').map(decodeURIComponent))
  .reduce((params, [k, v]) => (params[k] = v, params), {});

import Peer from '/lib/Peer.js'
import Canvas from '/lib/Canvas.js'
import Gradual from '/lib/Gradual.js'
import FPSView from '/lib/FPSView.js'
import Desk from './lib/Desk.js'
import Live from './lib/Live.js'
import ProgramOutput from './lib/ProgramOutput.js'
import Context from './lib/Context.js'
import Observers from './lib/Observers.js'
import RemoteCamera from './lib/RemoteCamera.js'
import ShaderProgram from './lib/ShaderProgram.js'
import Knobs from './lib/Knobs.js'
import WSConnection from './lib/WSConnection.js'

import * as THREE from '/deps/three/build/three.module.js'
import { GLTFLoader } from '/deps/three/examples/jsm/loaders/GLTFLoader.js'

const createStatsTracker = () => {
  return {
    fpsHistory: [],
    frames: null,
    startTime: null,
    recordDroppedFrame() {
      this.droppedFrame = true;
    },
    begin() {
      if (!this.startTime) {
        this.startTime = +new Date();
        this.frames = 0;
        setTimeout(() => {
          const delta = +new Date() - this.startTime;
          const fps = this.frames / (delta / 1000)
          this.recordFps(fps);
          reserve.broadcast({ type: 'perf', value: {
            program: 'program' in qs ? (qs.program || true) : '',
            fps: fps,
            downscale: canvas.downscale,
            drop: this.droppedFrame,
          } });
          this.droppedFrame = false;
          this.startTime = null;
        }, 500);
      }
      this.frames++;
    },
    end() {
    },
    recordFps(fps) {
      this.fpsHistory.push(fps);
      while (this.fpsHistory.length > 20)
        this.fpsHistory.shift();
      if (this.fpsHistory.length < 3)
        return;
      const sortedFps = this.fpsHistory.slice().sort();
      const middle = (sortedFps.length + 1) / 2;
      const median = sortedFps[Math.floor(middle)];
      if (median < 58) {
        this.onPerformanceNeeded();
        this.fpsHistory.length = 0;
      }
      if (median > 30 && this.fpsHistory.length > 19) {
        // this.onPerformanceGood();
        this.fpsHistory.length = 0;
      }
    },
  };
};
const stats = createStatsTracker();

const canvas = new Canvas(outputEl, null, {
  powerPreference: ('program' in qs || 'perf' in qs) ? 'high-performance' : 'low-power',
});
window.addEventListener('resize', () => canvas.resize());
canvas.resize();
document.body.onload = () => {
  canvas.resize();
};

stats.onPerformanceNeeded = () => {
  // return;
  if (canvas.downscale < 3) {
    canvas.downscale += 0.5;
    canvas.resize();
  }
};

stats.onPerformanceGood = () => {
  // return;
  if (canvas.downscale > 0.5) {
    canvas.downscale -= 0.25;
    canvas.resize();
  }
};

canvas.gl.enable(canvas.gl.BLEND);
canvas.gl.pixelStorei(canvas.gl.UNPACK_FLIP_Y_WEBGL, true);
canvas.gl.getExtension("OES_standard_derivatives");
canvas.gl.blendFunc(canvas.gl.ONE, canvas.gl.ONE_MINUS_SRC_ALPHA);

const showError = e => {
  errorZone.classList.toggle('visible', !!e);
  if (!e)
    return;
  errorSummary.textContent = `${e.message}:\n${e.infoLog}`;
  errorSource.textContent = '';
  if (!e.shaderSource)
    return;
  for (const line of e.shaderSource.split('\n')) {
    const lineEl = document.createElement('div');
    lineEl.textContent = line;
    errorSource.appendChild(lineEl);
  }
  const m = e.infoLog.match(/ERROR: 0:(\d+):/);
  if (m) {
    const interestingLine = errorSource.children[+m[1]-1];
    interestingLine.classList.add('interesting');
    interestingLine.scrollIntoView();
  }
}

const makeFilteredSampler = (type) => {
  const filter = ac.createBiquadFilter();
  const analyser = ac.createAnalyser();
  const buf = new Uint8Array(ac.sampleRate * (40/1000));
  let decayVal = 0;
  filter.type = type
  filter.frequency.value = 400;
  filter.Q.value = 0.5;

  mixer.connect(filter);
  filter.connect(analyser);
  return {
    get() {
      analyser.getByteTimeDomainData(buf);
      const ret = Math.pow(buf.reduce((acc, x) => Math.max(acc, Math.abs(x-128)), 0) / 128, 1);
      return ret;
      decayVal = Math.min(1, decayVal * 0.5 + ret);
      return decayVal;
    }
  };
}

const makeFFT = (smoothing, size, how) => {
  const { gl } = canvas;
  const analyser = ac.createAnalyser();
  if (size)
    analyser.fftSize = size;
  analyser.smoothingTimeConstant = smoothing;
  mixer.connect(analyser);
  const buf = new Uint8Array(Math.pow(2, Math.ceil(Math.log2(Math.floor(kMaxFrequency / ac.sampleRate * (analyser.fftSize / 2))))));
  let lastUpdate = null;

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, how);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, how);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const ensureCurrent = () => {
    const now = Date.now();
    if (lastUpdate == now)
      return;
    lastUpdate = now;
    analyser.getByteFrequencyData(buf);
    // for (let i = 0; i < buf.length; i++)
    //   buf[i] = ((buf[i]/255) * (buf[i]/255))*255;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE,
      buf.length, 1, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, buf
    );
  };

  return {
    analyser,
    get tex() {
      ensureCurrent();
      return tex;
    },
    get buf() {
      ensureCurrent();
      return buf;
    },
  }
};

const makeVideoTexture = cb => {
  const { gl } = canvas;
  const video = document.createElement('video');
  video.muted = true;
  video.crossOrigin = true;
  video.loop = true;

  let lastUpdate = null;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, canvas.gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, canvas.gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let haveFrame = false;

  const vfcb = () => {
    haveFrame = true;
    video.requestVideoFrameCallback(vfcb);
  }

  // vfcb();

  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.LUMINANCE,
    128, 128, 0,
    gl.LUMINANCE, gl.UNSIGNED_BYTE, null
  );

  const ensureCurrent = () => {
    const now = Date.now();
    if (lastUpdate == now)
      return;
    haveFrame = false;
    lastUpdate = now;
    if (!video.videoWidth || !video.videoHeight)
      return;
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGB, gl.RGB,
      gl.UNSIGNED_BYTE, video
    );
  };

  return {
    video,
    get w() { return video.videoWidth; },
    get h() { return video.videoHeight; },
    draw() {
      ensureCurrent();
    },
    get tex() {
      if (cb) {
        cb(video);
        cb = null;
      }
      return tex;
    },
    load(src) {
      video.src = src;
      video.load();
    },
  }
};

const ac = new (window.AudioContext || window.webkitAudioContext)();
const mixer = ac.createGain();
window.mixer = mixer;
const kMaxFrequency = 15000;
const fastFFT = makeFFT(0.0, 2048, canvas.gl.LINEAR);
const medFFT = makeFFT(0.87, 4096, canvas.gl.LINEAR);
const slowFFT = makeFFT(0.94, 8192, canvas.gl.LINEAR);

if (navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 48000,
      noiseSuppression: false,
      echoCancellation: false,
    }
  }).then(stream => {
    ac.createMediaStreamSource(stream).connect(mixer);
    navigator.mediaDevices.enumerateDevices().then(devices => {
      for (const device of devices) {
        if (device.kind != 'audioinput')
          continue;
      }
    });
  });
}

class ImagePool {
  constructor() {
    this.promises = {};
  }
  get(url) {
    return this.promises[url] || (this.promises[url] = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = true;
      img.onload = () => { resolve(img); };
      img.onerror = reject;
      img.src = url;
    }));
  }
}

const fps = +sessionStorage.fps || 60;
let tBase = sessionStorage.tBase || 0;
const imagePool = new ImagePool();
const imageTextures = {};
const ctx = {
  Gradual,
  knobs: new Knobs(!('program' in qs)),
  canvas, fastFFT, medFFT, slowFFT,
  _currentDownbeat: null,
  get downbeat() {
    const officialDownbeat = this.knobs.knobs.downbeat;
    if (!this._currentDownbeat)
       this._currentDownbeat = officialDownbeat;
    const diff = officialDownbeat - this._currentDownbeat;
    if (Math.abs(diff) > 1000)
      this._currentDownbeat = officialDownbeat;
    else
      this._currentDownbeat += diff * 0.1;
    this._currentDownbeat = officialDownbeat;
    return this._currentDownbeat;
  },
  get bpm() { return this.knobs.knobs.bpm; },
  get beat() {
    const { bpm, downbeat } = this;
    return (bpm && downbeat) ? (((this.clock.now() - downbeat) / 1000) * (bpm / 60)) : 0;
  },
  // get beatAmt() { return Math.pow(1-(this.beat%1), 2); },
  get beatAmt() { return this.beat%1; },
  viewportStack: [],
  get viewport() { return this.viewportStack[0] || canvas.viewport; },
  withViewport(viewport, f) {
    this.viewportStack.unshift(viewport);
    this.canvas.gl.viewport(...this.viewport);
    try {
      f();
    } finally {
      this.viewportStack.shift();
      this.canvas.gl.viewport(...this.viewport);
    }
  },
  getImage(path, w, h) {
    const { gl } = canvas;
    const tex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE,
      128, 128, 0,
      gl.LUMINANCE, gl.UNSIGNED_BYTE, null
    );

    imagePool.get(path).then(img => {
      if (w)
        img.width = w;
      if (h)
        img.height = w;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGB, gl.RGB,
        gl.UNSIGNED_BYTE, img
      );
    });

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, canvas.gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, canvas.gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;

  },
  midiNotes: [],
  midiClock: { t: 0 },
  params: {
  },
  uniforms: {
  },
  textures: {
    remoteCam: makeVideoTexture(async video => {
      const id = Math.random();

      const peer = new Peer({
        send(type, body) {
          console.log('do send', body);
          reserve.broadcast({ type: 'rtc', from: id, body });
        }
      }, 'remoteCam', null, false);
      peer.videoEl = video;
      video.muted = true;
      video.autoplay = true;
      video.controls = true;

      window.addEventListener('broadcast', e => {
        if (e.detail.type != 'rtc')
          return;
        const body = e.detail.body;
        console.log('maybe recv', body);
        if (body.to != id)
          return;
        console.log('do recv', body.body);
        peer.receiveFromPeer(body.body);
      });
    }),
    webcam: makeVideoTexture(async video => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // deviceId: qs.videoDeviceId,
          // aspectRatio: 16/9,
          // width: { max: 1920 },
          // height: { max: 1080 },
        }
      });
      window.stream = stream;
      reserve.broadcast(await navigator.mediaDevices.enumerateDevices());
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
    }),
    video1: makeVideoTexture(),
    screen: makeVideoTexture(),
  },
  events: new Observers(),
  _frameCount: 0,
  now() {
    let now = (this.clock.now()/1000 - tBase);
    const drop = Math.floor(now * 60 - window.ctx._frameCount);
    if (drop) {
      stats.recordDroppedFrame();
      window.ctx._frameCount = (now * 60);
    }
    const fNow = Math.floor(window.ctx._frameCount) / 60;
    return fNow % ((1 << 15) - (1 << 14));
  },
  midi: new Proxy({}, {
    get(obj, k) {
      return obj[k] || 0;
    }
  }),
  uniformsChanged() {
    renderer.uniformsChanged();
  },
  clock: {
    now() {
      return reserve.now() + this.fixedOffset;
    },
    fixedOffset: 0,
  },

};
window.ctx = ctx;

const incFrameCount = () => {
  ctx._frameCount += 60 / fps;
  requestAnimationFrame(incFrameCount);
}
incFrameCount();

if (sessionStorage.clockOffset)
  ctx.clock.fixedOffset = +sessionStorage.clockOffset;

ctx.copyProgram = new ShaderProgram(
  ctx,
  '/shaders/default.vert',
  '/shaders/util/copy.frag');
ctx.drawCopy = tex => {
  const { copyProgram } = ctx;
  if (!copyProgram.checkReady())
    return;
  const hadBuf = 'buf' in copyProgram.uniforms;
  copyProgram.uniforms.buf = tex;
  if (!hadBuf)
    copyProgram.uniformsChanged();
  copyProgram.draw();
};
ctx.lowpass = makeFilteredSampler('lowpass');
ctx.highpass = makeFilteredSampler('highpass');
ctx.bandpass = makeFilteredSampler('bandpass');
ctx.notch = makeFilteredSampler('notch');
ctx.showFile = '/show.js';
ctx.showTag = qs.program || 'default';

const renderer = (() => {
  if (document.getElementById('main')) {
    const renderer = new (('program' in qs) ? ProgramOutput : Desk)(ctx, false);
    if (renderer.bpmEl)
      controls.insertBefore(renderer.bpmEl, document.getElementById('fpsZone').nextElementSibling);
    if (renderer.el)
      main.appendChild(renderer.el);
    return renderer;
  } else if (document.getElementById('live')) {
    const renderer = new Live(ctx);
    if (renderer.el)
      live.appendChild(renderer.el);
    return renderer;
  }
})();
if ('program' in qs) {
  document.body.classList.add('program');
  document.body.addEventListener('click', e => {
    document.body.webkitRequestFullscreen();
  });
} else if (false) {
  for (const id of ['0', '1']) {
    const frame = document.createElement('iframe');
    frame.src = `/ledsign/?preview&id=${id}`;
    frame.style.display = 'block';
    frame.style.height = 'calc(100vw*7/120 + 4px)';
    frame.style.width = '100vw';
    frame.style.border = 'none';
    document.body.insertBefore(frame, document.body.firstChild);
  }
} else if (false) {
  const frame = document.createElement('iframe');
  frame.src = `/dmx/?preview`;
  frame.style.display = 'block';
  frame.style.height = 'calc(100vw*7/120 + 4px)';
  frame.style.width = '100vw';
  frame.style.border = 'none';
  document.body.insertBefore(frame, document.body.firstChild);
}

if ('dmx' in qs) {
  const frame = document.createElement('iframe');
  frame.src = `/dmx/`;
  frame.style.display = 'none';
  document.body.appendChild(frame);
    // frame.style.display = 'block';
    // frame.style.height = 'calc(100vw*7/120 + 4px)';
    // frame.style.width = '100vw';
    // frame.style.border = 'none';
}

// if ('program' in qs) {
// canvas.heightOffset = 266;
// }

canvas.gl.clearColor(0, 0, 0, 1);

let fade = 1;
let lastError = null;
const draw = () => {
  canvas.draw(gl => {
    canvas.gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    stats.begin();
    renderer.draw();
    stats.end();
    if (renderer.error != lastError) {
      lastError = renderer.error;
      showError(renderer.error);
    }
  });
};

const handleAnimationFrame = () => {
  draw();
  updateLEDs();
  requestAnimationFrame(handleAnimationFrame);
}
requestAnimationFrame(handleAnimationFrame);

// setInterval(handleAnimationFrame, 500);

// Don't reload the page when shaders change.
window.addEventListener('sourcechange', e => {
  const changedPath = new URL(e.detail, location).pathname;
  if (changedPath.startsWith('/shaders/'))
    e.preventDefault();
  if (changedPath.startsWith('/videos/'))
    e.preventDefault();
  if (changedPath.startsWith('/images/'))
    e.preventDefault();
});

window.addEventListener('keydown', e => {
  if (e.code == 'KeyF')
    document.body.webkitRequestFullscreen();
});

// window.addEventListener('scroll', e => {
//   canvas.canvasEl.offsetTop;
//   draw();
//   canvas.gl.finish();
// }, { passive: false, });

document.body.addEventListener('click', e => {
  ac.resume();
  // astream.play();
  // document.body.appendChild(astream);
});

// const node = ac.createMediaElementSource(astream);
// node.connect(mixer);
// 
// const gain = ac.createGain();
// node.connect(gain);
// gain.connect(ac.destination);
// slider.addEventListener('input', e => {
//   gain.gain.value = slider.valueAsNumber;
// });

const fpsViews = {};
const handleFPS = (id, fps, downscale) => {
  if (!(id in fpsViews)) {
    const fpsView = new FPSView();
    fpsView.title = id;
    fpsViews[id] = fpsView;
    document.getElementById('fpsZone').appendChild(fpsView.el);
  }
  const fpsView = fpsViews[id];
  fpsView.fps = fps;
  fpsView.downscale = downscale;
  fpsView.update();
}

let midiNonce = 0;
let editorEl = document.getElementById('editorPreview');

const cursorTok = document.createElement('span');
cursorTok.classList.add('cursorTok');

window.addEventListener('broadcast', e => {
  const { type, value } = e.detail;
  if (type == 'midi') {
    for (const k in value) {
      ctx.midi[k] = value[k];
      ctx.events.fire('midi', k, value[k]);
    }
  } else if (type == 'timeBase') {
    tBase = value;
    sessionStorage.tBase = value;
  } else if (type == 'event') {
    const { name, args } = value;
    ctx.events.fire(name, ...args);
  } else if (type == 'state') {
    ctx.state = value;
    ctx.events.fire('state');
  } else if (type == 'perf') {
    const id = value.program === true ? 'prog' : value.program;
    if (value.fps)
      handleFPS(id, value.fps, value.downscale);
    if (value.drop) {
      const view = fpsViews[id];
      if (id == 'prog' && view)
        view.didDrop();
    }
  } else if (type == 'midiChannel') {
    switch (value.type) {
      case 'noteOn':
        ctx.midiNotes.push([value.midi, midiNonce++]);
        break;
      case 'noteOff':
        for (let i = 0; i < ctx.midiNotes.length; i++) {
          if (ctx.midiNotes[i][0][1] == value.midi[1])
            ctx.midiNotes.splice(i--, 1);
        }
        break;
      case 'allOff':
        ctx.midiNotes.length = 0;
        break;
      case 'clock':
        ctx.midiClock.t++;
    }
  } else if (type == 'editor') {
    if (!ctx.editorState)
      ctx.editorState = {};
    Object.assign(ctx.editorState, value);
    if (!editorEl.style.display)
      editorEl.style.display = 'block';
    editorEl.textContent = ctx.editorState.text.substring(0, ctx.editorState.cursor-2);
    editorEl.appendChild(cursorTok);
    editorEl.appendChild(document.createTextNode(ctx.editorState.text.substring(ctx.editorState.cursor-2)));
    cursorTok.scrollIntoView({ block: 'center', behavior: 'auto' });
    ctx.cursorTok = cursorTok;
  }
});

const doResetTime = e => {
  e.preventDefault();
  reserve.broadcast({ type: 'timeBase', value: Date.now() / 1000 });
}

const doTake = e => {
  e.preventDefault();
  reserve.broadcast({ type: 'event', value: {
    name: 'take',
    args: [.25],
  }});
}

resetTime.addEventListener('touchstart', doResetTime);
resetTime.addEventListener('click', doResetTime);

take.addEventListener('touchstart', doTake);
take.addEventListener('click', doTake);

ctx.events.add(new Context(), 'midi', (k, v) => {
  if (k != 'kbutton15' || v != true)
    return;
  reserve.broadcast({ type: 'event', value: {
    name: 'take',
    args: [ctx.midi.knob15],
  }});
});

ctx.events.add(new Context(), 'video.load', (k, src) => {
  if (/\.m3u8$/.test(src)) {
    var hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(ctx.textures[k].video);
    return;
  }
  ctx.textures[k].load(src);
});

ctx.events.add(new Context(), 'video.seek', (k, time) => {
  ctx.textures[k].video.currentTime = time;
});

ctx.events.add(new Context(), 'video.play', (k) => {
  ctx.textures[k].video.play();
});

ctx.events.add(new Context(), 'video.pause', (k) => {
  ctx.textures[k].video.pause();
});

ctx.events.add(new Context(), 'video.unmute', (k) => {
  if ('program' in qs)
    ctx.textures[k].video.muted = false;
});

window.cmd = (name, ...args) => {
  reserve.broadcast({ type: 'event', value: {
    name, args,
  }});
};

const castScreen = async () => {
  const { video } = ctx.textures.screen;
  video.muted = true;
  ctx.textures.screen.video.srcObject = await navigator.mediaDevices.getDisplayMedia({
    cursor: 'never',
  });
  video.play();
}
window.castScreen = castScreen;

let laserConn;
let laserFn = null;
let laserReady = false;

window.setLaserFn = f => {
  if (!laserConn) {
    laserConn = new WSConnection('ws://127.0.0.1:8765/laser');
    laserConn.onmessage = e => {
      // console.log(e);
      // buf_free = JSON.parse(e.data).free
      laserReady = true;
      // do_laser_comms();
    };
    laserConn.connect();
  }
  laserFn = f;
};

let t = 0;

const do_laser_comms = () => {
  if (!laserReady)
    return;
  if (!laserFn)
    return;
  const scale = n => Math.min(1, Math.max(0, n)) * 0xfff;
  const q = laserFn();
  const ab = new Uint16Array(q.length * 5);
  for (let i = 0; i < q.length;i++) {
    const point = q[i];
    ab[(i*5)+0] = scale(point[0]/2+.5);
    ab[(i*5)+1] = scale(point[1]/2+.5);
    ab[(i*5)+2] = scale(point[2]);
    ab[(i*5)+3] = scale(point[3]);
    ab[(i*5)+4] = scale(point[4]);
  }
  laserConn.ws.send(ab);
  laserReady = false;
  return;
  // while (buf_free > 5000) {
    let now = t;//Date.now();
    // for (let i = 0; i < ab.length; i += 10) {
    //   const p = i/ab.length;
    //   const x = Math.floor((Math.sin(p * Math.PI * 2)*0.9/2+0.5 * (1 + Math.sin(p * Math.PI * 20 + now / 1000) * 0.0)) * 0xFFF);
    //   const y = Math.floor((Math.cos(p * Math.PI * 2)*0.9/2+0.5 * (1 + Math.cos(p * Math.PI * 20 + now / 1000) * 0.0)) * 0xFFF);
    //   ab[i+0] = x & 0xff;
    //   ab[i+1] = x >> 8;
    //   ab[i+2] = y & 0xff;
    //   ab[i+3] = y >> 8;
    //   ab[i+4] = 0xaf * Math.pow((Math.sin(now * 0.005 + p * 10 * Math.PI * 2)/2+.5), 1.);
    //   ab[i+5] = 0x0f;
    //   ab[i+6] = 0x00;
    //   ab[i+7] = 0x00;
    //   ab[i+8] = 0x2f * Math.pow((Math.sin(now * -0.005 + p * 10 * Math.PI * 2)/2+.5), 1.);
    //   ab[i+9] = 0x00;
    //   // buf_free -= 1;
    // }
    // console.log('yee', buf_free);
  // }
}

setInterval(do_laser_comms, 6 + 2/3);

let ws;
const connectWs = () => {
  if (ws)
    ws.close();
  ws = new WebSocket(`${location.protocol == 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onclose = e => {
    setTimeout(connectWs, 1000);
  };
  ws.onmessage = e => {
  };
}
connectWs();

const ledState = []

const ledConn = new WSConnection('ws://127.0.0.1:9390');
if ('nucLEDs' in qs)
  ledConn.connect();

const updateLEDs = () => {
  if (!ledConn.open)
    return;
  const bpm = ctx.knobs.knobs.bpm;
  const downbeat = ctx.knobs.knobs.downbeat;

  const beat = (bpm && downbeat) ? (((ctx.clock.now() - downbeat) / 1000) * (bpm / 60)) : 0;
  const beatAmt = Math.pow(1-(beat%1), 2);
  const tgt = [0, Math.floor(beatAmt*255), Math.floor(beatAmt*255)];
  for (let i = 0; i < tgt.length; i++) {
    if (ledState[i] === tgt[i])
      continue;
    ledState[i] = tgt[i];
    ledConn.ws.send(`set_indicator_value,2,0,${i+3},${tgt[i]}`);
  }
  // ledConn.ws.send(`set_indicator_value,2,0,3,${0}`);
  // ledConn.ws.send(`set_indicator_value,2,0,4,${Math.floor(beatAmt*255)}`);
  // ledConn.ws.send(`set_indicator_value,2,0,5,${Math.floor(beatAmt*255)}`);
};

if ('serviceWorker' in navigator) {
  if ('program' in qs) {
    navigator.serviceWorker.register("sw.js");
  } else {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => {
        for (const registration of registrations)
          registration.unregister()
      });
  }
}

if ('ledSign' in qs) {
  const ledFrame = document.createElement('iframe');
  ledFrame.src = '/ledsign/';
  ledFrame.style.display = 'none';
  document.body.appendChild(ledFrame);
}

if ('djLink' in qs) {
  const frame = document.createElement('iframe');
  frame.src = 'djlink.html';
  frame.style.display = 'none';
  document.body.appendChild(frame);
}

if ('viveTrackers' in qs) {
  const frame = document.createElement('iframe');
  frame.src = 'vivelink.html';
  frame.style.display = 'none';
  document.body.appendChild(frame);
}

if ('audiosend' in qs) {
  const frame = document.createElement('iframe');
  frame.src = 'audiosend.html';
  frame.style.display = 'none';
  document.body.appendChild(frame);
}

window.addEventListener('sourcechange', e => {
  if (e.detail.indexOf('/ledsign/') != -1)
    e.preventDefault();
  if (e.detail.indexOf('/dmx/') != -1)
    e.preventDefault();
});

document.body.classList.add('ready');

if ('pirateSesh' in qs)
  document.documentElement.classList.add('pirateSesh');

if ('spoopy' in qs)
  document.documentElement.classList.add('spoopy');

if ('theNet' in qs)
  document.documentElement.classList.add('theNet');

if ('shadeWall' in qs)
  document.documentElement.classList.add('shadeWall');

if ('h0l0' in qs)
  document.documentElement.classList.add('h0l0');
