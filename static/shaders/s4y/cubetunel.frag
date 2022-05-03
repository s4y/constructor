#include "/shaders/s4y/common.glsl"


uniform sampler2D webcam;
#loadimage logo stoneland.jpg

uniform sampler2D video1;
uniform sampler2D u_fb;

struct Hit {
  float dist;
  vec3 p;
  float which;
};

const int kSteps = 40;
const float kEpsilon = 1./1024.;

Hit sdBoxes(vec3 p) {
  p.z += 1.;
  p.z -= t*0.2;
  p.xy += .5;
  float angle = atan(p.y, p.x);
  // p = transform(rotZ(PI/6.), p);
  // p = transform(rotZ(-angle - mod(angle, PI/4.)+PI/3.), p);
  const vec3 md = vec3(2., 2., .5);
  float which = p.z - (mod(p.z+md.z/2., md.z)-md.z/2.);
  p = transform(rotZ(which * 0.1 + ssf(mod(which/10., 1.))), p);
  vec3 op = p;
  if (p.z < -1.) {
    p.xyz = (mod(p.xyz + md/2., md) - md/2.);
  }
  // Hit hit = Hit(100., p*2., 1.);
  // for (int i = 0; i < 1; i++) {
    vec3 pp = p;
    // pp = transform(rotZ(0.*PI*2.), pp);
    // pp.y += 0.5;
    // pp = transform(rotY(t + sin(t * 0.1) * 1.) * rotX(PI/2.+t), pp);
    Hit hit = Hit(mix(sdBox(pp, vec3(0.2,0.2,0.2)), sdSphere(pp, 0.2), 0.-sf(0.1)*0.1), p*2., 1.);
    // if (nextHit.dist < hit.dist)
    //   hit = nextHit;
  // }
  // p.y *= 1. - sf(p.x/10./2.+.5);
  return hit;
}

Hit sdMany(vec3 p) {
  p.z += 1.;
  // p = transform(rotX(t*0.45) * rotY(t*0.5), p);
  p.z -= t * 10.;
  p.x += 1.;
  vec3 op = p;
  if (p.z < -1.) {
    vec3 md = vec3(2., 1., 1.);
    p.xyz = mod(p.xyz + md/2., md) - md/2.;
  }
  p = transform(rotZ(op.z-p.z), p);
  p = transform(rotY(PI/2.+t), p);
  // p.y *= 1. - sf(p.x/10./2.+.5);
  vec4 color = texture(video1, p.xy*3./2.+.5);
  p.z -= color.b/5.;
  Hit hit = Hit(sdBox(p, vec3(0.5,0.1,0.05)), p*2., 0.);
  return hit;
}

Hit sdOne(vec3 p) {
  p.z += 0.3;
  // p = transform(rotX(sin(t*0.045)*0.1) * rotY(sin(t*0.05)*1.), p);
  p = transform(rotY(sin(t)*ssf(0.1)), p);
  vec4 color = texture(video1, p.xy*3./2.+.5);
  float diff = abs(color.r - color.g);
  p.z += (diff) * 0.9;
  // p.z += 0.3 * (1.-diff) * (1.-ssf(distance(p.xy, vec2(0))/20.+0.5));
  // p.z += 1. - sf(p.z/1./2.+.5);
  Hit hit = Hit(sdBox(p, vec3(1.5,0.5,0.01)), p*3., 1.);
  // hit.dist += 0.03 * smoothstep(0.0, .2, diff);
  hit.dist/=4.;
  return hit;
}

Hit sd(vec3 p) {
  return sdBoxes(p);
  // Hit oneHit = sdOne(p);
  // return oneHit;
  // Hit manyHit = sdMany(p);
  // if (oneHit.dist < manyHit.dist)
  //   return oneHit;
  // return manyHit;
}

float flower(vec3 p) {
  float aspect = u_resolution.x/u_resolution.y;
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

vec4 bg(vec3 p) {
  // float ofs = distance(p, vec2(0));
  // ofs += sin(5. * (sin(atan(p.y,p.x)+t*0.1)/2.+.5)*0.2+t*0.1);//(sin(sin(atan(p.y,p.x)-t*0.1)*2.+sin(p.x+t)-t*0.14)*.1 + ofs);
  // // ofs += ssf(ofs/80.+.5);
  // ofs = sin(10. * ofs);
  return //addHsv(texture2D(u_fb, mod(p.xy/2.+.5, 1.)), vec3(0.1, 0, 0)) +
  hsv(p.z / 100., clamp(1. + p.z / 1., 0., 1.), ssf(mod(p.x * p.y, 1.)));// - -ofs*0.02;
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateBoxesNormal(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        sdBoxes(vec3(p.x + EPSILON, p.y, p.z)).dist - sdBoxes(vec3(p.x - EPSILON, p.y, p.z)).dist,
        sdBoxes(vec3(p.x, p.y + EPSILON, p.z)).dist - sdBoxes(vec3(p.x, p.y - EPSILON, p.z)).dist,
        sdBoxes(vec3(p.x, p.y, p.z  + EPSILON)).dist - sdBoxes(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}

void main() {
  // float angle = atan(p3.y, p3.x);
  // gl_FragColor = vec4(1.) * (angle - mod(angle, PI/10.));
  // return;
  float aspect = u_resolution.x/u_resolution.y;
  vec2 fitp = p3.xy * vec2(aspect, 1.);
  // vec2 p = p3.xy;
  // if (u_resolution.x > u_resolution.y)
  //   p.x *= u_resolution.x/u_resolution.y;
  // else
  //   p.y *= u_resolution.y/u_resolution.x;
  mat4 inv_proj_mat = inverse(perspectiveProj(
    PI/2., 1., 0.3, 10.0
  ));
  float which = 0.;//ssf(0.5);//sin(t)/2.+.5;
  // inv_proj_mat = inv_proj_mat * which + (scale(.4,.4,.4)*translateZ(-1.)) * (1.-which);
  vec3 dir = normalize(transform(inv_proj_mat, vec3(fitp, 0.)));
  // dir = dir * which + vec3(0,0,-1) * (1.-which);
  float dist = -1.;
  Hit lastHit;
  vec3 tp;
  for (int i = 0; i < kSteps; i++) {
    tp = transform(inv_proj_mat, vec3(fitp, 0.)) + dir * dist;
    lastHit = sd(tp);
    dist += lastHit.dist;
    if (dist > 20.)
      break;
    if (abs(lastHit.dist) < 1./1024.)
      break;
  }
  vec3 norm = estimateBoxesNormal(tp);//texture2D(webcam, lastHit.p.xy/2.+.5);//hsv(0.,1.-lastHit.which,1.-pow(sf(lastHit.p.x/10./2.+.5)+0.3, 2.));
  vec4 c = bg(norm+tp);
  gl_FragColor = c * smoothstep(1./256.,1./512., lastHit.dist);
  // gl_FragColor *= smoothstep(1.5, 0.8, distance(lastHit.p.xy, vec2(0)));
  // gl_FragColor *= smoothstep(100., 10., dist);
  // gl_FragColor += bg(fitp) * (1.-gl_FragColor.a);
  // gl_FragColor += texture2D(u_fb, p3.xy/2.+.5);
}
