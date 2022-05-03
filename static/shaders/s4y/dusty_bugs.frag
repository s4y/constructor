#include "./common.glsl"

const int kSteps = 80;
const float kEpsilon = 1./1024.;

uniform sampler2D last;

mat4 inv_proj_mat;
float aspect;

struct BallHit {
  float dist;
  vec3 p;
  vec4 debugColor;
};

BallHit sdBall(vec3 p) {
  p.z += 1.;

  vec3 op = p;

  p = transform(rotX(0.1 * sin(t * .3)) * rotY((t*1.)), p);
  // p = transform(rotX(sin(t) * 0.1) * rotY(t*0.1), p);

  // float modAmt = 1.;
  // if (op.z < -1.5)
  //   p = mod(p + modAmt, modAmt * 2.) - modAmt;


  // if (p.z < -1.)
  //   p = mod(p + 5., 2.) - 1.;

  // p = transform(rotY((t*1.5) * 0.3) * rotX(0.5 * (t / 2.)), p);
  // p.z -= t * 10.;
  // p = transform(rotZ(-angle+mod(angle, PI/8.)), p);
  // float angle = atan(p.y, p.x);
  // p.x -= mod(p.x, 2.);// * (1.-step(sin(p.z), 0.8));
  // p = transform(rotY(t), p);
  // p /= 8.;
  // float dist = 1.0-distance(p.xy, vec2(0.));
  // float t = t * 10.;
  // p.y -= 1.2;

  {
  float angle = atan(p.x, p.z);

  angle -= pow(sf(sin(p.y / 3. + p.z / 3.)/2.+.5) + 0.1, 2.);
  p = transform(rotY(-angle), p);
  }

  {
  vec2 angle = vec2(atan(p.x, p.z), atan(p.y, p.z));
  // angle += pow(sf(sin(p.x / 10. + p.z / 10.)/2.+.5) + 0.1, 2.);
  angle += sf((p.y/2.+.5)/10.) * 0.9;

  p = transform(rot(-angle.y, 0., 0.), p);
  }

  p.z -= .2;

  float dist = p.z / 3.;
  // dist = sdBox(p, vec3(.2));
  return BallHit(dist/1., p, hsv(0., 1., 1.));
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        sdBall(vec3(p.x + kEpsilon, p.y, p.z)).dist - sdBall(vec3(p.x - kEpsilon, p.y, p.z)).dist,
        sdBall(vec3(p.x, p.y + kEpsilon, p.z)).dist - sdBall(vec3(p.x, p.y - kEpsilon, p.z)).dist,
        sdBall(vec3(p.x, p.y, p.z  + kEpsilon)).dist - sdBall(vec3(p.x, p.y, p.z - kEpsilon)).dist
    ));
}

vec4 bg(vec2 p) {
  float bri = sin(p.x * 20. + p.y * 30.);
  bri *= sin(p.y*7.);
  return vec4(clamp(vec3(bri/2.+.5), 0., 1.), 1.);
}

vec4 marchBall(vec3 p) {
  vec3 dir = normalize(transform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float dist = -1.;
  BallHit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = transform(inv_proj_mat, p) + dir * dist;
    hit = sdBall(tp);
    surfaceDist = hit.dist;
    dist += surfaceDist;

    if (surfaceDist < kEpsilon)
      break;
    if (dist > 1e2)
      return vec4(0);
  }

  vec3 hitP = dir * dist + p;
  vec3 norm = estimateNormal(hitP);

  vec4 light = vec4(0);
  // light += hsv(0./3., 0., .5) * pow(clamp(dot(normalize(vec3(-0.5,1,-0.1)), normalize(norm + hitP)), 0., 1.), 1.);
  // light += hsv(0./3., 0., .5) * pow(clamp(dot(normalize(vec3(-0.5,1,-0.1)), normalize(norm + hitP)), 0., 1.), 1.);
  // /light *= 1. - (length(fwidth(norm)) * 10.) * 0.4;
  // light += hsv(2./3., .0, 1.) * pow(clamp(dot(normalize(vec3(1,1,-1)), norm) + 0.1, 0., 1.), 2.);


  light = texture(last, hitP.xy/vec2(-2.,2.)+0.5 + norm.xy * 0.5);
  // light += hsv(sin(norm.z * .5 + sin(norm.x/2.) + t) * 0.1 + 0.1, .8, 1.);
  light = clamp(light, 0., 1.);

  // light =  hit.debugColor;
  return mix(light, vec4(0), smoothstep(8., 20., dist)) * smoothstep(kEpsilon * 1.1, kEpsilon, surfaceDist);
}

