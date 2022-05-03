#version 300 es

precision highp float;

uniform sampler2D u_freq;
uniform sampler2D u_smooth_freq;

in vec3 p3;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float t;
uniform float u_fade;

const int kSteps = 100;
const float kEpsilon = 1./1024.;

const float PI = asin(1.0) * 2.;

float sf(float at) {
  return texture(u_freq, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture(u_smooth_freq, vec2(at, 0))[0];
}

float fsin(float x){
    float w = fwidth(x);
    return sin(x)*smoothstep(PI*2., 0.0, w); 
}

float fcos(float x){
    float w = fwidth(x);
    return cos(x)*smoothstep(PI*2., 0.0, w); 
}

struct Hit {
  float dist;
  vec3 boxP;
};

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

mat4 perspectiveProj(float fov, float aspect, float near, float far) {
  float f = 1.0 / tan(fov/2.0);
  return mat4(
    f / aspect, 0.0, 0.0, 0.0,
    0.0, f, 0.0, 0.0,
    0.0, 0.0, (far + near) / (far - near), 1.0,
    0.0, 0.0, (2.0 * far * near) / (near - far), 0.0
  );
}

vec3 applyTransform(mat4 t, vec3 p) {
  vec4 p4 = transpose(t) * vec4(p, 1.0);
  return p4.xyz / p4.w;
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

float sdSphere(vec3 p, float r) {
  return max(0.0, distance(p, vec3(0.0)) - r);
}

Hit sceneSDFa(vec3 p) {
  p.z -= t;

	// p = cos(p*0.01*sin(distance(p.xy, vec2(0))*.05) + sin(p.zyx));
	vec3 aa = vec3(cos(p.xz*0.01*sin(p.y*.5) - sin(p.zx)) + 0.5, 0);
	vec3 bb = cos(p*0.01*sin(p.y*.05) + sin(p.zyx));
	// vec2 aa = cos(p.xz*0.01*sin(p.y*.5) - sin(p.zx));

  aa = mix(aa, bb, sin(t)*1.5+0.5);

  return Hit(length(aa) - 1., p);
}

Hit sceneSDFb(vec3 p) {
  vec3 op = p;
  op.z += 1.;
  // float which = p.x/PI*6.;
  // which -= mod(which+PI*1., PI*2.)-PI*75;
  p.z -= t * 0.5 - 2e3;
  // p.z += which * sin(t*10.);


  p.x += 2e4 + 0.5;
  // p.y = pow(p.y, 3.0);
  p.y /= 2.;
  // p.z += sin(p.x+t)*1.8*ssf(sin(p.z));
	vec3 bb = cos(p*0.01*sin(p.y*.05) + sin(p.zyx) * 1.);
  bb.y -= 0.01 * ssf(abs(op.x)/10.);

  return Hit(
      length(bb) - (1. + ssf(0.1) * 0.05), p);
}

vec3 estimateNormalA(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        sceneSDFa(vec3(p.x + EPSILON, p.y, p.z)).dist - sceneSDFa(vec3(p.x - EPSILON, p.y, p.z)).dist,
        sceneSDFa(vec3(p.x, p.y + EPSILON, p.z)).dist - sceneSDFa(vec3(p.x, p.y - EPSILON, p.z)).dist,
        sceneSDFa(vec3(p.x, p.y, p.z  + EPSILON)).dist - sceneSDFa(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}

vec3 estimateNormalB(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        sceneSDFb(vec3(p.x + EPSILON, p.y, p.z)).dist - sceneSDFb(vec3(p.x - EPSILON, p.y, p.z)).dist,
        sceneSDFb(vec3(p.x, p.y + EPSILON, p.z)).dist - sceneSDFb(vec3(p.x, p.y - EPSILON, p.z)).dist,
        sceneSDFb(vec3(p.x, p.y, p.z  + EPSILON)).dist - sceneSDFb(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}

float aspect;

vec4 mainA() {
  mat4 inv_proj_mat = inverse(perspectiveProj(
    PI/1.5, aspect, 0.1, 10.0
  ));

  vec3 p = p3 * vec3(u_resolution.x/u_resolution.y, 1, 1);
  vec3 dir = normalize(applyTransform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float dist = 0.;
  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = applyTransform(inv_proj_mat, p) + dir * dist;
    hit = sceneSDFa(tp);
    surfaceDist = hit.dist;
    dist += surfaceDist;

    if (surfaceDist < kEpsilon)
      break;
  }

  if (dist > 1e2) {
    discard;
  }

  vec3 hitP = dir * dist + p;
  vec3 norm = estimateNormalA(hitP*vec3(1, 1, -0.2));

  vec4 color = vec4(0, 0, 0, 1);
  color += vec4(0.05, 0, 0, 1) * dot(hitP, normalize(vec3(0, 1, -2)));
  color += vec4(0, 0, 1, 1) * dot(hitP, normalize(vec3(0, -1, 0)));
  return color;

}

vec4 mainB() {
  float aspect = 1.;//u_resolution.x/u_resolution.y;
  mat4 inv_proj_mat = inverse(perspectiveProj(
    PI/1.5, aspect, 0.1, 10.0
  ));

  vec3 p = p3 * vec3(u_resolution.x/u_resolution.y, 1, 1);
  vec3 dir = normalize(applyTransform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float dist = -1.;
  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = applyTransform(inv_proj_mat, p) + dir * dist;
    hit = sceneSDFb(tp);
    surfaceDist = hit.dist;
    dist += surfaceDist;

    if (surfaceDist < kEpsilon)
      break;
  }

  if (dist > 1e2) {
    discard;
  }

  vec3 hitP = dir * dist + p;
  vec3 norm = estimateNormalB(hitP*vec3(1, 1, -0.2));

  vec4 color = vec4(0, 0, 0, 1);
  color += hsv(0., 1. * (1.-sf(hitP.z)*0.5), .05) * dot(hitP, normalize(vec3(0, 1, -2)));
  color += vec4(0, 0, 1, 1) * clamp(dot(hitP, normalize(vec3(0, -1, 0))), 0., 1.);

  // vec4 greenZone = vec4(0,1,0,1) * ((5.-mod(abs(-dist+t), 10.))/10.);
  // color += clamp(greenZone, 0., 1.);

  return color;

}

void main() {
  aspect = u_resolution.x/u_resolution.y;
  fragColor = mainB();
  // gl_FragColor *= u_fade;
}
