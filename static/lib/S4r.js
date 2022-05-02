import * as THREE from '/deps/three/build/three.module.js'
import { GLTFLoader } from '/deps/three/examples/jsm/loaders/GLTFLoader.js'
import Framebuffer from './Framebuffer.js'

const meshCache = {};
const shaderCache = {};

// import HotFile from '/lib/HotFile.js'

const createFBPair = (ctx, copyFrom) => {
  const fbs = [new Framebuffer(ctx), new Framebuffer(ctx)];
  let copyCnt = copyFrom ? fbs.length : 0;
  return {
    get w() { return fbs[0].viewport[2] },
    get h() { return fbs[0].viewport[3] }, 
    get tex() {
      return copyFrom ? copyFrom.tex : fbs[0].tex;
    },
    drawInto(f) {
      fbs.reverse();
      fbs[0].drawInto(f);
      if (copyFrom && !--copyCnt)
        copyFrom = null;
    },
    discard() {
      for (const fb of fbs)
        Framebuffer.discard(fb);
    }
  };
};

const glTypeFromBinaryOperationOnTypes = (l, r) => {
  const lBase = l.replace(/\d/, '');
  const rBase = r.replace(/\d/, '');
  switch (lBase) {
    case 'float':
      switch (rBase) {
        case 'float':
          return l;
        case 'vec':
        case 'mat':
          return r;
      }
      break;
    case 'vec':
      return l;
    case 'mat':
      switch (rBase) {
        case 'float':
          return l;
        case 'vec':
          return r;
        case 'mat':
          if (l == r)
            return l;
          break;
      }
      break;
  }
  throw new Error(`Unknown type pair for binary op: ${l}, ${r}`);
}

const wrapVertShader = (body, defs) => `#version 300 es
    in vec4 p_in;
    in vec3 norm_in;
    out vec3 p;
    out vec3 norm;

    const float PI = asin(1.0) * 2.;



    ${defs}

    void main() {
      p = p_in.xyz/p_in.w;
      norm = norm_in;
      ${body};
    }`;

const wrapFragShader = (body, defs) => `#version 300 es

precision highp float;

in vec3 p;
in vec3 norm;
out vec4 fragColor;

#define gl_FragColor fragColor

const float PI = asin(1.0) * 2.;

float easeInOutQuad(float t) {
  return t<.5 ? 2.*t*t : -1.+(4.-2.*t)*t;
}

// https://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

mat4 perspectiveProj(float fov, float aspect, float near, float far) {
  float f = 1.0 / tan(fov/2.0);
  return mat4(
    f / aspect, 0.0, 0.0, 0.0,
    0.0, f, 0.0, 0.0,
    0.0, 0.0, (far + near) / (far - near), 1.0,
    0.0, 0.0, (2.0 * far * near) / (near - far), 0.0
  );
}

// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdBoundingBox( vec3 p, vec3 b, float e )
{
       p = abs(p  )-b;
  vec3 q = abs(p+e)-e;
  return min(min(
      length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
      length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
      length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
}

    // inv_proj_mat = inverse(perspectiveProj(
    //   PI/2.0, aspect, 0.1, 10.0
    // ));

${defs || ""}

#define texture2D texture

float sf(float at) {
  return texture2D(u_freq, vec2(at*at, 0)).x;
}

float ssf(float at) {
  return texture2D(u_smooth_freq, vec2(at*at, 0)).x;
}

float fsf(float at) {
  return texture2D(u_fast_freq, vec2(at*at, 0)).x;
}

void main() {
${body}
}
`;

// ta.value = localStorage.prog || defaultProgram;

const draw = t => {
  for (const task of runtimeTasks)
    task();
}

const compileShader = (gl, type,  s) => {
  const cache = shaderCache[type] || (shaderCache[type] = {});
  if (cache[s])
    return cache[s];
  const fs = gl.createShader(type);
  gl.shaderSource(fs, s);
  gl.compileShader(fs);
  cache[s] = fs;
  return fs;
  if (gl.getShaderParameter(fs, gl.COMPILE_STATUS))
    return fs;
  console.log(s);
  console.log(gl.getShaderInfoLog(fs));
}

