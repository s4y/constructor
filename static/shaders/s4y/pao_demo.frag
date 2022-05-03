#include "./common.glsl"

uniform sampler2D filt;
uniform float filt_aspect;

const int kSteps = 200;
const float kEpsilon = 1./1024.;
const float kNormEpsilon = 1./4096.;

uniform float sndGo;

mat4 inv_proj_mat;
float aspect;

struct Hit {
  float dist;
  vec3 p;
};

Hit sd(vec3 p, float kEpsilon) {
  float t = t * 1.;
  vec3 op = p;
  // p.x += sin(t/120.*60.*1.)*0.1;
  p.z += 1.5;
  // p.x += 0.35;
  // p.xy = mod(p.xy + 0.3, .6) - 0.3;
  // p = transform(rotZ(0. * t * PI * 2. / 2. + PI/4.) * rotY(0.0 * sin(t*PI*2. / 32.)), p);
  // p = transform(rotZ(sin(t * PI * 2. / 2.) * -0.1 - PI / 4.), p);
  // p.z -= t;

  p = transform(rotY(t * 0.1) * rotX(t * 0.2), p);

  // p = transform(rotY(0.5) * rotX(0.5), p);

  // p.z *= 1. + pow(ssf(mod(p.y/10.+.5, 1.)), 1.) * 0.0;
  // p.z += 1.;

  float bump = 0.;//pow(clamp(sf(0.1) + 0.3, 0., 1.), 4.);
  // p *= 1. + sin((p.x * 2.2 + p.z * 10. + 10.) * 4.) * sin((p.x * 2. - p.y / 2.) * 6.5) * sin((p.y + p.x * 15.) * 6.0) * 0.1;
  // p *= 1. + (.002 /* * pow(sf(p.x/20.+.5), 2.) */) * (
  //     (sin(p.x * p.z * 22.) - sin(p.x * 221. + 0.5) * 0.3) +
  //     (sin(p.z * 182.) - sin(p.z * 561. * p.x) * 0.1) +
  //     (sin(p.y * 42. + 1.2) - sin(p.z * 22. + 0.5)));

  float whichSlice = p.z;
  whichSlice -= balmod(whichSlice, .12 * 1.05 * 2. / 3.);
  // p = transform(rotZ(pow(mod(t * whichSlice, 1.), 10.) * PI / 2.), p);

  // float whichSliceY = (p.y) / 1.05;
  // whichSliceY -= balmod(whichSliceY, .12 * 2. / 3.);
  // p = transform(rotY(pow(mod(t * 0.1 * whichSliceY, 1.), 10.) * PI / 2.), p);

  // float dist = opSmoothUnion(sdSphere(p + vec3(sin(t) * 0.8, 0, 0), 0.21), sdSphere(p, (0.21)), 0.5);

  // float dist = opSmoothUnion(sdSphere(p + vec3(sin(t) * 0.5, 0, 0), 0.21), sdBox(p, vec3(0.14*1.5)) - 0.02, 0.2);
  float dist = opSmoothSubtraction(sdSphere(p, 0.26), sdBox(p, vec3(0.14*1.5)) - 0.02, 0.1);
  // float dist = opSmoothSubtraction(sdBox(p, vec3(0.19)), sdBox(p, vec3(0.14*1.5)), 0.1);
  dist = min(dist, sdBox(transform(rotX(t * -0.2) * rotY(t*-0.11), op + vec3(0,0,1.5)), vec3(0.07)) - 0.02);
  // dist  -= 0.01;
  // float dist = sdBox(p, vec3(0.12));
  return Hit(dist/8., p);
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        sd(vec3(p.x + kNormEpsilon, p.y, p.z), kNormEpsilon).dist - sd(vec3(p.x - kNormEpsilon, p.y, p.z), kNormEpsilon).dist,
        sd(vec3(p.x, p.y + kNormEpsilon, p.z), kNormEpsilon).dist - sd(vec3(p.x, p.y - kNormEpsilon, p.z), kNormEpsilon).dist,
        sd(vec3(p.x, p.y, p.z  + kNormEpsilon), kNormEpsilon).dist - sd(vec3(p.x, p.y, p.z - kNormEpsilon), kNormEpsilon).dist
    ));
}

vec4 bg(vec3 p) {
  // return vec4(0, 0, 0, 1.);
  // p.x /= aspect / filt_aspect;
  // p.x /= filt_aspect;
  // return vec4(p, 1.);
  return hsv(0.7, 1., 1.) * texture(filt, p.xy/2.+.5).r * 0.1;
  // return vec4(pow(texture(filt, p.xy/2.+.5).rgb * 0.5, vec3(1.)), 1.);
  // return vec4(0.5, 0.5, 0.5, 1.);
}

