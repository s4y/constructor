#version 300 es

precision highp float;
precision highp int;

in vec3 p3;
out vec4 fragColor;
#define gl_FragColor fragColor

uniform float t;
uniform vec2 u_resolution;

uniform sampler2D u_freq_fast;
uniform sampler2D u_freq_med;
uniform sampler2D u_freq_slow;

uniform float gHue;
uniform float gSat;
uniform float gVal;

vec4 gColor;

const float PI = asin(1.0) * 2.;

float fsf(float at) {
  return texture(u_freq_fast, vec2(at, 0))[0];
}

float sf(float at) {
  return texture(u_freq_med, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture(u_freq_slow, vec2(at, 0))[0];
}

/*
vec4 texfit(Texture t, vec2 texp) {
  texp -= 0.5;
  texp /= vec2(t.aspect, 1.0);
  texp += 0.5;
  if (any(lessThan(texp, vec2(0.0))) || any(greaterThan(texp, vec2(1.0))))
    return vec4(0.0);
  return texture2D(t.tex, texp);
}

vec4 texfill(Texture t, vec2 texp) {
  texp -= 0.5;
  if (aspect > t.aspect)
    texp /= vec2(1., aspect/t.aspect);
  else if (aspect < t.aspect)
    texp *= vec2(aspect/t.aspect, 1.);
  texp += 0.5;
  if (any(lessThan(texp, vec2(0.0))) || any(greaterThan(texp, vec2(1.0))))
    return vec4(0.0);
  return texture2D(t.tex, texp);
}
*/

#if 0
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

mat4 transpose(in highp mat4 inMatrix) {
    highp vec4 i0 = inMatrix[0];
    highp vec4 i1 = inMatrix[1];
    highp vec4 i2 = inMatrix[2];
    highp vec4 i3 = inMatrix[3];

    highp mat4 outMatrix = mat4(
                 vec4(i0.x, i1.x, i2.x, i3.x),
                 vec4(i0.y, i1.y, i2.y, i3.y),
                 vec4(i0.z, i1.z, i2.z, i3.z),
                 vec4(i0.w, i1.w, i2.w, i3.w)
                 );

    return outMatrix;
}
#endif

const mat4 kIdentityTransform = mat4(
  1.0, 0.0, 0.0, 0.0,
  0.0, 1.0, 0.0, 0.0,
  0.0, 0.0, 1.0, 0.0,
  0.0, 0.0, 0.0, 1.0
);

mat4 scale(float x, float y, float z) {
  return mat4(
    x, 0.0, 0.0, 0.0,
    0.0, y, 0.0, 0.0,
    0.0, 0.0, z, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rotX(float angle) {
  return mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, cos(angle), -sin(angle), 0.0,
    0.0, sin(angle), cos(angle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rotY(float angle) {
  return mat4(
    cos(angle), 0.0, sin(angle), 0.0,
    0.0, 1.0, 0.0, 0.0,
    -sin(angle), 0.0, cos(angle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rotZ(float angle) {
  return mat4(
    cos(angle), -sin(angle), 0.0, 0.0,
    sin(angle), cos(angle), 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rot(float x, float y, float z) {
  return mat4(
    cos(y) * cos(z), cos(y) * sin(z), -sin(y), 0.0,
    sin(x) * sin(y) * cos(z) - cos(x) * sin(z), sin(x) * sin(y) * sin(z) + cos(x) * cos(z), sin(x) * cos(y), 0,
    cos(x) * sin(y) * cos(z) + sin(x) * sin(z), cos(x) * sin(y) * sin(z) - sin(x) * cos(z), cos(x) * cos(y), 0,
    0, 0, 0, 1
  );
}

mat4 translate(float x, float y, float z) {
  return mat4(
    1.0, 0.0, 0.0, x,
    0.0, 1.0, 0.0, y,
    0.0, 0.0, 1.0, z,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 translateX(float x) {
  return translate(x, 0.0, 0.0);
}

mat4 translateY(float y) {
  return translate(0.0, y, 0.0);
}

mat4 translateZ(float z) {
  return translate(0.0, 0.0, z);
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

vec3 transform(mat4 t, vec3 p) {
  vec4 p4 = transpose(t) * vec4(p, 1.0);
  return p4.xyz / p4.w;
}

float smod(float x, float by, float fade) {
  return mod(x, by) - max(0.0, fade - by + mod(x, by)) / fade;
}

float balmod(float what, float by) {
  return mod(what + by / 2., by) - by / 2.;
}

float stepmod(float what, float by) {
  return what - balmod(what, by);
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

vec4 mulHsv(vec4 c, vec3 hsv) {
  return vec4(hsv2rgb(rgb2hsv(c.rgb) * hsv), c.a);
}

vec4 addHsv(vec4 c, vec3 add) {
  vec3 hsv = rgb2hsv(c.rgb) + add;
  // hsv[0] += add[0];
  // hsv[1] = min(1., hsv[1] + add[1]);
  // hsv[2] += add[2];
  return vec4(hsv2rgb(hsv), c.a);
}

vec4 hsv(float h, float s, float v) {
  return vec4(hsv2rgb(vec3(h, s, v)), 1.);
}

float min3(vec3 x) {
  return min(x[0], min(x[1], x[2]));
}

float max3(vec3 x) {
  return max(x[0], max(x[1], x[2]));
}

float dist2(vec2 a, vec2 b) {
  return pow(pow(a.x - b.x, 2.0) + pow(a.y - b.y, 2.0), 0.5);
}

// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d,0.0)) + min(max(d.x,max(d.y,d.z)),0.0);
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float sdTorus( vec3 p, vec2 t ) {
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float sdSphere(vec3 p, float r) {
  return length(p)-r;
}

float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); }

float opSmoothSubtraction( float d1, float d2, float k ) {
    float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    return mix( d2, -d1, h ) + k*h*(1.0-h); }

float opSmoothIntersection( float d1, float d2, float k ) {
    float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) + k*h*(1.0-h); }

float sdCross(vec3 p, vec2 l) {
  float da = sdBox(p.xy,l);
  float db = sdBox(p.yz,l);
  float dc = sdBox(p.zx,l);
  return min(da,min(db,dc));
}

float sdMengerSponge(vec3 p, vec3 b) {
  float d = sdBox(p, b);
  d = -min(-d, sdCross(p * 3., b.xy) / 3.);
  d = -min(-d, sdCross((mod(p * 3. + b, b * 2.) - b) / 3., b.xy / 9.));
  d = -min(-d, sdCross((mod(p * 9. + b, b * 2.) - b) / 9., b.xy / 27.));
  // d = -min(d, sdCross(mod(p + b, b * 2.) - b, b.xy / 9.));
  return d;
}

const mat3 edgeKernelV = mat3(
    1., -2., 1.,
    1., -2., 1.,
    1., -2., 1.);

const mat3 edgeKernelH = mat3(
    1., 1., 1.,
    -2., -2., -2.,
    1., 1., 1.);

const mat3 sharpenKernel = mat3(
    0., -1., 0.,
    -1., 5., -1.,
    0., -1., 0.);

float convolve(mat3 oo) {
  float o = 0.
    + oo[0][0]
    + oo[0][1]
    + oo[0][2]
    + oo[1][0]
    + oo[1][1]
    + oo[1][2]
    + oo[2][0]
    + oo[2][1]
    + oo[2][2]
    ;
  o /= 1.;
  return o;
}

vec3 convolve(mat3 oo[3], mat3 kernel) {
  return vec3(
      convolve(oo[0] * kernel),
      convolve(oo[1] * kernel),
      convolve(oo[2] * kernel));
}

mat3[3] getNeighborhood(sampler2D tex, vec2 uv, vec2 pxsize) {
  mat3 ret[3];
  for (int i = 0; i < 3; i++) {
    for (int j = 0; j <= 3; j++) {
      vec4 px = texture(tex, uv + vec2(
            float(i - 1) * (2./pxsize.x),
            float(j - 1) * (2./pxsize.y)
            ));
      ret[0][i][j] = px.r;
      ret[1][i][j] = px.g;
      ret[2][i][j] = px.b;
    }
  }
  return ret;
}

void commonInit() {
  gColor = hsv(gHue, gSat, gVal);
}