const parse = s => {
  const tokens = [];
  const ops = [];
  const line = [];
  let inComment = false;
  let inDirective = false;
  for (const [chunk] of (s + '\n').matchAll(/(\s+|#|\S+)/g)) {
    if (chunk === '#') {
      inComment = true;
      continue;
    }
    const tok = getToken(chunk);
    if (inComment) {
      if (tok.breaksLine)
        inComment = false;
      else
        continue;
    }
    if (tok.type === 'bail')
      break;
    if (tok.type === 'whitespace') {
      if (tok.breaksLine && (!inDirective || /\n$/.test(tok.text))) {
        if (line.length && line[0].type == 'directive') {
          if (line[0].value === 'def') {
            ops.push({
              type: 'define',
              name: line[1].value,
              ops: line.slice(2),
            });
          } else if (line[0].value === 'fn') {
            if (line.length < 3)
              throw new Error("`:fn` used with wrong number of arguments. Expected name, arity, and (optional) return type.");
            const name = line[1].value;
            const glName = name.match(/^[^.]+/)[0];
            const arity = line[2].value;
            const type = line[3] && line[3].value;
            ops.push({
              type: 'define',
              name,
              ops: [{ type: 'native', fn: stack => {
                const args = stack.splice(stack.length-arity, arity);
                stack.push({
                  type: 'invocation',
                  glName,
                  dataType: type || args[0].dataType,
                  const: args.reduce((acc, arg) => acc && arg.const, true),
                  args,
                });//`${glName}(${stack.splice(stack.length-arity, arity).join(', ')})`);
              }}],
            });
          } else if (line[0].value === 'loop') {
            const count = line[1].value;
            ops.push({
              type: 'loop',
              count,
              ops: line.slice(2),
            });
          } else if (line[0].value === 'freeze') {
            const varType = line[1].value;
            const word = line[2].value;
            ops.push({
              type: 'freeze',
              varType,
              word,
            });
          } else {
            throw new Error('bad directive');
          }
        } else {
          // throw new Error(`unknown token: ${JSON.stringify(line)}`);
          ops.push(...line);
        }
        line.length = 0;
      }
    } else {
      if (tok.type == 'directive')
        inDirective = true;
      line.push(tok);
    }
  }
  return ops;
}

const compile = (gl, parseTree, globals) => {
  let uniform_seq = 0;
  let texture_seq = 0;
  let var_seq = 0;
  let preamble = '';
  let tasks = [];
  let stack = [];
  let defs = {
    beat: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'float',
      const: false,
      value: 'beat',
    }); }}],
    inv_camera_mat: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'mat4',
      const: false,
      value: 'inv_camera_mat',
    }); }}],
    camera_mat: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'mat4',
      const: false,
      value: 'camera_mat',
    }); }}],
    inv_proj_mat: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'mat4',
      const: false,
      value: 'inv_proj_mat',
    }); }}],
    proj_mat: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'mat4',
      const: false,
      value: 'proj_mat',
    }); }}],
    t: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'float',
      const: false,
      value: 't',
    }); }}],
    c: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'float',
      const: false,
      value: 'c',
    }); }}],
    vert: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'vec4',
      const: false,
      value: 'p_in',
      isDefault: true,
    }); }}],
    norm: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'vec3',
      const: false,
      value: 'norm',
    }); }}],
    p: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'vec3',
      const: false,
      value: 'p',
    }); }}],
    u_freq: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'sampler2d',
      const: false,
      value: 'u_freq',
    }); }}],
    u_fast_freq: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'sampler2d',
      const: false,
      value: 'u_fast_freq',
    }); }}],
    u_smooth_freq: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'sampler2d',
      const: false,
      value: 'u_smooth_freq',
    }); }}],
    fbAspect: [{ type: 'native', fn: (stack, tag) => {
      const fb = stack.pop();
      const u_name = `u_${uniform_seq++}`;
      tasks.push({
        type: 'set_uniform',
        name: u_name,
        valueType: 'float',
        get value() {
          return (fb.w / fb.h) || 1;
        },
      });
      stack.push({
        type: 'symbol',
        dataType: 'float',
        const: false,
        value: u_name,
      });
    }}],
    aspect: [{ type: 'native', fn: (stack, tag) => {
      if (tag) {
        const u_name = `u_fb_aspect_${tag}`;
        tasks.push({
          type: 'set_uniform',
          name: u_name,
          valueType: 'float',
          get value() {
            const fb = globals.framebuffers[tag];
            return (fb.w / fb.h) || 1;
          },
        });
        stack.push({
          type: 'symbol',
          dataType: 'float',
          const: false,
          value: u_name,
        });
        return;
      }
      stack.push({
        type: 'symbol',
        dataType: 'float',
        const: false,
        value: 'aspect',
      });
    }}],
    midi: [{ type: 'native', fn: (stack, tag) => {
      const u_name = `u_${uniform_seq++}`;
      tasks.push({
        type: 'set_uniform',
        name: u_name,
        valueType: 'float',
        get value() { return globals.midi[tag]; },
      });
      stack.push({
        type: 'symbol',
        dataType: 'float',
        const: false,
        value: u_name,
      });
    }}],
    loadGltf: [{ type: 'native', fn: (stack, tag) => {
      const needLoad = !(tag in meshCache);
      const mesh = needLoad ? (meshCache[tag] = {}) : meshCache[tag];
      needLoad && new GLTFLoader().load(`/mesh/${tag}.glb`, gltf => {
        mesh.gltf = gltf;

        const { attributes, index } = gltf.scene.children[0].geometry;
        [mesh.positionBuffer] = [attributes.position].map(attr => {
          const buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, attr.array, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, null);

          const indexBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index.array, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
          return {
            draw(pLoc) {
              gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
              gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
              gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 0, 0);
              gl.clear(gl.DEPTH_BUFFER_BIT);
              gl.enable(gl.DEPTH_TEST);
              gl.frontFace(gl.CW);
              gl.drawElements(gl.TRIANGLES, index.count, gl.UNSIGNED_SHORT, 0);
              gl.frontFace(gl.CCW);
              gl.drawElements(gl.TRIANGLES, index.count, gl.UNSIGNED_SHORT, 0);
              gl.disable(gl.DEPTH_TEST);
              gl.bindBuffer(gl.ARRAY_BUFFER, null);
              gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            }
          };
        });
        [mesh.normalBuffer] = [attributes.normal].map(attr => {
          const buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, attr.array, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, null);

          return {
            bind(loc) {
              gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
              gl.enableVertexAttribArray(loc);
              gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
              gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }
          };
        });
      });
      stack.push({
        type: 'symbol',
        dataType: 'gltf',
        const: true,
        value: mesh,
      });
    }}],
    load: [{ type: 'native', fn: (stack, tag) => {
      const m = tag.match(/^([^']+)(?:'(\d+)x(\d+))?$/);
      const path = m[1];
      const u_name = `u_${uniform_seq++}`;
      tasks.push({
        type: 'set_uniform',
        name: u_name,
        valueType: 'sampler2D',
        value: globals.ctx.getImage('/' + path, +m[2] || 0, +m[3] || 0),
      });
      stack.push({
        type: 'symbol',
        dataType: 'float',
        const: false,
        value: u_name,
      });
    }}],
    param: [{ type: 'native', fn: (stack, tag) => {
      const u_name = `param_${tag}`;
      tasks.push({
        type: 'set_uniform',
        name: u_name,
        valueType: 'float',
        get value() {
          if (globals.ctx.config.params && tag in globals.ctx.config.params) {
            const v = globals.ctx.config.params[tag];
            return typeof v == 'function' ? v.call(globals.ctx.config, globals.ctx) : v;
          }
          return  globals.ctx.params[tag];
        },
      });
      stack.push({
        type: 'symbol',
        dataType: 'float',
        const: false,
        value: u_name,
      });
    }}],
    fb: [{ type: 'native', fn: (stack, tag) => {
      let fb = globals.framebuffers[tag];
      if (!fb)
        globals.framebuffers[tag] = createFBPair(ctx, globals.old && globals.old.globals.framebuffers[tag]);
      const u_name = `fb_${tag}`;
      tasks.push({
        type: 'set_uniform',
        name: u_name,
        valueType: 'sampler2D',
        value: globals.framebuffers[tag],
      });
      stack.push({
        type: 'symbol',
        dataType: 'sampler2D',
        const: false,
        value: u_name,
      });
    }}],
    dims: [{ type: 'native', fn: stack => {
      const u_name = `u_dims`;
      tasks.push({
        type: 'set_uniform',
        name: u_name,
        valueType: 'vec2',
        get value() {
          return globals.ctx.viewport.slice(2);
        },
      });
      stack.push({
        type: 'symbol',
        dataType: 'vec2',
        const: false,
        value: u_name,
      });

    }}],
    PI: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'float',
      const: true,
      value: 'PI',
    }); }}],
    draw: [{ type: 'native', fn: stack => {
      tasks.push({
        type: 'draw',
        frag: stack.pop(),
        vert: defs.vert && (() => {
          const stack = [];
          defs.vert[0].fn(stack);
          if (!stack[0].isDefault)
            return stack[0];
        })(),
        mesh: defs.mesh && (() => {
          const stack = [];
          defs.mesh[0].fn(stack);
          return stack[0];
        })(),
      });
      preamble = '';
    }}],
    lase: [{ type: 'native', fn: stack => {
      tasks.push({
        type: 'lase',
        frag: stack.pop(),
      });
      preamble = '';
    }}],
    setblend: [{ type: 'native', fn: (stack, tag) => {
      tasks.push({
        type: 'blend',
        mode: [gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR],
      });
    }}],
    drawto: [{ type: 'native', fn: (stack, tag) => {
      const target = globals.framebuffers[tag] || (globals.framebuffers[tag] = createFBPair(ctx));
      tasks.push({
        type: 'draw',
        target,
        frag: stack.pop(),
        vert: defs.vert && (() => {
          const stack = [];
          defs.vert[0].fn(stack);
          if (!stack[0].isDefault)
            return stack[0];
        })(),
        mesh: defs.mesh && (() => {
          const stack = [];
          defs.mesh[0].fn(stack);
          return stack[0];
        })(),
      });
      preamble = '';
    }}],
    tvel: [{ type: 'native', fn: stack => {
      const newTimeVelocity = +stack.pop();
      if (isNaN(newTimeVelocity))
        return;
      timeVelocity = newTimeVelocity;
      kickstart();
    }}],
    fftsmooth: [{ type: 'native', fn: stack => {
      const smooth = +stack.pop().value;
      if (isNaN(smooth))
        return;
      if (globals.audioAnalyser)
        globals.audioAnalyser.analyser.smoothingTimeConstant = smooth;
    }}],
    st: [{ type: 'native', fn: stack => {
      const {audioAnalyser} = globals;
      if (typeof stack[stack.length-1].value != 'number') {
        const textureID = texture_seq++;
        // if (!globals.framebuffers.st)
        //   globals.framebuffers.st = createFB(gl, audioAnalyser.byteTimeData.length, 1);
        tasks.push({
          type: 'set_uniform',
          name: 'u_audio_zero_crossing_time',
          valueType: 'float',
          get value() {
            const {byteTimeData} = audioAnalyser;
            for (let i = 0; i < byteTimeData.length; i++) {
              if (i > 0 && byteTimeData[i-1] < 127 && byteTimeData[i] >= 127) {
                return i / byteTimeData.length;
              }
            }
            return 0;
          },
        });
        tasks.push({
          type: 'set_uniform',
          name: 'u_audio_time',
          valueType: 'sampler2D',
          value: {
            tex: globals.framebuffers.st.tex,
            draw() {
              gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.LUMINANCE,
                audioAnalyser.byteTimeData.length, 1, 0,
                gl.LUMINANCE, gl.UNSIGNED_BYTE, audioAnalyser.byteTimeData
              );
            },
          }
        });
        stack.push({ type: "symbol", dataType: "float", const: false, value: 'u_audio_zero_crossing_time' });
        doOps(parse(`+ 2 / 0 vec2 fb'st swap texture2D .x`));
      } else {
        const bucket = stack.pop();
        const bucketNumber = Math.floor(+bucket.value * audioAnalyser.byteTimeData.length);
        const u_name = `u_${uniform_seq++}`;
        tasks.push({
          type: 'set_uniform',
          name: u_name,
          valueType: 'float',
          get value() {
            return audioAnalyser.byteTimeData[bucketNumber]/255;
          }
        });
        stack.push({ type: "symbol", dataType: "float", const: false, value: u_name });
      }
    }}],
    sf: [{ type: 'native', fn: stack => {
      if (true || typeof stack[stack.length-1].value != 'number') {
        const textureID = texture_seq++;
        stack.push({
          type: 'invocation',
          glName: 'sf',
          dataType: 'float',
          const: false,
          args: [stack.pop()],
        });
        // doOps(parse(`2 pow 0 vec2 u_freq swap texture2D .x`));
      } else {
        const bucket = stack.pop();
        const bucketNumber = Math.floor(+bucket.value * audioAnalyser.byteFreqData.length);
        const u_name = `u_${uniform_seq++}`;
        tasks.push({
          type: 'set_uniform',
          name: u_name,
          valueType: 'float',
          get value() {
            return audioAnalyser.byteFreqData[bucketNumber]/255;
          }
        });
        stack.push({ type: "symbol", dataType: "float", const: false, value: u_name });
      }
    }}],
    fsf: [{ type: 'native', fn: stack => {
      const textureID = texture_seq++;
      stack.push({
        type: 'invocation',
        glName: 'fsf',
        dataType: 'float',
        const: false,
        args: [stack.pop()],
      });
    }}],
    ssf: [{ type: 'native', fn: stack => {
      stack.push({
        type: 'invocation',
        glName: 'ssf',
        dataType: 'float',
        const: false,
        args: [stack.pop()],
      });
    }}],
    pause: [{ type: 'native', fn: stack => {
      timeVelocity = 0;
    }}],
    pad_x: [{ type: 'native', fn: stack => {
      const whichPad = +stack.pop();
      const u_name = `u_${uniform_seq++}`;
      if (isNaN(whichPad)) {
      } else {
        tasks.push({
          type: 'set_uniform',
          name: u_name,
          valueType: 'float',
          get value() {
            return pads[whichPad] && pads[whichPad].x || 0;
          },
        });
      }
      stack.push(u_name);
    }}],
    pad_y: [{ type: 'native', fn: stack => {
      const whichPad = +stack.pop();
      const u_name = `u_${uniform_seq++}`;
      if (isNaN(whichPad)) {
      } else {
        tasks.push({
          type: 'set_uniform',
          name: u_name,
          valueType: 'float',
          get value() {
            return pads[whichPad] && pads[whichPad].y || 0;
          },
        });
      }
      stack.push(u_name);
    }}],
    pad: [{ type: 'native', fn: stack => {
      const whichPad = +stack.pop();
      const u_name = `u_${uniform_seq++}`;
      if (isNaN(whichPad)) {
      } else {
        let interpVal = pads[whichPad] && pads[whichPad].pressed ? 1 : 0;
        tasks.push({
          type: 'set_uniform',
          name: u_name,
          valueType: 'float',
          get value() {
            const target = pads[whichPad] && pads[whichPad].pressed ? 1 : 0;
            interpVal += (target - interpVal) * 0.1;
            return interpVal;
          }
        });
      }
      stack.push(u_name);
    }}],
    '{': [{ type: 'native', fn: stack => {
      defs = Object.create(defs);
    }}],
    '}': [{ type: 'native', fn: stack => {
      defs = Object.getPrototypeOf(defs);
    }}],
  };
  const doOps = (ops, tag) => {
    for (const op of ops) {
      if (op.type === 'define') {
        defs[op.name] = op.ops;
      } else if (op.type === 'loop') {
        const { count, ops } = op;
        // const l_name = `l_${var_seq++}`;
        const initialValue = stack.pop();
        stack.push({ type: "loopVar", dataType: initialValue.dataType, const: false, });
        doOps(ops);
        const body = stack.pop();
        // preamble += `${varType} ${l_name} = ${l_val}; for (int i = 0; i < ${count}; i++) ${l_name} = ${body};\n`;
        stack.push({ type: "loop", dataType: initialValue.dataType, initialValue, count, body });
        // stack.push({ type: "loop", dataType: l_val.dataType, value: l_name });
      } else if (op.type === 'freeze') {
        // no-op
      } else if (op.type === 'operator') {
        const right = stack.pop();
        const left = stack.pop();
        if (!left || !right)
          throw new Error(`Null argument to operator: ${left} ${op.value} ${right}`);
        if (!left.dataType || !right.dataType) {
          throw new Error(`Something unexpected on the stack: ${JSON.stringify(left)}, ${JSON.stringify(right)}`);
        }
        const dataType = glTypeFromBinaryOperationOnTypes(left.dataType, right.dataType);
        stack.push({
          type: 'operator',
          value: op.value,
          dataType, left, right,
          const: left.const && right.const,
        });
        // stack.push(`(${[stack.pop(), op.value, stack.pop()].reverse().join(' ')})`);
      } else if (op.type === 'number') {
        // let ns = op.value.toString();
        // if (ns.indexOf('.') === -1)
        //   ns += '.';
        // stack.push(ns);
        stack.push({
          type: 'literal',
          dataType: 'float',
          const: true,
          value: op.value,
        });
      } else if (op.type === 'word') {
        const def = defs[op.value];
        if (def) {
          doOps(def, op.tag);
        } else {
          throw new Error(`"${op.value}" is not defined.`);
        }
      } else if (op.type === 'native') {
        op.fn(stack, tag);
      } else if (op.type === 'swizzle') {
        const components = op.components;
        const value = stack.pop();
        const dataType = components.length > 1 ? `vec${components.length}` : 'float';
        stack.push({
          type: 'swizzle',
          dataType,
          const: value.const,
          components,
          value,
        });
        // stack.push(`(${stack.pop()}).${op.components}`);
      } else if (op.type === 'assign') {
        const v = stack.pop();
        defs[op.name] = [{ type: 'native', fn: stack => { stack.push(v); }}];
      } else {
        throw new Error('idk what this thing is: ' + JSON.stringify(op));
      }
    }
  };
  doOps(parseTree);
  return tasks;
}