vec4 march(vec3 p) {
  vec3 odir = normalize(transform(inv_proj_mat, p));
  vec3 dir = odir;
  vec3 lightdir = vec3(0,0,0);
  float surfaceDist = 0.;
  float enterSurfaceDist = 1.;
  int surfacesHit = 0;
  float enterDist = 0.;
  float dist = -1.;
  float thiccness = 0.;
  float exitDist = -1.;

  vec4 light;

  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = transform(inv_proj_mat, p) + dir * dist;
    hit = sd(tp, kEpsilon);
    surfaceDist = hit.dist;
    dist += hit.dist;

    if (surfaceDist >= kEpsilon)
      continue;

    if (surfacesHit == 0) {
      enterDist = dist;
      enterSurfaceDist = surfaceDist;
    }
    surfacesHit++;
    vec3 norm = estimateNormal(transform(inv_proj_mat, p) + dir * dist);
    lightdir -= norm * 0.2;
    dir = normalize(mix(dir, reflect(dir, norm), -0.1));

    dist += kEpsilon * 200.;
    for (int j = 0; j < 50; j++) {
      vec3 tp = transform(inv_proj_mat, p) + dir * dist;
      hit = sd(tp, kEpsilon);
      dist += max(0.01, abs(hit.dist));
      if (hit.dist > 0.)
        break;
      if (dist > 10.)
        discard;
    }
    for (int j = 0; j < 40; j++) {
      vec3 tp = transform(inv_proj_mat, p) + dir * dist;
      hit = sd(tp, kEpsilon);
      dist -= hit.dist;
      if (hit.dist < kEpsilon) {
        exitDist = dist;
        dist += kEpsilon * 5.;
        vec3 norm = estimateNormal(transform(inv_proj_mat, p) + dir * dist);
        lightdir -= norm * 0.2;
        dir = normalize(mix(dir, reflect(dir, norm), -0.1));
        break;
      }
    }
  }
  thiccness = dist - enterDist;
  vec3 hitP = transform(inv_proj_mat, p) + odir * enterDist;
  vec3 exitHitP = transform(inv_proj_mat, p) + odir * exitDist;
  vec3 norm = estimateNormal(hitP);
  vec3 texP = p + lightdir;//norm * -0.3 + transform(inverse(inv_proj_mat), hitP);

  // return vec4(float(surfacesHit)/float(kSteps));
  // light = vec4(abs(norm-estimateNormal(exitHitP)), 1.);

  light = bg(texP);

  //light += vec4(enterSurfaceDist / kEpsilon);
  // light += enterDist * 0.1;
  // light += dist * 0.1;
  light += hsv(0.65, 1., 1.) * pow(max(thiccness, 0.) * .0001, 0.5);
  light += hsv(-2.31/1., .0, 1.) * pow(clamp(dot(normalize(vec3(-1,1.5,0)), norm), 0., 1.), 10.) * 0.5;
  light += hsv(0.1, .2, 1.) * pow(clamp(dot(normalize(vec3(-2,1,0.0)), norm) + 0.1, 0., 1.), 10.) * 0.5;
  // light += vec4(1.) * smoothstep(0., 1., dist - enterDist);
  // light = pow(light, vec4(5.));
  // light = bg(transform(inverse(inv_proj_mat), hitP)) * (1.-light.a) + light;
  // light = mulHsv(bg(norm + hitP), vec3(1,0.5,0.9)) * (1.-light.a) + light;
  // light += bg(texP) * (1.-light.a) + light;
  light *= smoothstep(5., 4., enterDist);
  light *= smoothstep(kEpsilon*2., kEpsilon, enterSurfaceDist);
  // light = vec4(enterSurfaceDist * 100.);
  return light;

  // vec2 texp = vec2(atan(hitP.z, hitP.x)/(PI*2.)+0.75, hitP.y/PI/10.+0.5);
  // light += vec4(texture(filt, texp).xyz, 1.) * (1.-light.a);
  return mix(light, bg(norm), smoothstep(kEpsilon, kEpsilon * 2., enterDist));
}

void main() {
  commonInit();

  aspect = u_resolution.x/u_resolution.y;
  inv_proj_mat = inverse(perspectiveProj(
    PI/3.5, aspect, 0.3, 10.0
  ));

  gl_FragColor = march(p3);
  gl_FragColor += bg(p3) * (1.-gl_FragColor.a);
}
