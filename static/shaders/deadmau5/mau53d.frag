#version 300 es

precision highp float;

in vec3 p3;
uniform sampler2D u_freq_fast;
uniform sampler2D u_freq_med;
uniform sampler2D u_freq_slow;

uniform float u_head_rot_x;
uniform float u_head_rot_y;
uniform float u_head_rot_z;
uniform float u_head_glow;
uniform float u_sea_hue;
uniform float u_sea_hue_amt;
float u_mouth_decoration = 1.;
uniform float u_mouth_decoration_style;
uniform float u_mouth_sea;
float u_eye_decoration = 1.;
float u_eye_shape = 1.;
float u_activity_min = 5.;
float u_activity_max = 1.;
float u_bob_amount = 1.;

const float PI = asin(1.0) * 2.;

uniform vec2 u_resolution;
uniform float t;

float sf02;
float sf03;
float ssf01;
float ssf02;
float ssf03;

float fsf(float at) {
  return texture(u_freq_fast, vec2(at, 0))[0];
}

float sf(float at) {
  return texture(u_freq_med, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture(u_freq_slow, vec2(at, 0))[0];
}

vec3 hsv(float h, float s, float v) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(vec3(h) + K.xyz) * 6.0 - K.www);
    return v * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), s);
}

const mat4 kIdentityTransform = mat4(
  1.0, 0.0, 0.0, 0.0,
  0.0, 1.0, 0.0, 0.0,
  0.0, 0.0, 1.0, 0.0,
  0.0, 0.0, 0.0, 1.0
);


mat4 translate(float x, float y, float z) {
  return mat4(
    1.0, 0.0, 0.0, x,
    0.0, 1.0, 0.0, y,
    0.0, 0.0, 1.0, z,
    0.0, 0.0, 0.0, 1.0
  );
}

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

const int kSteps = 60;
const float kEpsilon = 1./1024.;

struct Hit {
  float dist;
  vec3 p;
  vec3 lEyePos;
  vec3 rEyePos;
  float headDist;
  float mouthDist;
  float earDist;
  float eyeDist;
};

Hit sd(vec3 p);