class ShittyJSONStringifier {
  constructor() {
    this.cache = new Map();
  }

  stringifyImpl(obj) {
    if (Array.isArray(obj)) {
      return `[${obj.map(obj => this.stringify(obj)).join(',')}]`;
    } else if (typeof obj == 'object') {
      return `{${Object.keys(obj).map(k => `${JSON.stringify(k)}:${this.stringify(obj[k])}`).join(',')}`;
    } else {
      return JSON.stringify(obj);
    }
  }

  stringify(obj) {
    let c = this.cache.get(obj);
    if (!c)
      this.cache.set(obj, c = this.stringifyImpl(obj));
    return c;
  }
}

const optimizeTree = tree => {
  const canonicalize = node => {
    let stringifier = new ShittyJSONStringifier();
    let loops = [];
    const canonicalNodes = {};
    let canonicalLoopVar;
    const traverse = node => {
      const k = stringifier.stringify(node);
      if (node.type == 'loopVar') {
        if (!loops.length)
          throw new Error("loopVar outside of a loop?!?!?!");
        return canonicalLoopVar || (canonicalLoopVar = node);
      }
      const canon = canonicalNodes[k];
      if (canon)
        return canon;
      const ret = canonicalNodes[k] = {};
      if (node.type == 'loop')
        loops.push(node);
      for (const k in node) {
        const v = node[k];
        if (Array.isArray(v)) {
          ret[k] = v.map(traverse);
        } else if (typeof v == 'object') {
          ret[k] = traverse(v);
        } else {
          ret[k] = v;
        }
      }
      if (node.type == 'loop')
        canonicalLoopVar = null;
      if (node.type == 'loop')
        loops.pop();
      return ret;
    };
    return traverse(node);
  };
  const canonicalTree = tree;//canonicalize(tree);

  const buildMetadata = node => {
    const loopStack = [];
    const metadata = new Map();
    const traverse = (node, parent, parentMeta) => {
      let taint = false;
      if (node.type == 'literal')
        return;
      if (node.type == 'symbol')
        return;

      let meta = metadata.get(node);
      if (!meta) {
        metadata.set(node, meta = {
          parents: [],
          children: [],
        });
        if (node.type == 'loop') {
          loopStack.push(node);
        } else if (node.type == 'loopVar') {
          meta.loop = loopStack[loopStack.length-1];
          taint = true;
        }
        for (const k in node) {
          const v = node[k];
          if (Array.isArray(v)) {
            for (const child of v) {
              meta.children.push(child);
              taint = traverse(child, node) || taint;
            }
          } else if (typeof v == 'object') {
            meta.children.push(v);
            taint = traverse(v, node) || taint;
          }
        }
        if (node.type == 'loop')
          loopStack.pop();
      }
      if (parent)
        meta.parents.push(parent);
      if (taint && node.type != 'loop')
        meta.taint = true;
      return meta.taint;
    };
    traverse(node);
    return metadata;
  };
  const metadata = buildMetadata(canonicalTree);

  const optimize = tree => {
    let extracted = [];
    let visitedNodes = new Set();
    let nextToVisit = [canonicalTree];
    const visit = node => {
      if (visitedNodes.has(node))
        return;
      visitedNodes.add(node);
      const meta = metadata.get(node);
      if (!meta)
        return;
      nextToVisit.splice(0, 0, ...meta.children);
      // if (node.type == 'loopVar') {
      //   meta.id = metadata.get(meta.loop).id;
      // } else if (meta.taint) {
      if (meta.taint) {
      } else if (node.type == 'loop' || meta.parents.length >= 2) {
        meta.id = extracted.push(node) - 1;
      }
    };

    while (nextToVisit.length) {
      let toVisit = nextToVisit;
      nextToVisit = [];
      for (const node of toVisit)
        visit(node);
    }
    
    return extracted;
  };
  const extracted = optimize(canonicalTree);

  const rebuild = tree => {
    const traverse = (node, skip) => {
      const meta = metadata.get(node);
      if (!meta)
        return node;
      if (!skip && meta.id !== undefined) {
        return {
          type: "reference",
          id: meta.id,
          const: node.const,
          selfref: meta.loop !== undefined,
        };
      }
      const ret = {};
      for (const k in node) {
        const v = node[k];
        if (Array.isArray(v)) {
          ret[k] = v.map(v => traverse(v));
        } else if (typeof v == 'object') {
          ret[k] = traverse(v);
        } else {
          ret[k] = v;
        }
      }
      return ret;
    };
    return traverse(tree, true);
  };

  return { extracted: extracted.map(rebuild), tree: rebuild(canonicalTree) };
}

