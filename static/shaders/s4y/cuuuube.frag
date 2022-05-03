precision highp float;

varying vec3 p3;
uniform sampler2D u_freq_fast;
uniform sampler2D u_freq_med;
uniform sampler2D u_freq_slow;

uniform vec2 u_resolution;
uniform float t;

uniform float u_rot_x;
uniform float u_rot_y;
uniform float u_rot_z;
uniform float u_head_glow;
uniform float u_sea_hue;
uniform float u_sea_hue_amt;
uniform float u_mouth_decoration;
uniform float u_mouth_decoration_style;
uniform float u_mouth_sea;
uniform float u_bpm;
uniform float u_eye_decoration;
uniform float u_eye_shape;
float u_activity_min = 0.1;
float u_activity_max = 0.3;
uniform float u_bob_amount;

#include "/shaders/s4y/common.glsl"

const int kSteps = 60;
const float kEpsilon = 1./1024.;

float sf02;
float sf03;
float ssf01;
float ssf02;
float ssf03;

float activity;
float beat;
float aspect;
mat4 inv_proj_mat;

float fsf(float at) {
  return texture2D(u_freq_fast, vec2(at, 0))[0];
}

float sf(float at) {
  return texture2D(u_freq_med, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture2D(u_freq_slow, vec2(at, 0))[0];
}

vec3 applyTransform(mat4 t, vec3 p) {
  vec4 p4 = transpose(t) * vec4(p, 1.0);
  return p4.xyz / p4.w;
}

struct Hit {
  float dist;
  vec3 p;
};

Hit sd(vec3 p);

vec3 cloudNoise(vec3 p) {
  return sin(vec3(length(p.xy*sin(p.xz*24.)+123.), length(p.yx*sin(p.yz*42.)), length(p.xz*sin(p.yz*42.)))*.01);
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        sd(vec3(p.x + EPSILON, p.y, p.z)).dist - sd(vec3(p.x - EPSILON, p.y, p.z)).dist,
        sd(vec3(p.x, p.y + EPSILON, p.z)).dist - sd(vec3(p.x, p.y - EPSILON, p.z)).dist,
        sd(vec3(p.x, p.y, p.z  + EPSILON)).dist - sd(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}

float flower(vec3 p) {
  float angle = atan(p.y, p.x);
  float cdist = distance(p.xy * vec2(aspect, 1), vec2(0));
  float ret = 0.;
  for (int i = 0; i < 10; i++) {
    ret += angle + (cdist + sin(t*0.01)) * ret;
    ret *= 4.;
    ret = sin(ret)/3./2.+.5;
    ret *= -1.0+(cdist*1.);
    ret = sin(ret*PI*2.)/2.+.5;
    ret -= t * 0.05;
    ret = sin(ret*PI*2.)/2.+.5;
  }
  return ret * pow(clamp(1.-cdist+0.8,0.,1.),4.);
}

const float head_size = 0.235*2.;

float sdEar(vec3 p) {
  p *= -1.;
  float ra = 0.225;
  float rb = 0.02;
  float h = 0.01;
  p += vec3(-0.27 * 2.,0.135 * 3.7 ,0);
  p += vec3(0, p.x / 10., 0);
  p.z -= distance(p.xy, vec2(0)) * 0.1;
  vec2 d = vec2(length(p.xy * vec2(0.98, 1.06)) - ra * 2. + rb, abs(p.z) - h);
  return min(max(d.x, d.y), 0.) + length(max(vec2(0.), d)) - rb;

}

Hit sd(vec3 p) {
  p.z += 2.;
  p = transform(rotX(-0.2) * rotY(t * 0.1), p);
  p = transform(rotY(sf(p.y/2.+.5)*PI*2.), p);
  float dist = sdBox(p, vec3(0.1));
  return Hit(dist, p);
}

vec4 march(vec3 p) {
  float aspect = u_resolution.x/u_resolution.y;

  mat4 inv_proj_mat = inv_proj_mat
    * rotX(-u_rot_x)
    * rotY(-u_rot_y)
    * rotZ(-u_rot_z);

  vec3 dir = normalize(applyTransform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float dist = -1.;
  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = applyTransform(inv_proj_mat, p) + dir * dist;
    hit = sd(tp);
    surfaceDist = hit.dist;
    dist += surfaceDist;

    if (surfaceDist < kEpsilon)
      break;
    if (dist > 1e2)
      return vec4(0);
  }

  vec3 hitP = dir * dist + p;
  vec3 norm = estimateNormal(hitP*vec3(1, 1, -0.2));

  vec4 color = vec4(0, 0, 0, 1);
  color += vec4(1, 1, 1, 1) * clamp(dot(hitP, normalize(vec3(0, 1, -1))), 0., 1.);
  return clamp(color, 0., 1.);
}

vec4 bg(vec3 p) {
  return march(p);
}

// out vec4 fragColor;
#define fragColor gl_FragColor
void main() {
  sf02 = sf(0.2);
  sf03 = sf(0.3);
  ssf01 = ssf(0.1);
  ssf02 = ssf(0.2);
  ssf03 = ssf(0.3);
  activity = smoothstep(u_activity_min, u_activity_max, ssf(0.02));
  if (u_bpm > 0.)
    beat = t*(u_bpm/60.);
  aspect = u_resolution.x/u_resolution.y;
  inv_proj_mat = inverse(perspectiveProj(
    PI/1.5, aspect, 0.1, 10.0
  ));
  inv_proj_mat = inv_proj_mat;

  vec3 p = p3;

  float fl = flower(p);
  vec4 bgColor;// = vec4(hsv(fl/1.*0.2+0.6+(beat-mod(beat,1.)+(pow(mod(beat,1.),2.)))*0.05, ssf(fl/100.)*0.2, fl), 1.);//marchSea(p) * activity;
  bgColor = bg(p);
  // bgColor.rgb *= activity;
  fragColor = bgColor;
}
