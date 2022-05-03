#include "/shaders/s4y/common.glsl"

precision highp float;

uniform float u_rot_x;
uniform float u_rot_y;
uniform float u_rot_z;
uniform float u_head_glow;
float u_sea_hue = 0.1;
float u_sea_hue_amt = -0.2;
uniform float u_mouth_decoration;
uniform float u_mouth_decoration_style;
uniform float u_mouth_sea;
uniform float u_bpm;
uniform float u_eye_decoration;
uniform float u_eye_shape;
float u_activity_min = 0.1;
float u_activity_max = 0.3;
uniform float u_bob_amount;
uniform float sndGo;
uniform mat4 inv_camera_mat;
uniform mat4 inv_proj_mat;

const int kSteps = 120;
const float kEpsilon = 1./1024.;

float sf02;
float sf03;
float ssf01;
float ssf02;
float ssf03;

float activity;
float beat;
float aspect;

vec3 applyTransform(mat4 t, vec3 p) {
  vec4 p4 = transpose(t) * vec4(p, 1.0);
  return p4.xyz / p4.w;
}

struct SeaHit {
  float dist;
  vec3 p;
};

SeaHit sdSea(vec3 p) {
  float which = p.z - mod(p.z, PI);
  // p.x += cloudNoise((p - mod(p, PI*4.))).x * .4;

  p *= 1.;
  // p += tan(p/2.) * 1.01;
  p.z -= t * 10.;

  p = transform(rotZ(p.z * 0.2), p);

  // p.x += 2e1 + 0.5 + t * 0.1;
  // p.y /= 2.;
  p .y -= 1.5;
  p.xy -= mod(p.xy, .5);
	vec3 bb = cos(p*0.5*sin(p.y*5.)) - 0.2 * ssf(0.1);

  return SeaHit(
      (length(bb) - (1. + ssf01 * 0.05)) / 1., p);
}

vec3 estimateSeaNormal(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        sdSea(vec3(p.x + EPSILON, p.y, p.z)).dist - sdSea(vec3(p.x - EPSILON, p.y, p.z)).dist,
        sdSea(vec3(p.x, p.y + EPSILON, p.z)).dist - sdSea(vec3(p.x, p.y - EPSILON, p.z)).dist,
        sdSea(vec3(p.x, p.y, p.z  + EPSILON)).dist - sdSea(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}

vec4 marchSea(vec3 p) {

  vec3 dir = normalize(applyTransform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float dist = -1.;
  SeaHit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = applyTransform(inv_proj_mat, p) + dir * dist;
    hit = sdSea(tp);
    surfaceDist = hit.dist;
    dist += surfaceDist;

    if (surfaceDist < kEpsilon)
      break;
    if (dist > 1e2)
      return vec4(0);
  }

  vec3 hitP = dir * dist + p;
  vec3 norm = estimateSeaNormal(hitP*vec3(1, 1, -0.2));

  vec4 color = vec4(0, 0, 0, 1);
  color += hsv(u_sea_hue  + hitP.z * 0.0 + sf(mod(abs(length(hitP)) / 100., 1.)) * u_sea_hue_amt, (1.-sf(hitP.z)*0.0), .5 * (fsf(abs(-mod((abs(hit.p.y))/100., 1.)))) * 0.0 + .1) * dot(hitP, normalize(vec3(0, 1, -2)));
  // color += vec4(0, 0, 1, 1) * clamp(dot(hitP, normalize(vec3(0, -1, 0))), 0., 1.);
  return color;
}

vec4 bg(vec3 p) {
  return marchSea(p);
}

void main() {
  sf02 = fsf(0.2);
  sf03 = sf(0.3);
  ssf01 = ssf(0.1);
  ssf02 = ssf(0.2);
  ssf03 = ssf(0.3);
  activity = 1.;//smoothstep(u_activity_min, u_activity_max, ssf(0.02));
  if (u_bpm > 0.)
    beat = t*(u_bpm/60.);
  aspect = u_resolution.x/u_resolution.y;

  vec3 p = p3;

  // float fl = flower(p);
  vec4 bgColor;// = vec4(hsv(fl/1.*0.2+0.6+(beat-mod(beat,1.)+(pow(mod(beat,1.),2.)))*0.05, ssf(fl/100.)*0.2, fl), 1.);//marchSea(p) * activity;
  bgColor = bg(p);
  bgColor.rgb *= activity;
  gl_FragColor = bgColor;
}
