import HotFile from '/lib/HotFile.js'

const createFB = (gl, w, h, name) => {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const ret = {
    tex,
    fb,
    name,
    w: 0,
    h: 0,
    aspect() { return this.w / this.h },
    clear() {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        this.w, this.h, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, null
      );
    },
    clearIfNeeded() {
      const targetW = w || gl.drawingBufferWidth;
      const targetH = h || gl.drawingBufferHeight;
      if (this.w != targetW || this.h != targetH) {
        this.w = targetW;
        this.h = targetH;
        this.clear();
      }
    },
    attach(id) {
      gl.activeTexture(gl['TEXTURE' + id]);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    },
    draw() {
      this.clearIfNeeded();
      // gl.generateMipmap(gl.TEXTURE_2D);
    },
    drawInto(f) {
      // const oldViewport = gl.getParameter(gl.VIEWPORT);
      // const oldFb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      try {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        // gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        f();
      } finally {
        // gl.bindFramebuffer(gl.FRAMEBUFFER, oldFb);
        // gl.viewport(...oldViewport);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    },
  };
  ret.clearIfNeeded();
  return ret;
}

const createFBPair = (gl, w, h) => {
  const fbs = [createFB(gl, w, h, 'alfalfa'), createFB(gl, w, h, 'bravado')];
  return {
    get w() { return fbs[0].w },
    get h() { return fbs[0].h }, 
    get tex() {
      return fbs[0].tex;
    },
    draw() {
      return fbs[0].draw();
    },
    drawInto(f) {
      fbs.reverse();
      fbs[0].drawInto(f);
    },
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
        case 'mat':
          if (l == r)
            return l;
          break;
      }
      break;
  }
  throw new Error(`Unknown type pair for binary op: ${l}, ${r}`);
}

const wrapFragShader = (body, defs) => `
precision highp float;

varying vec3 p;

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

mat4 inverse(mat4 m) {
  float
      a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3],
      a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3],
      a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3],
      a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3],

      b00 = a00 * a11 - a01 * a10,
      b01 = a00 * a12 - a02 * a10,
      b02 = a00 * a13 - a03 * a10,
      b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11,
      b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30,
      b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30,
      b09 = a21 * a32 - a22 * a31,
      b10 = a21 * a33 - a23 * a31,
      b11 = a22 * a33 - a23 * a32,

      det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  return mat4(
      a11 * b11 - a12 * b10 + a13 * b09,
      a02 * b10 - a01 * b11 - a03 * b09,
      a31 * b05 - a32 * b04 + a33 * b03,
      a22 * b04 - a21 * b05 - a23 * b03,
      a12 * b08 - a10 * b11 - a13 * b07,
      a00 * b11 - a02 * b08 + a03 * b07,
      a32 * b02 - a30 * b05 - a33 * b01,
      a20 * b05 - a22 * b02 + a23 * b01,
      a10 * b10 - a11 * b08 + a13 * b06,
      a01 * b08 - a00 * b10 - a03 * b06,
      a30 * b04 - a31 * b02 + a33 * b00,
      a21 * b02 - a20 * b04 - a23 * b00,
      a11 * b07 - a10 * b09 - a12 * b06,
      a00 * b09 - a01 * b07 + a02 * b06,
      a31 * b01 - a30 * b03 - a32 * b00,
      a20 * b03 - a21 * b01 + a22 * b00) / det;
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

    // inv_proj_mat = inverse(perspectiveProj(
    //   PI/2.0, aspect, 0.1, 10.0
    // ));

${defs || ""}

void main() {
${body}
}
`;

// ta.value = localStorage.prog || defaultProgram;

const draw = t => {
  for (const task of runtimeTasks)
    task();
}

