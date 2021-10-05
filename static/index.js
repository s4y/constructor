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

import Canvas from '/lib/Canvas.js'
import Desk from './lib/Desk.js'
import ProgramOutput from './lib/ProgramOutput.js'
import Context from './lib/Context.js'
import Observers from './lib/Observers.js'

const createStatsTracker = () => {
  return {
    fpsHistory: [],
    frames: null,
    startTime: null,
    begin() {
      if (!this.startTime) {
        this.startTime = +new Date();
        this.frames = 0;
        setTimeout(() => {
          const delta = +new Date() - this.startTime;
          const fps = this.frames / (delta / 1000)
          this.recordFps(fps);
          if ('program' in qs) {
            reserve.broadcast({ type: 'perf', value: {
              program: qs.program || true,
              fps: fps,
              downscale: canvas.downscale,
            } });
          }
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
      console.log('fps', median, canvas.downscale);
      if (median < 56) {
        this.onPerformanceNeeded();
        this.fpsHistory.length = 0;
      }
      if (median > 58 && this.fpsHistory.length > 19) {
        this.onPerformanceGood();
        this.fpsHistory.length = 0;
      }
    },
  };
};
const stats = createStatsTracker();

const canvas = new Canvas(outputEl);
window.addEventListener('resize', () => canvas.resize());
canvas.resize();
document.body.onload = () => {
  canvas.resize();
};

stats.onPerformanceNeeded = () => {
  if (canvas.downscale < 3)
    canvas.downscale += 0.5;
  canvas.resize();
};

stats.onPerformanceGood = () => {
  if (canvas.downscale > 1)
    canvas.downscale -= 0.5;
  canvas.resize();
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

const makeVideoTexture = () => {
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

  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.LUMINANCE,
    128, 128, 0,
    gl.LUMINANCE, gl.UNSIGNED_BYTE, null
  );

  const ensureCurrent = () => {
    const now = Date.now();
    if (lastUpdate == now)
      return;
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
const kMaxFrequency = 15000;
const fastFFT = makeFFT(0.0, 4096, canvas.gl.NEAREST);
const medFFT = makeFFT(0.7, 4096, canvas.gl.LINEAR);
const slowFFT = makeFFT(0.94, 8192, canvas.gl.LINEAR);

if (navigator.mediaDevices) {
  navigator.mediaDevices.getUserMedia({
    audio: {
      noiseSuppression: false,
      echoCancellation: false,
    }
  }).then(stream => {
    ac.createMediaStreamSource(stream).connect(mixer);
  });
}

let tBase = sessionStorage.tBase || 0;
const ctx = {
  canvas, fastFFT, medFFT, slowFFT,
  textures: {
    video1: makeVideoTexture(),
  },
  events: new Observers(),
  now: () => (Date.now()/1000 - tBase) % ((1 << 15) - (1 << 14)),
  midi: new Proxy({}, {
    get(obj, k) {
      return obj[k] || 0;
    }
  }),
};
ctx.lowpass = makeFilteredSampler('lowpass');
ctx.highpass = makeFilteredSampler('highpass');
ctx.bandpass = makeFilteredSampler('bandpass');
ctx.notch = makeFilteredSampler('notch');
ctx.showFile = '/show.js';
ctx.showTag = qs.program || 'default';

const renderer = new (('program' in qs) ? ProgramOutput : Desk)(ctx);
if (renderer.el)
  main.appendChild(renderer.el);

if ('program' in qs) {
  document.body.classList.add('program');
  document.body.addEventListener('click', e => {
    document.body.webkitRequestFullscreen();
  });
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
    gl.clear(gl.COLOR_BUFFER_BIT);
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
  requestAnimationFrame(handleAnimationFrame);
}
requestAnimationFrame(handleAnimationFrame);

// Don't reload the page when shaders change.
window.addEventListener('sourcechange', e => {
  const changedPath = new URL(e.detail, location).pathname;
  if (changedPath.startsWith('/shaders/'))
    e.preventDefault();
  if (changedPath.startsWith('/videos/'))
    e.preventDefault();
});

window.addEventListener('keydown', e => {
  if (e.code == 'KeyF')
    document.body.requestFullscreen();
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
  }
});

resetTime.addEventListener('click', e => {
  reserve.broadcast({ type: 'timeBase', value: Date.now() / 1000 });
});

take.addEventListener('click', e => {
  reserve.broadcast({ type: 'event', value: {
    name: 'take',
    args: [],
  }});
});

take.addEventListener('click', e => {
  reserve.broadcast({ type: 'event', value: {
    name: 'take',
    args: [0.2],
  }});
});

ctx.events.add(new Context(), 'midi', (k, v) => {
  if (k != 'note15' || v != true)
    return;
  reserve.broadcast({ type: 'event', value: {
    name: 'take',
    args: [ctx.midi.knob15],
  }});
});

ctx.events.add(new Context(), 'video.load', (k, src) => {
  ctx.textures[k].load('/videos/' + src);
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
