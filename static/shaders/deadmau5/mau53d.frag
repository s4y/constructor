#include "/shaders/s4y/common.glsl"

uniform float u_rot_x;
uniform float u_rot_y;
uniform float u_rot_z;
float u_head_glow = 1.;
uniform float u_sea_hue;
uniform float u_sea_hue_amt;
uniform float u_mouth_decoration;
uniform float u_mouth_decoration_style;
float u_mouth_sea = 1.;
uniform float u_bpm;
float u_eye_decoration = 1.;
float u_eye_shape = 1.;
float u_activity_min =0.4;
float u_activity_max = 0.5;
float u_bob_amount = 1.;

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

vec3 applyTransform(mat4 t, vec3 p) {
  vec4 p4 = transpose(t) * vec4(p, 1.0);
  return p4.xyz / p4.w;
}

struct HeadHit {
  float dist;
  vec3 p;
  vec3 lEyePos;
  vec3 rEyePos;
  float headDist;
  float mouthDist;
  float earDist;
  float eyeDist;
};

HeadHit sdHead(vec3 p);

vec3 cloudNoise(vec3 p) {
  return sin(vec3(length(p.xy*sin(p.xz*24.)+123.), length(p.yx*sin(p.yz*42.)), length(p.xz*sin(p.yz*42.)))*.01);
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        sdHead(vec3(p.x + EPSILON, p.y, p.z)).dist - sdHead(vec3(p.x - EPSILON, p.y, p.z)).dist,
        sdHead(vec3(p.x, p.y + EPSILON, p.z)).dist - sdHead(vec3(p.x, p.y - EPSILON, p.z)).dist,
        sdHead(vec3(p.x, p.y, p.z  + EPSILON)).dist - sdHead(vec3(p.x, p.y, p.z - EPSILON)).dist
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

float sdEye(vec3 p, out vec3 l_eye_pos) {
  l_eye_pos = (rotX(.55) * rotY(.75) * vec4(p, 1)).xyz;
  l_eye_pos += vec3(0, 0, head_size - 0.05);
  l_eye_pos.z /= 0.86;
  return sdSphere(l_eye_pos, 0.151);
}

HeadHit sdHead(vec3 p) {
  p.z += 2.;
  p.z *= -1.;
  p.y += 0.1;
  p.xy *= 1. - pow(ssf01, 2.)*0.1;

  p = ( rotX(-u_rot_x)
      * rotY(-u_rot_y)
      * rotZ(-u_rot_z)
      * vec4(p, 1)).xyz;

  float bob = pow(ssf03 - 0.1, 4.)*activity*(1.-pow(sin(beat*PI*2.)/2.+.5, 2.)*2.-0.5);
  p = (rotX(bob*3.*u_bob_amount) * vec4(p, 1)).xyz;
  p.y -= bob * 0.3 * u_bob_amount;

  HeadHit ret;

  // head
  float sndShift = 0.;//mix(0., (activity*0.5*sf(abs(p.x/20.))*ssf(0.2)), 0.);
  ret.headDist = sdSphere(p, head_size);
  ret.headDist = max(ret.headDist, -(rotX(-0.065 + sndShift) * vec4(p, 1.)).y);
  ret.headDist = min(ret.headDist, max(sdSphere(p, head_size), (rotX(-1.35 + sndShift) * vec4(p, 1.)).y));
  ret.dist = ret.headDist;

  // mouth
  ret.mouthDist = min(ret.dist, sdSphere(p, head_size - 0.06));

  // ears
  ret.earDist = min(sdEar(p), sdEar(p * vec3(-1,1,1)));

  // eyes
  ret.eyeDist = min(sdEye(p, ret.lEyePos), sdEye(p * vec3(-1,1,1), ret.rEyePos));

  ret.dist = min(ret.dist, ret.mouthDist);
  ret.dist = min(ret.dist, ret.earDist);
  ret.dist = min(ret.dist, ret.eyeDist);
  ret.p = p;
  return ret;
}

struct SeaHit {
  float dist;
  vec3 p;
};

SeaHit sdSea(vec3 p) {
  p *= 2.;
  vec3 op = p;
  op.z += 1.;
  p.z -= t * 0.5 - 2e3;
  p.x += 2e4 + 0.5;
  p.y /= 2.;
	vec3 bb = cos(p*0.01*sin(p.y*.05) + sin(p.zyx) * 1. + cloudNoise(p / 10.) * 0.1);

  return SeaHit(
      length(bb) - (1. + ssf01 * 0.05), p);
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
  float aspect = u_resolution.x/u_resolution.y;

  mat4 inv_proj_mat = inv_proj_mat
    * rotX(-u_rot_x)
    * rotY(-u_rot_y)
    * rotZ(-u_rot_z);

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
  color += hsv(u_sea_hue + sf02 * u_sea_hue_amt, 1. * (1.-sf(hitP.z)*0.5), .5 * sf(abs(mod((hit.p.x+10.0)/100., 1.)))) * dot(hitP, normalize(vec3(0, 1, -2)));
  color += vec4(0, 0, 1, 1) * clamp(dot(hitP, normalize(vec3(0, -1, 0))), 0., 1.);
  return color;
}

vec4 bg(vec3 p) {
  return marchSea(p);
  float f = flower(p);
  return smoothstep(0.0, 0.1, f) * hsv(0.,1.,1.);
}

vec4 baseEyeColor(vec3 p) {
  float c = smoothstep(0.02, 0.021, mix(smoothstep(0.0699, 0.07, distance(p.xy, vec2(0.))), abs(p.y*fsf(abs(p.x)/2.)), u_eye_shape));
  return hsv(0., 0., c) * u_eye_decoration;
}

vec4 eyeColor(vec3 p, vec3 norm) {
  return baseEyeColor(p);
}

vec4 mouthDotz(vec3 p) {
  p.z -= .7;
  p.y -= 0.02;
  vec2 odotp = mod(vec2(atan(p.z, p.x), atan(p.z, p.y))/PI/2.,1.);
  vec2 dotp = mod(odotp*256.+0.5, 1.)-0.5;
  vec2 which = (odotp-(dotp/256.));
  which = floor(which*256.)/256.;
  float highlighted = 1.-step(sf((which.x/2.+.5)/2.),which.y-.2);
  float gone = mod((which.x*5.*(which.y+100.)*80.)*1.+(beat-mod(beat,1.))*0.9, 1.);
  return step(gone, 0.9) * mix(vec4(0,0.5,0,1), vec4(1,1,1,1), highlighted) * (1.-smoothstep(0.3, 0.31, distance(dotp.xy, vec2(0))));
}

vec4 mouthLinez(vec3 p) {
  p.y += 0.18;
  float bri = mod((((p.x*(p.y+1.))-t*0.01))*10.+0.5,1.) - 0.5;
  bri = step(abs(0.5-bri), 0.5 * pow(max(sf03-0.0,0.)/0.9, 4.));
  return vec4(vec3(bri,bri*0.7,bri*0.7),1);
}

vec4 mouthColor(vec3 p, vec3 hitP, vec3 norm) {
  vec4 decoration = mix(mouthDotz(hitP), mouthLinez(hitP), u_mouth_decoration_style);
  vec4 mouthLight = marchSea(norm+mix(p, hitP, 0.5)*1.5+vec3(0,0.6,1)) * pow(clamp(dot(normalize(vec3(0, 0.5, 1.)), norm), 0., 1.), 1.);
  return decoration * u_mouth_decoration + mouthLight * u_mouth_sea;
}

vec4 marchHead(vec3 p) {
  mat4 inv_proj_mat = scale(aspect, 1., 1.);

  vec3 dir = normalize(mix(applyTransform(inv_proj_mat, p), vec3(0, 0, -1), 1.));
  float aspect = u_resolution.x/u_resolution.y;
  float surfDist = 0.;
  float dist = 0.;
  HeadHit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = applyTransform(inv_proj_mat, p) + dir * dist;
    hit = sdHead(tp);
    surfDist = hit.dist;
    dist += surfDist;

    if (dist > 1e1)
      break;
  }

  float fl = flower(p);
  vec4 bgColor = hsv(fl/1.*0.2+0.6+(beat-mod(beat,1.)+(pow(mod(beat,1.),2.)))*0.05, ssf(fl/100.)*0.2, fl);//marchSea(p) * activity;
  bgColor = mix(bgColor, bgColor * fsf(0.3) + bg(p) * 0.5, ssf03);
  bgColor.rgb *= activity;

  vec3 hitP = mix(applyTransform(inv_proj_mat, p), p * vec3(aspect,1,1), 1.-activity) + dir * dist;
  vec3 norm = estimateNormal(hitP);

  vec4 baseColor = vec4(1.-activity,0,0,1);
  vec4 headColor = baseColor;
  if (abs(hit.mouthDist - hit.headDist) > 0.)
    headColor = mix(headColor, clamp(mouthColor(p, hit.p, norm), 0., 1.) * vec4(vec3(activity), 1.), smoothstep(0.0, 0.01, abs(hit.mouthDist - hit.headDist)));
  headColor = mix(headColor, baseColor, smoothstep(0.1, 0., hit.earDist));
  headColor = mix(headColor, eyeColor(min(hit.lEyePos, hit.rEyePos), norm), smoothstep(0.001, 0., hit.eyeDist));
  headColor.a = 1.;

  float amazHead = smoothstep(0.21, 0.2, max(hit.headDist, hit.earDist));
  float regHead = smoothstep(0.01, 0.0, min(hit.headDist, hit.earDist));
  headColor += activity * amazHead * vec4(vec3(.3), 1) * clamp(pow(1.-norm.z + 0.1, 1.), 0., 1.);//pow(clamp(dot(norm, normalize(vec3(-2,1,-1.9)))+.9, 0., 1.), 7.);
  headColor += u_head_glow * activity * regHead * hsv(.65 + sf(abs(p.x)/2.)*0.5, 1., 1.) * clamp(pow(1.-norm.z + 0.1, 8.), 0., 1.) * pow(clamp(distance(hit.p.xy, vec2(0))+0.5,0.,1.), 10.);
  headColor.a = 1.-clamp(smoothstep(0., kEpsilon * (32. + 40. * (1.-activity)), surfDist), 0., 1.);
  return headColor;
}

// out vec4 fragColor;
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
  inv_proj_mat = inv_proj_mat * activity + scale(1., 1., 1.) * (1.-activity);

  vec3 p = p3;

  float fl = flower(p);
  vec4 bgColor = hsv(fl/1.*0.2+0.6+(beat-mod(beat,1.)+(pow(mod(beat,1.),2.)))*0.05, ssf(fl/100.)*0.2, fl);//marchSea(p) * activity;
  bgColor = mix(bgColor, bgColor * fsf(0.3) + bg(p) * 0.5, ssf03);
  bgColor.rgb *= activity;

  vec4 headColor = marchHead(p);

  gl_FragColor = bgColor * (1.-headColor.a) + headColor * headColor.a;
}
