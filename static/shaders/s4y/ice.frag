#include "./common.glsl"

uniform sampler2D last;
uniform float last_aspect;

const int kSteps = 100;
const float kEpsilon = 1./1024.;

uniform float sndGo;
uniform float beat;

uniform mat4 proj_mat;
uniform mat4 inv_proj_mat;
uniform mat4 inv_camera_mat;
uniform mat4 camera_mat;
float aspect;

struct Hit {
  float dist;
  vec3 p;
};

Hit sd(vec3 p) {
  float t = sndGo * .1 + t * 1.;
  vec3 op = p;
  // p.x += sin(t/120.*60.*1.)*0.1;
  p.z += 1.2;
  // p.x += 0.35;
  // p += 0.3;
  // p = transform(rotZ(0. * t * PI * 2. / 2. + PI/4.) * rotY(0.0 * sin(t*PI*2. / 32.)), p);
  // p = transform(rotZ(sin(t * PI * 2. / 2.) * -0.1 - PI / 4.), p);
  // p.z -= t;

  p = transform(rotY(1.1) * rotX(t * 0.4), p);
  p = transform(rotY(p.z*10.), p);
  // p.x = mod(p.x + 0.2, .4) - 0.2;
  p = transform(rotX(0.4) * rotY(t * -0.1), p);

  float angle = atan(p.y, p.x)/PI+2.;
  // p = transform(rotX(angle - balmod(angle, PI/10.) - angle * 0.0), p);

  // p = transform(rotY(t * 0.1) * rotX(t * 0.2), p);
  // p = transform(rotY(sf(0.4) * 1. + t * 1.), p);

  // p = transform(rotY(0.5) * rotX(0.5), p);

  p.xz *= 1. - pow(ssf(mod(p.y/10.+.5, 1.)), 2.) * 1.0;
  // p.z += 1.;

  float bump = pow(clamp(sf(0.05) + 0.2, 0., 2.), 1.);
  // p *= 1. + sin((p.x * 2.2 + p.z * 10. + 10.) * 4.) * sin((p.x * 2. - p.y / 2.) * 6.5) * sin((p.y + p.x * 15.) * 6.0) * 0.1;
  // p *= 1. + (.05 * pow(sf(p.x/20.+.5), 2.)) * (
  //     (sin(p.x * p.z * 22.) - sin(p.x * 221. + 0.5) * 0.3) +
  //     (sin(p.z * 182.) - sin(p.z * 561. * p.x) * 0.1) +
  //     (sin(p.y * 42. + 1.2) - sin(p.z * 22. + 0.5)));

  float whichSlice = p.z;
  whichSlice -= balmod(whichSlice, .12 * 1.05 * 2. / 3.);
  // p = transform(rotZ(pow(mod(t * whichSlice, 1.), 10.) * PI / 2.), p);

  float whichSliceY = (p.y) / 1.05;
  whichSliceY -= balmod(whichSliceY, .12 * 2. / 3.);
  p = transform(rotY(pow(mod(t * 0.1 * whichSliceY, 1.), 10.) * PI / 2.), p);


	// p.y *= 1. + sf(abs(p.x / 10.));

  // p *= 1. - 0.7 * pow(distance(p, vec3(0.)), .5);

  float dist = mix(sdBox(p, vec3(0.10)), sdSphere(p, 0.14), 0.0);
  // float dist = sdBox(p, vec3(0.12));
  return Hit(dist/5., p);
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        sd(vec3(p.x + kEpsilon, p.y, p.z)).dist - sd(vec3(p.x - kEpsilon, p.y, p.z)).dist,
        sd(vec3(p.x, p.y + kEpsilon, p.z)).dist - sd(vec3(p.x, p.y - kEpsilon, p.z)).dist,
        sd(vec3(p.x, p.y, p.z  + kEpsilon)).dist - sd(vec3(p.x, p.y, p.z - kEpsilon)).dist
    ));
}

vec4 bg(vec3 p) {
  // p.x /= aspect / last_aspect;
  // p.x /= last_aspect;
  // return vec4(p, 1.);
  return vec4(texture(last, p.xy/2.+.5).rgb, 1.);
  // return vec4(pow(texture(last, p.xy/2.+.5).rgb * 0.5, vec3(1.)), 1.);
}

