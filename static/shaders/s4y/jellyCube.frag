#include "./common.glsl"

uniform sampler2D filt;
// uniform float filt_aspect;

const int kSteps = 220;
const float kEpsilon = 1./1024.;

uniform float sndGo;

mat4 inv_proj_mat;
float aspect;

struct Hit {
  float dist;
  vec3 p;
};

Hit sd(vec3 p) {
  vec3 op = p;

  p.z += 1.;

  p = transform(rotZ(atan(p.z, p.y)*0.5), p);
  p = transform(rotZ(t*1.0), p);

  p = transform(rotY(t * 1.1) * rotX(t * 1.2), p);

  // p = transform(rotY(0.5) * rotX(0.5), p);

  // p.z *= 1. + pow(ssf(mod(p.y/10.+.5, 1.)), 1.) * 0.0;
  // p.z += 1.;

  float bump = 0.;//pow(clamp(sf(0.05) + 0.2, 0., 2.), 1.);
  // p *= 1. + sin((p.x * 2.2 + p.z * 10. + 10.) * 4.) * sin((p.x * 2. - p.y / 2.) * 6.5) * sin((p.y + p.x * 15.) * 6.0) * 0.1;
  p *= 1. + (.05 * pow(sf(p.x/20.+.5), 2.)) * (
      (sin(p.x * p.z * 22.) - sin(p.x * 221. + 0.5) * 0.3) +
      (sin(p.z * 182.) - sin(p.z * 561. * p.x) * 0.1) +
      (sin(p.y * 42. + 1.2) - sin(p.z * 22. + 0.5)));

  float whichSlice = p.z;
  whichSlice -= balmod(whichSlice, .12 * 1.05 * 2. / 3.);
  // p = transform(rotZ(pow(mod(t * whichSlice, 1.), 10.) * PI / 2.), p);

  float whichSliceY = (p.y) / 1.05;
  whichSliceY -= balmod(whichSliceY, .12 * 2. / 3.);
  // p = transform(rotY(pow(mod(t * 0.1 * whichSliceY, 1.), 10.) * PI / 2.), p);


	// p.y *= 1. + sf(abs(p.x / 10.));

  // p *= 1. - 0.7 * pow(distance(p, vec3(0.)), .5);

  float dist = mix(sdBox(p, vec3(0.15)), sdSphere(p, 0.2), 0.);
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
  return vec4(texture(filt, p.xy/2.+.5).rgb, 1.);
  // return vec4(pow(texture(filt, p.xy/2.+.5).rgb * 0.5, vec3(1.)), 1.);
}

vec4 march(vec3 p) {
  vec3 odir = normalize(transform(inv_proj_mat, p));
  vec3 dir = odir;
  vec3 lightdir = vec3(0,0,0);
  float surfaceDist = 0.;
  float enterDist = 0.;
  float dist = -1.;
  bool inside = false;

  vec4 light;

  float ior = 0.5;

  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = transform(inv_proj_mat, p) + dir * dist;
    hit = sd(tp);
    surfaceDist = hit.dist;
    dist += inside ? -surfaceDist : surfaceDist;

    if (surfaceDist < kEpsilon && !inside) {
      enterDist = dist;
      break;
      lightdir += estimateNormal(transform(inv_proj_mat, p) + dir * dist) * -ior;
      dir += lightdir;
      dist += 2.;
      inside = true;
    } else if (surfaceDist < kEpsilon && inside) {
      inside = false;
      lightdir += estimateNormal(transform(inv_proj_mat, p) + dir * dist) * ior;
      //return vec4(lightdir, 1.);
      // light += hsv(dist * 0.1, 0., 1.) * 0.2;
      break;
    }
    if (dist > 20.)
      return vec4(0);
  }

  vec3 hitP = transform(inv_proj_mat, p) + odir * enterDist;
  vec3 norm = estimateNormal(hitP);
  vec3 texP = p + lightdir;//norm * -0.3 + transform(inverse(inv_proj_mat), hitP);

  light += hsv(0./3., .0, 1.) * pow(clamp(dot(normalize(vec3(-1,0.5,1)), norm), 0., 1.), 2.);
  light += hsv(2./3., .0, 1.) * pow(clamp(dot(normalize(vec3(1,1,1)), norm) + 0.1, 0., 1.), 2.);
  // light += vec4(1.) * smoothstep(0., 1., dist - enterDist);
  // light = pow(light, vec4(5.));
  // light = bg(transform(inverse(inv_proj_mat), hitP)) * (1.-light.a) + light;
  // light = mulHsv(bg(norm + hitP), vec3(1,0.5,0.9)) * (1.-light.a) + light;
  // light += bgSky(texP) * (1.-light.a);
  // light *= smoothstep(7., 6., dist);
  light *= smoothstep(kEpsilon*2., kEpsilon, surfaceDist);
  light.a = 1.;
  return light;
}

void main() {
  commonInit();

  aspect = u_resolution.x/u_resolution.y;
  inv_proj_mat = inverse(perspectiveProj(
    PI/3.5, aspect, 0.3, 10.0
  ));

  gl_FragColor += march(p3);
  // gl_FragColor += bgSky(p3) * (1.-gl_FragColor.a);

}