// BallHit sdHolo(vec3 p) {
//   p = ballTransform(p);
//   p = transform(rotZ(0.2) * rotY(-t * 0.11), p);
//   return BallHit(sdSphere(p, 0.27), p, vec4(0));
// }

// vec4 marchHolo(vec3 p, bool flip) {
//   vec3 dir = normalize(transform(inv_proj_mat, p));
//   float surfaceDist = 0.;
//   float dist = flip ? 10. : -1.;
//   BallHit hit;
//   for (int i = 0; i < kSteps; i++) {
//     vec3 tp = transform(inv_proj_mat, p) + dir * dist;
//     hit = sdHolo(tp);
//     surfaceDist = hit.dist;
//     dist += surfaceDist * (flip ? -1. : 1.);
// 
//     if (surfaceDist < kEpsilon)
//       break;
//     if (dist > 1e2)
//       return vec4(0);
//   }
// 
//   vec3 hitP = dir * dist + p;
//   // vec3 norm = estimateNormal(hitP);
// 
//   vec2 texP = vec2(-atan(hit.p.z, hit.p.x)/PI/2.+0.25, hit.p.y);
//   texP.y *= 1.9;
//   texP.y -= 0.06;
//   texP = texP/2.+0.5;
//   texP.x = mod(texP.x * 6., .5);
//   texP.x += 0.4;
//   texP.x /= 1.4;
//   float twentyTwentyOne = texture(nye_2021, texP).r;
//   float twentyTwentyTwo = texture(nye_2022, texP).r;
//   float count = texture(nye_count, texP).r;
// 
//   float holoBri = 0.;
//   holoBri += smoothstep(0.0, .09, (sin(hit.p.y * 400. + (hit.p.x - t * 0.05) * 50.)/2.+.5));
//   holoBri *= mix(0.1, mix(count, mix(twentyTwentyOne, twentyTwentyTwo, step(nye_count_number, 0.)), (in_countdown ? 0. : 1.)), step(abs(texP.y-0.45), 0.08));
// 
//   vec4 light = vec4(0);//clamp(vec4(0.3, 0.7, 1, 1) * (smoothstep(kEpsilon * 1.1, kEpsilon, surfaceDist) * 1.0), 0., 1.);
//   light += hsv((in_countdown ? 0.3 : 0.6), .8, 1.) * holoBri;
//   light = clamp(light, 0., 1.5);
//   if (in_countdown)
//     light *= mod(nye_count_number, 1.);;
//   return light;
// }
// 
// vec4 getPulse(vec3 p) {
//   p = ballTransform(p);
//   p.x *= aspect;
//   float dist = distance(p.xy, vec2(0));
//   float pulse = sin(clamp(mod(dist + nye_count_number, PI*2.), 0., PI/20.) * 40.);
//   // pulse *= 0.1;
//   pulse *= clamp(1./pow(dist, 4.), 0., 1.);
//   pulse *= smoothstep(300., 60., nye_count_number);
//   return hsv(pulse * 0.1 + 0.6 ,.5,1.) * pulse;
// }

void main() {
  commonInit();

  aspect = u_resolution.x/u_resolution.y;
  inv_proj_mat = inverse(perspectiveProj(
    PI/2.5, aspect, 0.3, 10.0
  ));

  // vec4 holoFrontColor = marchHolo(p3, false);
  // vec4 holoRearColor = marchHolo(p3, true);

  gl_FragColor = vec4(0);
  gl_FragColor += marchBall(p3);
  // gl_FragColor = mix(gl_FragColor, holoRearColor, 1.-gl_FragColor.a);
  // gl_FragColor = holoFrontColor + mix(gl_FragColor, gl_FragColor * holoFrontColor, holoFrontColor.a);
  // gl_FragColor = mix(gl_FragColor, getPulse(p3), 1.-gl_FragColor.a);
  // gl_FragColor.a = max(gl_FragColor.a, 0.5);
}