// https://www.shadertoy.com/view/Xsl3Dl
vec3 iqHash( vec3 p ) // replace this by something better
{
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float iqNoise( in vec3 p )
{
    vec3 i = floor( p );
    vec3 f = fract( p );
	
	vec3 u = f*f*(3.0-2.0*f);

    return mix( mix( mix( dot( iqHash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( iqHash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( iqHash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( iqHash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( iqHash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( iqHash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( iqHash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( iqHash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
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

// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdSphere(vec3 p, float r) {
  return max(0.0, distance(p, vec3(0.0)) - r);
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

float activity;
uniform float beat;
float beatStep;
float aspect;
mat4 inv_proj_mat;

Hit sd(vec3 p) {
  p.z += 2.;
  p.z *= -1.;
  p.y += 0.1;
  p.xy *= 1.2;// - pow(ssf01, 2.)*0.1;

  // p = (rotY(t) * vec4(p, 1)).xyz;
  p = (kIdentityTransform
      * rotX(-u_head_rot_x)
      * rotY(-u_head_rot_y + sin(beat/4.)*0.4*activity)
      * rotZ(-u_head_rot_z)
      * vec4(p, 1)).xyz;

  // p = (rotY(activity*sin(beat/8.*PI*2.)*0.2) * vec4(p, 1)).xyz;
  float bob = pow(ssf03, 1.)*activity*(1.-pow(sin(beat*PI*2.)/2.+.5, 2.)*2.-0.5);
  p = (rotX(bob*3.*u_bob_amount) * vec4(p, 1)).xyz;
  p.y -= bob * 0.3 * u_bob_amount;

  // float cray = pow(sin(beat/8.*PI)/2.+.5, 10.);
  // p.x += cray * sin(p.y*20.+t)*0.1 * pow(sin(t*1.)/2.+.5, 20.);
  // p = (rotY(cray * activity * .5 * PI) * vec4(p, 1)).xyz;

  Hit ret;

  // vec3 noiseP = p * 1. + iqNoise(vec3(p.xy, 0)*10.)*0.005;

  // head
  float sndShift = 0.;//mix(0., (activity*0.5*sf(abs(p.x/20.))*ssf(0.2)), 0.);
  ret.headDist = sdSphere(p, head_size);
  ret.headDist = max(ret.headDist, -(rotX(-0.065 + sndShift) * vec4(p, 1.)).y);
  ret.headDist = min(ret.headDist, max(sdSphere(p, head_size), (rotX(-1.35 + sndShift) * vec4(p, 1.)).y));
  // ret.headDist += sin(p.x*p.y*100. + t*1.) * 0.005 * sf(0.2);
  ret.dist = ret.headDist;

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

float dot(vec2 p, float yee) {
  return pow(clamp(distance(p, vec2(0.))-0.5, 0., 1.), 2.);
}

vec3 fdot(vec2 p, float yee) {
  float bri = dot(p.xy*10.-vec2(0,0.), yee);
  return hsv(bri * 1., .1, 1.-bri);
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
    // ret -= beatStep * 0.05;
    ret = sin(ret*PI*2.)/2.+.5;
  }
  return ret * pow(clamp(1.-cdist+0.8,0.,1.),4.);
}

vec4 cells(vec3 p) {
  vec3 c = vec3(0,0,0);
  c += 1.-fdot(mod((rotZ((-t*0.15)*0.29) * vec4(p,1)).xy+0.5 + 0.125, .25) - 0.125, 0.1);
  c += 1.-fdot(mod((rotZ((-t*0.55)*-0.23) * vec4(p,1)).xy+0.4 + 0.125, .25) - 0.125, 0.2);
  c += 1.-fdot(mod((rotZ((+t*0.15)*0.36) * vec4(p,1)).xy+0.6 + 0.125, .25) - 0.125, 0.3);
  c += 1.-fdot(mod((rotZ((-t*0.25)*-0.20) * vec4(p,1)).xy+0.3 + 0.125, .25) - 0.125, 0.05);
  c += 1.-fdot(mod((rotZ((-t*0.40)*0.39) * vec4(p,1)).xy+0.2 + 0.125, .25) - 0.125, 0.4);
  c = sin(c*PI*2.)/2.+.5;
  // c.rgb *= 0.1;
  return vec4(c,1);
}

struct SeaHit {
  float dist;
  vec3 p;
};

SeaHit seaSd(vec3 p) {
  p *= 2.;
  vec3 op = p;
  op.z += 1.;
  p.z -= t * 0.5 - 2e3;
  p.x += 2e4 + 0.5;
  p.y /= 2.;
	vec3 bb = cos(p*0.01*sin(p.y*.05) + sin(p.zyx) * 1. + iqNoise(p * 5.) * 0.2);
  // bb.y -= 0.01 * ssf(abs(op.x)/10.);

  return SeaHit(
      length(bb) - (1. + ssf01 * 0.05), p);
}

vec3 estimateSeaNormal(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        seaSd(vec3(p.x + EPSILON, p.y, p.z)).dist - seaSd(vec3(p.x - EPSILON, p.y, p.z)).dist,
        seaSd(vec3(p.x, p.y + EPSILON, p.z)).dist - seaSd(vec3(p.x, p.y - EPSILON, p.z)).dist,
        seaSd(vec3(p.x, p.y, p.z  + EPSILON)).dist - seaSd(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}


vec4 marchSea(vec3 p) {
  const int kSteps = 40;

  float aspect = u_resolution.x/u_resolution.y;

  mat4 inv_proj_mat = inv_proj_mat
    * rotX(-u_head_rot_x)
    * rotY(-u_head_rot_y + sin(beat/4.)*0.2)
    * rotZ(-u_head_rot_z);

  vec3 dir = normalize(applyTransform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float dist = -1.;
  SeaHit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = applyTransform(inv_proj_mat, p) + dir * dist;
    hit = seaSd(tp);
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
  color += vec4(hsv(u_sea_hue + sf02 * u_sea_hue_amt, 1. * (1.-sf(hitP.z)*0.5), .5 * sf(abs(mod((hit.p.x+10.0)/100., 1.)))) * dot(hitP, normalize(vec3(0, 1, -2))), 1.);
  color += vec4(0, 0, 1, 1) * clamp(dot(hitP, normalize(vec3(0, -1, 0))), 0., 1.);

  // vec4 greenZone = vec4(0,1,0,1) * ((5.-mod(abs(-dist+t), 10.))/10.);
  // color += clamp(greenZone, 0., 1.);

  return color;
}

vec4 bg(vec3 p) {
  return marchSea(p);
  float f = flower(p);
  return vec4(smoothstep(0.0, 0.1, f) * hsv(0.,1.,1.),1.);
}

vec4 headShine(vec3 p) {
  return cells(p/2.);
}

vec4 baseEyeColor(vec3 p) {
  float c = smoothstep(0.02, 0.021, mix(smoothstep(0.0699, 0.07, distance(p.xy, vec2(0.))), abs(p.y*fsf(abs(p.x)/2.)), u_eye_shape));
  return vec4(hsv(0., 0., c) * u_eye_decoration, 1);
}

vec4 eyeColor(vec3 p, vec3 norm) {
  return baseEyeColor(p);// - baseEyeColor(p+norm);
}

vec4 mouthDotz(vec3 p) {
  p.z -= .7;
  p.y -= 0.02;
  vec2 odotp = mod(vec2(atan(p.z, p.x), atan(p.z, p.y))/PI/2.,1.);
  vec2 dotp = mod(odotp*256.+0.5, 1.)-0.5;
  vec2 which = (odotp-(dotp/256.));
  which = floor(which*256.)/256.;
  float highlighted = 1.-step(sf((which.x/2.+.5)/2.),which.y-.2);
  float gone = iqHash(vec3(which*10.+(beat-mod(beat,1.)),0)).x;
  return step(gone, 0.8) * mix(vec4(0,0.5,0,1), vec4(1,1,1,1), highlighted) * (1.-smoothstep(0.3, 0.31, distance(dotp.xy, vec2(0))));
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

out vec4 fragColor;
void main() {
  sf02 = sf(0.2);
  sf03 = sf(0.3);
  ssf01 = ssf(0.1);
  ssf02 = ssf(0.2);
  ssf03 = ssf(0.3);

  activity = smoothstep(u_activity_min, u_activity_max, ssf(0.02));
  beatStep = beat-mod(beat,1.)+(1.-pow(1.-mod(beat,1.),4.));
  aspect = u_resolution.x/u_resolution.y;
  inv_proj_mat = inverse(perspectiveProj(
    PI/1.5, aspect, 0.1, 10.0
  ));
  inv_proj_mat = inv_proj_mat * activity + scale(1., 1., 1.) * (1.-activity);
  mat4 inv_proj_mat = scale(aspect, 1., 1.);

  vec3 p = p3;
  vec3 dir = normalize(mix(applyTransform(inv_proj_mat, p), vec3(0, 0, -1), 1.));
  float aspect = u_resolution.x/u_resolution.y;
  // p.x *= aspect;
  // vec3 dir = vec3(0, 0, 1);
  float surfDist = 0.;
  float dist = 0.;
  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = applyTransform(inv_proj_mat, p) + dir * dist;
    // vec3 tp = p + dir * dist;
    hit = sd(tp);
    surfDist = hit.dist;
    dist += surfDist;

    if (dist > 1e1)
      break;
  }

  // if (dist > 1e2)
  //   discard;

  float fl = flower(p);
  vec4 bgColor = vec4(hsv(fl/1.*0.2+0.6+(beat-mod(beat,1.)+(pow(mod(beat,1.),2.)))*0.05, ssf(fl/100.)*0.2, fl), 1.);//marchSea(p) * activity;
  bgColor = mix(bgColor, bgColor * fsf(0.3) + bg(p) * 0.5, ssf03);
  bgColor.rgb *= activity;

  vec3 hitP = mix(applyTransform(inv_proj_mat, p), p * vec3(aspect,1,1), 1.-activity) + dir * dist;
  vec3 norm = estimateNormal(hitP);
  // float edginess = float(totalSteps) / float(kSteps);

  // TODO: cells() but without audio reactivity

  // vec4 baseColor = vec4(1,0,0,1);//mix(pow(cells(p*2.), vec4(10.)), vec4(1,0,0,1), (1.-activity));
  // baseColor *= p.x  -10.5;
  // vec4 headLight = cells(p) * smoothstep(0.3, 0.0, abs(hit.p.z-0.2));
  // vec4 mouthColor = clamp(mouthColor(p, hit.p, norm), 0., 1.);
  // headLight += baseColor;// * pow(clamp(dot(normalize(vec3(0., -1., -1.)), norm), 0., 1.), 1.);
  // headLight += bg(norm*1.+p*vec3(1,1,-1)) * pow(clamp(dot(normalize(vec3(cos(beat*PI/2.+PI), sin(beat*PI+PI), -0.2)), norm), 0., 1.), 2.);
  vec4 baseColor = vec4(1.-activity,0,0,1);

  vec4 headColor = baseColor;
  if (abs(hit.mouthDist - hit.headDist) > 0.)
    headColor = mix(headColor, clamp(mouthColor(p, hit.p, norm), 0., 1.) * vec4(vec3(activity), 1.), smoothstep(0.0, 0.01, abs(hit.mouthDist - hit.headDist)));
  headColor = mix(headColor, baseColor, smoothstep(0.1, 0., hit.earDist));
  headColor = mix(headColor, eyeColor(min(hit.lEyePos, hit.rEyePos), norm), smoothstep(0.001, 0., hit.eyeDist));

  // headColor = mix(vec4(0,0,0,1), mouthColor(hit.p, norm), smoothstep(0.001, 0., hit.mouthDist) * activity);
  // headColor = mix(headColor, vec4(0,0,0,1), smoothstep(0.001, 0., hit.headDist));

  headColor.a = 1.;
  fragColor = headColor;

  // fragColor *= mod(edginess, .1)*10.;

  float amazHead = smoothstep(0.21, 0.2, max(hit.headDist, hit.earDist));
  float regHead = smoothstep(0.01, 0.0, min(hit.headDist, hit.earDist));
  fragColor += activity * amazHead * vec4(vec3(.3), 1) * clamp(pow(1.-norm.z + 0.1, 1.), 0., 1.);//pow(clamp(dot(norm, normalize(vec3(-2,1,-1.9)))+.9, 0., 1.), 7.);
  fragColor += u_head_glow * activity * regHead * vec4(hsv(.65 + sf(abs(p.x)/2.)*0.5, 1., 1.), 1) * clamp(pow(1.-norm.z + 0.1, 8.), 0., 1.) * pow(clamp(distance(hit.p.xy, vec2(0))+0.5,0.,1.), 10.);
  // fragColor += activity * headness * vec4(vec3(.3), 1) * smoothstep(0.1, 0.5, clamp(pow(1.-norm.z + 0.1, 1.), 0., 1.));//pow(clamp(dot(norm, normalize(vec3(2,1,-1.9)))+.9, 0., 1.), 7.);
  // fragColor = floor(fragColor*3.)/3.;
  //
  // fragColor.rgb = 1.-fragColor.rgb;

  fragColor = mix(bgColor, fragColor, smoothstep(kEpsilon * (32. + 40. * (1.-activity)), 0., surfDist));

  // fragColor *= step(mod(t, 1.), .5);
}