const toGLSource = tree => {
  // console.log(tree);
  let decls = "";
  let loop_stack = [];
  let cur_loop = null;
  let references = [];
  let depsMet = {};
  let depFail = false;
  const serialize = node => {
    switch(node.type) {
      case "invocation":
        return `${node.glName}(${node.args.map(serialize).join(', ')})`;
        break;
      case "operator":
        return `(${serialize(node.left)} ${node.value} ${serialize(node.right)})`;
      case "swizzle":
        return `${serialize(node.value)}.${node.components}`;
      case "literal":
        let ns = node.value.toString();
        if (ns.indexOf('.') === -1)
          ns += '.';
        return ns;
      case "symbol":
        return node.value;
      case "reference":
        if (!depsMet[node.id])
          depFail = true;
        return references[node.id];
      case "loopVar":
        if (cur_loop === null)
          throw new Error('tried to loopVar outside a loop');
        return references[loop_stack[loop_stack.length-1]];
      case "loop":
        const loop_var = references[loop_stack[loop_stack.length-1]];
        cur_loop = loop_stack[loop_stack.length-1];
        try {
          return `${serialize(node.initialValue)}; for (int i = 0; i < ${node.count}; i++) ${loop_var} = ${serialize(node.body)};\n`;
        } finally {
          cur_loop = null;
        }
      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  };
  const optimized = optimizeTree(tree);
  for (let i = 0; i < optimized.extracted.length; i++) {
    const name = `var_${i}`;
    references.push(name);
  }
  for (;;) {
    let didEmit = false;
    for (let i = optimized.extracted.length - 1; i >= 0; i--) {
      if (depsMet[i])
        continue;
      const expr = optimized.extracted[i];
      loop_stack.push(i);
      depFail = false;
      const nPre = `${expr.const ? "" : ""}${expr.dataType} ${references[i]} = ${serialize(expr, depsMet)}; \n`;
      loop_stack.pop();
      if (depFail)
        continue;
      decls += nPre;
      depsMet[i] = true;
      didEmit = true;
    }
    if (!didEmit)
      break;
  }
  for (let i = 0; i < optimized.extracted.length; i++) {
    if (!depsMet[i])
      throw new Error("Failed to meet all deps.");
  }
  const expr = serialize(optimized.tree);
  return { preamble: decls, expr, }
};

const jsEnv = {
  vec2(...args) { return args },
  vec3(...args) { return args },
  vec4(...args) { return args },
  vec5(...args) { return args },
  math,
  sin: Math.sin.bind(Math),
  cos: Math.cos.bind(Math),
  tan: Math.tan.bind(Math),
  abs: Math.abs.bind(Math),
  min: Math.min.bind(Math),
  max: Math.max.bind(Math),
  step(a, b) { return a > b ? 1 : 0; },
  mod(a, b) { return a % b; },
  pow: math.pow.bind(math),
  PI: Math.PI,
  fsf: v => 0,
  sf: v => 0,
  t: 0,
};

const jsMembers = {
  x: 0,
  y: 1,
  z: 2,
  w: 3,
  r: 0,
  g: 1,
  b: 2,
  a: 3,
  u: 0,
  v: 1,
};

const toJS = (tree, globals) => {
  const serialize = node => {
    switch(node.type) {
      case "invocation":
        return `${node.glName}(${node.args.map(serialize).join(', ')})`;
        break;
      case "operator":
        switch (node.value) {
          case '+':
            return `math.add(${serialize(node.left)}, ${serialize(node.right)})`;
          case '-':
            return `math.subtract(${serialize(node.left)}, ${serialize(node.right)})`;
          case '*':
            return `math.dotMultiply(${serialize(node.left)}, ${serialize(node.right)})`;
          case '/':
            return `math.divide(${serialize(node.left)}, ${serialize(node.right)})`;
          default:
            throw new Error(`Unknown operator '${node.value}' in laser context`);
        }
      case "swizzle":
        return `(a => ${JSON.stringify(node.components.split('').map(c => jsMembers[c]))}.map(i => a[i]))(${serialize(node.value)})`;
      case "literal":
        let ns = node.value.toString();
        if (ns.indexOf('.') === -1)
          ns += '.';
        return ns;
      case "symbol":
        return node.value;
      case "reference":
        if (!depsMet[node.id])
          depFail = true;
        return references[node.id];
      case "loopVar":
        if (cur_loop === null)
          throw new Error('tried to loopVar outside a loop');
        return references[loop_stack[loop_stack.length-1]];
      case "loop":
        const loop_var = references[loop_stack[loop_stack.length-1]];
        cur_loop = loop_stack[loop_stack.length-1];
        try {
          return `${serialize(node.initialValue)}; for (int i = 0; i < ${node.count}; i++) ${loop_var} = ${serialize(node.body)};\n`;
        } finally {
          cur_loop = null;
        }
      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  };
  const env = {
    ...jsEnv,
    fsf: (v => globals.freqBuf[Math.floor(v*globals.fastFreqBuf.length)]/255),
    sf: (v => globals.freqBuf[Math.floor(v*globals.freqBuf.length)]/255),
    t: globals.t - 0.07,
    get beat() { return globals.ctx.params.beat; },
  };
  console.log('wut');
  const f = new Function(...Object.keys(env), 'c', 'return ' + serialize(tree));
  return (...args) => {
    return f.call(null, ...Object.values(env), ...args);
  };
};
/*
*/

const updateFrag = (gl, vs, globals, value) => {
  let newParseTree;
  newParseTree = parse(value);
  const newTasks = compile(gl, newParseTree, globals);

  const newRuntimeTasks = [];
  let pendingUniforms;
  for (const task of newTasks) {
    if (!pendingUniforms) {
      pendingUniforms = {
        t: {
          valueType: 'float',
          get value() {
            return globals.t;
          }
        },
        inv_camera_mat: {
          valueType: 'mat4',
          get value() {
            return globals.ctx.uniforms.inv_camera_mat || [];
          }
        },
        camera_mat: {
          valueType: 'mat4',
          get value() {
            return globals.ctx.uniforms.camera_mat || [];
          }
        },
        inv_proj_mat: {
          valueType: 'mat4',
          get value() {
            return globals.ctx.uniforms.inv_proj_mat || [];
          }
        },
        proj_mat: {
          valueType: 'mat4',
          get value() {
            return globals.ctx.uniforms.proj_mat || [];
          }
        },
        aspect: {
          valueType: 'float',
          get value() {
            const { viewport } = globals.ctx;
            return viewport[2] / viewport[3];
          }
        },
        u_freq: {
          valueType: 'sampler2D',
          value: {
            get tex() { return globals.freqTex; },
            draw() {},
          }
        },
        u_smooth_freq: {
          valueType: 'sampler2D',
          value: {
            get tex() { return globals.smoothFreqTex; },
            draw() {},
          }
        },
        u_fast_freq: {
          valueType: 'sampler2D',
          value: {
            get tex() { return globals.fastFreqTex; },
            draw() {},
          }
        },
      };
    }
    if (task.type == 'blend') {
      newRuntimeTasks.push(() => {
        gl.blendFunc(...task.mode);
      });
    } else if (task.type == 'draw') {
      let currentProg = null;

      let defs = "";
      const uniforms = pendingUniforms;
      for (const k in uniforms) {
        const u = uniforms[k];
        defs += `
          uniform ${u.valueType} ${k};
        `;
      }
      pendingUniforms = null;

      const {preamble, expr: exprText} = toGLSource(task.frag);
      const progText = `
        ${preamble}
        gl_FragColor = ${exprText};
      `;
      // console.log('source:', progText);

      const prog = gl.createProgram();
      const shaderText = globals.shaderText = wrapFragShader(progText, defs);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, shaderText);
      // console.log(shaderText);
      if (task.vert) {
        let {preamble, expr: exprText} = toGLSource(task.vert);
        defs += `
float sf(float at) {
  return texture(u_freq, vec2(at*at, 0)).x;
}

float ssf(float at) {
  return texture(u_smooth_freq, vec2(at*at, 0)).x;
}

float fsf(float at) {
  return texture(u_fast_freq, vec2(at*at, 0)).x;
}

        `;
        const progText = wrapVertShader(`
          ${preamble}
          gl_Position = ${exprText};
        `, defs);
        const vs = compileShader(gl, gl.VERTEX_SHADER, progText);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
          console.log(gl.getShaderInfoLog(vs));
          console.log(progText);
        }
        gl.attachShader(prog, vs);
      } else {
        gl.attachShader(prog, vs);
      }
      globals.progs.push({ prog, fs, vs });
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      // if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      //   console.log(gl.getProgramInfoLog(prog));
      //   return;
      // }
      newRuntimeTasks.push(() => {
        let pLoc, normLoc;
        const mesh = task.mesh ? task.mesh.value : defaultMesh;
        const isDefaultMesh = mesh === defaultMesh;
        if (!mesh)
          return false;
        if (mesh != defaultMesh && !mesh.positionBuffer)
          return false;

        // if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        //   console.log(gl.getProgramInfoLog(prog));
        //   return;
        // }
        gl.useProgram(prog);
        currentProg = prog;

        let textures = [];
        for (const k in uniforms) {
          const u = uniforms[k];
          const loc = uniforms[k].location || (uniforms[k].location = gl.getUniformLocation(prog, k));
          const v = u.value;
          if (u.valueType === 'sampler2D') {
            let fb = u.value;
            if (typeof fb == 'function')
              fb = fb();
            let id = textures.indexOf(fb);
            if (id < 0)
              id = textures.push(fb) - 1;

            // Activate here to make sure accessing fb.tex,
            // if its getter does any drawing, doesn't stomp
            // another texture unit.
            gl.activeTexture(gl['TEXTURE' + id]);
            let tex = fb.tex || fb;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            fb.draw && fb.draw();
            gl.uniform1i(loc, id);
          } else if (u.valueType === 'vec2') {
            gl.uniform2f(loc, ...u.value);
          } else if (u.valueType === 'mat4') {
            gl.uniformMatrix4fv(loc, false, u.value);
          } else {
            gl.uniform1f(loc, u.value);
          }
        }

        pLoc = gl.getAttribLocation(prog, "p_in");
        if (mesh.normalBuffer) {
          normLoc = gl.getAttribLocation(prog, "norm_in");
          mesh.normalBuffer.bind(normLoc);
        }
        const doDraw = ctx => {
          if (mesh.positionBuffer) {
            if (normLoc)
              gl.enableVertexAttribArray(normLoc);
            mesh.positionBuffer.draw(pLoc);
            if (normLoc)
              gl.disableVertexAttribArray(normLoc);
          } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, globals.buffer);
            gl.enableVertexAttribArray(pLoc);
            gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, mesh.length / 3);
          }
        };
        if (task.target)
          task.target.drawInto(doDraw);
        else
          doDraw(globals.ctx);
      });
    } else if (task.type === 'lase') {
      const f = toJS(task.frag, globals);
      console.log(f);
      setTimeout(() => {
        window.setLaserFn(() => {
          const ret = new Array(500);
          for (let i = 0; i < ret.length; i++)
            ret[i] = f(i/ret.length);
          return ret;
        });
      }, 0);
    } else if (task.type === 'set_uniform') {
      pendingUniforms[task.name] = {
        valueType: task.valueType,
        get value() { return task.value; }
      };
    }
  }
  return newRuntimeTasks;
}