vec4 bgSky(vec3 p) {
  float bri = 1.;
  p.y *= 4.;
  p.x += t * .1;
  p.y += t * .01;
  bri *= cos(transform(rotZ(2.2*sin(p.x)), p).x*1.);
  bri *= cos(transform(rotZ(.22*sin(p.y)), p).x*1.);
  // bri *= cos(transform(rotZ(2.*sin(distance(p, vec3(0.)))), p).y*2.);
  // bri *= sin(transform(rotZ(4.*distance(p + 10., vec3(0.))), p).y*10.);
  bri = bri / 2. + 0.5;
  bri = pow(bri + 0.1, 10.);
  bri *= (sin(transform(rotZ(sin(p.y*.1+p.x*0.5)), p).x) * sin(transform(rotZ(sin(p.x*1.)), p).y)) / 2. + 0.5;
  return mix(hsv(2./3., .5, 1.), hsv(0., 0.1, 1.), bri);
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

  float ior = 0.5;

  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = transform(inv_proj_mat, p) + dir * dist;
    hit = sd(tp);
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
    lightdir -= norm * 0.8;
    dir = normalize(mix(dir, reflect(dir, norm), -0.1));

    dist += kEpsilon * 200.;
    for (int j = 0; j < 50; j++) {
      vec3 tp = transform(inv_proj_mat, p) + dir * dist;
      hit = sd(tp);
      dist += max(0.01, abs(hit.dist));
      if (hit.dist > 0.)
        break;
      if (dist > 10.)
        discard;
    }
    for (int j = 0; j < 40; j++) {
      vec3 tp = transform(inv_proj_mat, p) + dir * dist;
      hit = sd(tp);
      dist -= hit.dist;
      if (hit.dist < kEpsilon) {
        exitDist = dist;
        thiccness = exitDist - enterDist;
        dist += kEpsilon * 5.;
        vec3 norm = estimateNormal(transform(inv_proj_mat, p) + dir * dist);
        lightdir -= norm * 0.8;
        dir = normalize(mix(dir, reflect(dir, norm), -0.1));
        break;
      }
    }
  }
  vec3 hitP = transform(inv_proj_mat, p) + odir * enterDist;
  vec3 exitHitP = transform(inv_proj_mat, p) + odir * exitDist;
  vec3 norm = estimateNormal(hitP);
  vec3 texP = p + lightdir;//norm * -0.3 + transform(inverse(inv_proj_mat), hitP);

  // vec3 odir = normalize(transform(inv_proj_mat, p));
  // vec3 dir = odir;
  // vec3 lightdir = vec3(0,0,0);
  // float surfaceDist = 0.;
  // float enterDist = 0.;
  // float dist = -0.5;
  // bool inside = false;

  // Hit hit;
  // for (int i = 0; i < kSteps; i++) {
  //   vec3 tp = transform(inv_proj_mat, p) + dir * dist;
  //   hit = sd(tp);
  //   surfaceDist = hit.dist;
  //   dist += inside ? -surfaceDist : surfaceDist;

  //   if (surfaceDist < kEpsilon && !inside) {
  //     enterDist = dist;
  //     lightdir += estimateNormal(transform(inv_proj_mat, p) + dir * dist) * -ior;
  //     dir += lightdir;
  //     dist += 2.;
  //     inside = true;
  //   } else if (surfaceDist < kEpsilon && inside) {
  //     inside = false;
  //     lightdir += estimateNormal(transform(inv_proj_mat, p) + dir * dist) * ior;
  //     //return vec4(lightdir, 1.);
  //     // light += hsv(dist * 0.1, 0., 1.) * 0.2;
  //     // break;
  //   }
  //   if (dist > 20.)
  //     return vec4(0);
  // }

  // vec3 hitP = transform(inv_proj_mat, p) + odir * enterDist;
  // vec3 norm = estimateNormal(hitP);
  // vec3 texP = p + lightdir;//norm * -0.3 + transform(inverse(inv_proj_mat), hitP);

  light += hsv(0./3., .0, 1.) * pow(clamp(dot(normalize(vec3(-1,0.5,-1)), norm), 0., 1.), 2.);
  light += hsv(2./3., .0, 1.) * pow(clamp(dot(normalize(vec3(1,1,-1)), norm) + 0.1, 0., 1.), 2.);
  // light += vec4(1.) * smoothstep(0., 1., dist - enterDist);
  // light = pow(light, vec4(5.));
  // light = bg(transform(inverse(inv_proj_mat), hitP)) * (1.-light.a) + light;
  // light = mulHsv(bg(norm + hitP), vec3(1,0.5,0.9)) * (1.-light.a) + light;
  light +=  bg(texP) * (1.-light.a);
  // light *= smoothstep(7., 6., dist);
  light *= smoothstep(kEpsilon*4., kEpsilon, enterSurfaceDist);
  // light.a = 1.;
  return light;

  // vec2 texp = vec2(atan(hitP.z, hitP.x)/(PI*2.)+0.75, hitP.y/PI/10.+0.5);
  // light += vec4(texture(last, texp).xyz, 1.) * (1.-light.a);
  return mix(light, bgSky(norm), smoothstep(kEpsilon, kEpsilon * 2., enterDist));
}

void main() {
  commonInit();

  aspect = u_resolution.x/u_resolution.y;

  gl_FragColor += march(p3);
  gl_FragColor += bg(p3) * (1.-gl_FragColor.a);

}
