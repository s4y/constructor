#include "./common.glsl"

uniform sampler2D webcam;
// uniform float filt_aspect;

const int kSteps = 80;
const float kEpsilon = 1./512.;

uniform float sndGo;
uniform sampler2D filt;

mat4 inv_proj_mat;
float aspect;

struct Hit {
  float dist;
  vec3 p;
};

float sdCappedCylinder( vec3 p, float h, float r ) {
  vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(h,r);
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

Hit sd(vec3 p) {
  float t = t * 10.1 + sndGo * 0.4;
  vec3 op = p;
  float angle = atan(op.y, op.x)/PI+2.;




  p.z += 2.5;

  p = transform(rotZ(p.z * 0.1 + t * 0.1), p);

  // p.z -= t;
  // p.xy += 0.5;
  if (p.z < 0.)
    p = mod(p + 1., vec3(2.)) - 1.;

  p = transform(rotX(-PI/2.), p);
  p = transform(rotZ(0.5 + sndGo * 1.0), p);
  p = transform(rotX(t / 2.), p);
  // p = transform(rotY(sin(t)* 0.1), p);

  vec3 dickP = p;
  dickP.zy *= 1. - pow(clamp((pow(sf(0.1), 6.) * (10.*smoothstep(1.1, -.1, abs(p.x - 0.9)))), 0., 1.), 1.) * 0.2;
  dickP.z += 0.3*smoothstep(1., .1, p.x);
  dickP.z -= 0.25;

  vec3 shaftP = dickP;
  shaftP.z += smoothstep(0.01, 0., abs(dickP.y + sin(dickP.x * 40.)*sin(dickP.x * 5.)*0.01)) * 0.002 * step(p.z, 0.);

  // float dist = sdSphere(p / vec3(4., 1., 1.), 0.1);
  float dist = sdCappedCylinder(transform(rotZ(PI/2.), shaftP + vec3(-0.15, 0, 0)), 0.06, 0.25);
  dist = min(dist, sdSphere(dickP + vec3(-0.4, 0, 0), 0.057));
  dist = min(dist, sdSphere(shaftP + vec3(0.1, 0, 0), 0.06));
  dist = min(dist, sdSphere(p * vec3(1,1,0.8) + vec3(0.1, -0.05, 0.), 0.1));
  dist = min(dist, sdSphere(p * vec3(1,1,0.8) + vec3(0.1, 0.05, 0.), 0.1));

  return Hit(dist, p);




  /*



  p.z += 1.;
  p *= 1. - 0.1 * pow(fsf(angle), 2.);
  p = transform(rotY(t * 0.1) * rotX(t * 0.2), p);
  p = transform(rotX(t * 0.11), p);

  angle = atan(p.y, p.x)/PI+2.;
  // p = transform(rotX(angle - balmod(angle, PI/10.) - angle * 0.0), p);
  // p = transform(rotY(t * -1.1) * rotX(t * -0.2), p);

  // p = transform(rotZ(t*1.0), p);


  // p = transform(rotY(0.5) * rotX(0.5), p);

  // p.z *= 1. + pow(ssf(mod(p.y/10.+.5, 1.)), 1.) * 0.0;
  // p.z += 1.;

  float bump = 0.;//pow(clamp(sf(0.05) + 0.2, 0., 2.), 1.);
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
  // p = transform(rotY(pow(mod(t * 0.1 * whichSliceY, 1.), 10.) * PI / 2.), p);


	// p.y *= 1. + sf(abs(p.x / 10.));

  // p *= 1. - 0.7 * pow(distance(p, vec3(0.)), .5);

  float dist = mix(sdBox(p, vec3(0.05)), sdSphere(p, 0.4 * fsf(0.1)), 0.);
  // float dist = sdBox(p, vec3(0.12));
  return Hit(dist/5., p);
  */
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
  float dist = -3.;
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
      // break;
    }
    if (dist > 20.)
      return vec4(0);
  }

  vec3 hitP = transform(inv_proj_mat, p) + odir * enterDist;
  vec3 norm = estimateNormal(hitP);
  vec3 texP = p + lightdir;//norm * -0.3 + transform(inverse(inv_proj_mat), hitP);

  light += hsv(0./3., .3, 1.) * pow(clamp(dot(normalize(vec3(-1,0.5,1)), norm), 0., 1.), 2.);
  // light += hsv(2./3. + sf(lightdir.x), .0, 1.) * pow(clamp(dot(normalize(vec3(1,1,1)), norm) + 0.1, 0., 1.), 10.);
  // light += vec4(1.) * smoothstep(0., 1., dist - enterDist);
  // light = pow(light, vec4(5.));
  // light = bg(transform(inverse(inv_proj_mat), hitP)) * (1.-light.a) + light;
  // light = mulHsv(bg(norm + hitP), vec3(1,0.5,0.9)) * (1.-light.a) + light;
  // light += texture(webcam, mod(hit.p.yx * 4. + 0.5, 1.));
  // light += pow(texture(webcam, (hitP.xy*2.-norm.xy*0.5)/2.+.5) * 0.9, vec4(1)) * (1.-light.a);
  light *= smoothstep(20., 6., dist);
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
  gl_FragColor += texture(filt, p3.xy/2.+.5) * (1.-gl_FragColor.a);

}
