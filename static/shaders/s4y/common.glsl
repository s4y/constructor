const float PI = asin(1.0) * 2.;

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
  vec3 hsv = rgb2hsv(c.rgb);
  hsv[0] += add[0];
  hsv[1] = min(hsv[1], hsv[1] + add[1]);
  hsv[2] += add[2];
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