const getToken = text => {
  let tok = {};
  if (/'.+/.test(text)) {
    const idx = text.indexOf("'");
    tok.tag = text.substr(idx + 1);
    text = text.substr(0, idx);
  }
  if (/\s+/.test(text))
    return Object.assign({ type: 'whitespace', breaksLine: text.indexOf('\n') != -1, text }, tok);
  const numberValue = +text;
  if (/^bail\b/.test(text))
    return Object.assign({ type: 'bail' }, tok);
  if (!isNaN(numberValue))
    return Object.assign({ type: 'number', value: numberValue }, tok);
  if (text[0] === ':')
    return Object.assign({ type: 'directive', value: text.substr(1) }, tok);
  if (/^\./.test(text))
    return Object.assign({ type: 'swizzle', components: text.substr(1) }, tok);
  if (/^=/.test(text))
    return Object.assign({ type: 'assign', name: text.substr(1) }, tok);
  if (!/^[a-zA-Z{}]/.test(text))
    return Object.assign({ type: 'operator', value: text }, tok);
  return Object.assign({ type: 'word', value: text }, tok);;
};

const defaultMesh = new Float32Array([
  -1, 1, 0, -1, -1, 0,
  1, 1, 0, 1, -1, 0,
]);

export default class S4r {
  constructor(ctx, paths, old) {
    const gl = this.gl = ctx.canvas.gl;
    this.texts = paths.map(() => null);
    this.uses = {};
    this.parallelExt = gl.getExtension('KHR_parallel_shader_compile');
    this.ready = false;
    this.interestedPaths = new Set(paths.map(path =>
      new URL(path, location).pathname));
    Promise.all(paths.map(path => fetch(path).then(r => r.text()))).then(texts => {
      this.texts = texts;
      this.compile();
    }).catch(e => this.error = e);
    // this.files = paths.map((path, i) => new HotFile(new URL(path, location), text => {
    //   this.texts[i] = text;
    //   try {
    //     this.compile();
    //   } catch (e) {
    //     this.error = e;
    //   }
    // }));
    this.globals = {
      get fastFreqBuf() {
        return ctx.fastFFT.buf;
      },
      get freqBuf() {
        return ctx.medFFT.buf;
      },
      get freqTex() {
        return ctx.medFFT.tex;
      },
      get fastFreqTex() {
        return ctx.fastFFT.tex;
      },
      get smoothFreqTex() {
        return ctx.slowFFT.tex;
      },
      get t() {
        return ctx.now();
      },
      midi: ctx.midi,
      framebuffers: Object.create(ctx.textures),
      old,
      progs: [],
      ctx,
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, defaultMesh, gl.STATIC_DRAW);
    this.globals.buffer = buffer;

    const vs = this.vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, wrapVertShader(`
      gl_Position = vec4(p, 1.);
    `, ``));
    gl.compileShader(vs);
  }
  checkReady() {
    if (this.ready)
      return true;
    const { gl, globals } = this;
    if (this.didErr)
      return false;
    if (!globals.progs.length)
      return false;
    for (const { prog, fs, vs, } of globals.progs) {
      if (this.parallelExt && !this.gl.getProgramParameter(prog, this.parallelExt.COMPLETION_STATUS_KHR))
        return false;
      continue;
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        this.error = new Error("Error in fragment shader");
        this.error.infoLog = gl.getShaderInfoLog(fs);
        this.error.shaderSource = globals.shaderText;
        this.didErr = true;
        return false;
      }
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        this.error = new Error("Error in vertex shader");
        this.error.infoLog = gl.getShaderInfoLog(vs);
        this.error.shaderSource = globals.shaderText;
        this.didErr = true;
        return false;
      }
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        this.error = new Error("Linker error");
        this.error.infoLog = gl.getProgramInfoLog(prog);
        this.didErr = true;
        return false;
      }
    }
    this.ready = true;
    return true;
  }
  compile() {
    this.ready = false;
    this.didErr = false;
    for (const text of this.texts)
      if (text == null) return;
    try {
      this.runtimeTasks = updateFrag(this.gl, this.vs, this.globals, this.texts.join('\n'));
      // this.ready = true;
    } catch (e) {
      this.error = e;
    }
  }
  uniformsChanged() {
    this.compile();
  }
  usesInput(k) {
    if (!(k in this.uses)) {
      const { gl } = this;
      this.uses[k] = false;
      for (const { prog } of this.globals.progs) {
        if (gl.getUniformLocation(prog, `fb_${k}`)) {
          this.uses[k] = true;
          break;
        }
      }
    }
    return this.uses[k];
  }
  draw() {
    // if (this.interestedPaths.has("/shaders/s4y/rectTun.s4r"))
    //   if (this.globals.ctx.viewport[3] != 463.3125)
    //     console.log(this.globals.ctx.viewport);
    const { gl } = this;
    for (const task of this.runtimeTasks)
      task();
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (this.globals.old)
      this.globals.old = null;
  }
  discard() {
  }
}