const compileFragShader = (gl, s) => {
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, s);
  gl.compileShader(fs);
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
    t: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'float',
      const: false,
      value: 't',
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
    aspect: [{ type: 'native', fn: stack => { stack.push({
      type: 'symbol',
      dataType: 'float',
      const: false,
      value: 'aspect',
    }); }}],
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
    fb: [{ type: 'native', fn: (stack, tag) => {
      let fb = globals.framebuffers[tag];
      if (!fb)
        globals.framebuffers[tag] = createFBPair(gl);
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
      // stack.push(gl.drawingBufferWidth);
      // stack.push(gl.drawingBufferHeight);
      doOps(parse(`${gl.drawingBufferWidth} ${gl.drawingBufferHeight} vec2`));
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
      });
      preamble = '';
    }}],
    drawto: [{ type: 'native', fn: (stack, tag) => {
      const target = globals.framebuffers[tag] || (globals.framebuffers[tag] = createFBPair(gl));
      tasks.push({
        type: 'draw',
        target,
        frag: stack.pop(),
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
        if (!globals.framebuffers.st)
          globals.framebuffers.st = createFB(gl, audioAnalyser.byteTimeData.length, 1);
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
        tasks.push({
          type: 'set_uniform',
          name: 'u_freq',
          valueType: 'sampler2D',
          value: {
            get tex() { return globals.freqTex; },
            draw() {},
          }
        });
        doOps(parse(`2 pow 0 vec2 u_freq swap texture2D .x`));
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
  const canonicalTree = canonicalize(tree);

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
      const nPre = `${expr.const ? "const " : ""}${expr.dataType} ${references[i]} = ${serialize(expr, depsMet)}; \n`;
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
        aspect: {
          valueType: 'float',
          get value() {
            return gl.drawingBufferWidth / gl.drawingBufferHeight;
          }
        },
      };
    }
    if (task.type == 'draw') {
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
      const shaderText = wrapFragShader(progText, defs);
      const fs = compileFragShader(gl, shaderText);
      // console.log(shaderText);
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.log(gl.getProgramInfoLog(prog));
        return;
      }
      const pLoc = gl.getUniformLocation(prog, "p_in");
      newRuntimeTasks.push(() => {
        gl.useProgram(prog);
        currentProg = prog;

        let textures = [];
        for (const k in uniforms) {
          const u = uniforms[k];
          const loc = gl.getUniformLocation(prog, k);
          const v = u.value;
          if (u.valueType === 'sampler2D') {
            const fb = u.value;
            const tex = fb.tex;
            let id = textures.indexOf(fb.tex);
            if (id < 0)
              id = textures.push(fb.tex) - 1;
            gl.activeTexture(gl['TEXTURE' + id]);
            gl.bindTexture(gl.TEXTURE_2D, fb.tex);
            fb.draw();
            gl.uniform1i(loc, id);
          } else {
            gl.uniform1f(loc, u.value);
          }
        }

        gl.enableVertexAttribArray(pLoc);
        gl.vertexAttribPointer(pLoc, 3, gl.FLOAT, false, 0, 0);
        const doDraw = () => {
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, mesh.length / 3);
        };
        if (task.target)
          task.target.drawInto(doDraw);
        else
          doDraw();
      });
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

const mesh = new Float32Array([
  -1, 1, 0, -1, -1, 0,
  1, 1, 0, 1, -1, 0,
]);

export default class S4r {
  constructor(gl, paths, globals) {
    this.gl = gl;
    this.texts = paths.map(() => null);
    this.ready = false;
    this.files = paths.map((path, i) => new HotFile(new URL(path, location), text => {
      this.texts[i] = text;
      try {
        this.compile();
      } catch (e) {
        this.error = e;
      }
    }));
    this.globals = Object.create(globals);
    this.globals.framebuffers = {};

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);

    const vs = this.vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, `
    attribute vec3 p_in;
    varying vec3 p;

    void main() {
      p = p_in;
      gl_Position = vec4(p_in, 1.);
    }
    `);
    gl.compileShader(vs);
  }
  compile() {
    this.ready = false;
    for (const text of this.texts)
      if (text == null) return;
    this.runtimeTasks = updateFrag(this.gl, this.vs, this.globals, this.texts.join('\n'));
    this.ready = true;
  }
  draw() {
    for (const task of this.runtimeTasks)
      task();
  }
}
