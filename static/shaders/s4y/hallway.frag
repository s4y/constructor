#include "./common.glsl"

uniform sampler2D webcam;
uniform sampler2D last;

const int kSteps = 120;
const float kEpsilon = 1./1024.;

mat4 inv_proj_mat;
float aspect;

struct HallwayHit {
  float dist;
  vec3 p;
};

HallwayHit sdHallway(vec3 p) {
  // p = transform(rotX(sin(t) * 0.1) * rotY(t*0.1), p);
  // p = transform(rotY(sin(p.z*1.5) * 0.3) * rotX(0.5 * sin(p.z / 10.)), p);
  p.z -= t * 10.;
  // p = transform(rotZ(-angle+mod(angle, PI/8.)), p);
  // float angle = atan(p.y, p.x);
  // p.x -= mod(p.x, 2.);// * (1.-step(sin(p.z), 0.8));
  // p = transform(rotY(t), p);
  p /= 8.;
  float dist = 1.0-distance(p.xy, vec2(0.));
  return HallwayHit(dist/2. + (0.01*sin(p.z*10.)), p);
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        sdHallway(vec3(p.x + kEpsilon, p.y, p.z)).dist - sdHallway(vec3(p.x - kEpsilon, p.y, p.z)).dist,
        sdHallway(vec3(p.x, p.y + kEpsilon, p.z)).dist - sdHallway(vec3(p.x, p.y - kEpsilon, p.z)).dist,
        sdHallway(vec3(p.x, p.y, p.z  + kEpsilon)).dist - sdHallway(vec3(p.x, p.y, p.z - kEpsilon)).dist
    ));
}

vec4 marchHallway(vec3 p) {
  vec3 dir = normalize(transform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float dist = -1.;
  HallwayHit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = transform(inv_proj_mat, p) + dir * dist;
    hit = sdHallway(tp);
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
  light += hsv(0./3., .0, 1.) * pow(clamp(dot(normalize(vec3(-1,1,1)), norm) + 0.1, 0., 1.), 2.);
  // light += hsv(2./3., .0, 1.) * pow(clamp(dot(normalize(vec3(1,1,-1)), norm) + 0.1, 0., 1.), 2.);

  vec2 texp = vec2(atan(hitP.z, hitP.x)/(PI*2.)+0.75, hitP.y/PI/10.+0.5);
  light += vec4(texture(last, texp).xyz, 1.) * (1.-light.a);
  return mix(light, vec4(0, 0, 0,0), smoothstep(8., 10., dist));
}

void main() {
  commonInit();

  aspect = u_resolution.x/u_resolution.y;
  inv_proj_mat = inverse(perspectiveProj(
    PI/1.5, aspect, 0.3, 10.0
  ));

  gl_FragColor = marchHallway(p3);
}
