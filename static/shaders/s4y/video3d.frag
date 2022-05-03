#include "/shaders/s4y/common.glsl"


uniform sampler2D webcam;
uniform sampler2D u_fb;
#loadimage logo stoneland.jpg

uniform sampler2D video1;

struct Hit {
  float dist;
  vec3 p;
  float which;
};

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
  vec4 color = texture(webcam, p.xy*3./2.+.5);
  p.z -= color.b/5.;
  Hit hit = Hit(sdBox(p, vec3(0.5,0.1,0.05)), p*2., 0.);
  return hit;
}

Hit sdOne(vec3 p) {
  p.z += 0.3;
  // p.xy *= 1. - sf(0.05);
  p = transform(rotY(sin(t)), p);
  // p = transform(rotY(sin(t)*ssf(0.1)), p);
  vec4 color = texture(webcam, p.xy*4./2.+.5);
  float diff = abs(color.r - color.g);
  p.z -= color.r * 0.3 * sf(color.r);
  // p.z += (diff) * 0.1;
  // p.z += 0.3 * (1.-diff) * (1.-ssf(distance(p.xy, vec2(0))/20.+0.5));
  // p.z += 1. - sf(p.z/1./2.+.5);
  Hit hit = Hit(sdBox(p, vec3(1.5,0.5,0.01)), p*4., 1.);
  // hit.dist += 0.03 * smoothstep(0.0, .2, color.g);
  if (color.r < max(color.b, color.g) + .05 && color.r > 0.5)
    hit.dist += 0.1;
  hit.dist/=4.;
  return hit;
}

Hit sd(vec3 p) {
  Hit oneHit = sdOne(p);
  return oneHit;
  Hit manyHit = sdMany(p);
  if (oneHit.dist < manyHit.dist)
    return oneHit;
  return manyHit;
}

vec4 bg(vec2 p) {
  return vec4(0);
  float ofs = distance(p, vec2(0));
  ofs += sin(5. * (sin(atan(p.y,p.x)+t*0.05)/2.+.5)*0.2+t*0.01);//(sin(sin(atan(p.y,p.x)-t*0.1)*2.+sin(p.x+t)-t*0.14)*.1 + ofs);
  // ofs += ssf(ofs/80.+.5);
  ofs = sin(10. * ofs);
  return vec4(0,0.27,0.18,1) - -ofs*0.02;
}

void main() {
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
  float which = ssf(0.5);//sin(t)/2.+.5;
  inv_proj_mat = inv_proj_mat * which + (scale(.4,.4,.4)*translateZ(-1.)) * (1.-which);
  vec3 dir = normalize(transform(inv_proj_mat, vec3(fitp, 0.)));
  dir = dir * which + vec3(0,0,-1) * (1.-which);
  float dist = -1.;
  Hit lastHit;
  for (int i = 0; i < 120; i++) {
    vec3 tp = transform(inv_proj_mat, vec3(fitp, 0.)) + dir * dist;
    lastHit = sd(tp);
    dist += lastHit.dist;
    if (dist > 20.)
      break;
    if (abs(lastHit.dist) < 1./1024.)
      break;
  }
  vec4 c = texture(webcam, lastHit.p.xy/2.+.5);//hsv(0.,1.-lastHit.which,1.-pow(sf(lastHit.p.x/10./2.+.5)+0.3, 2.));
  gl_FragColor = c * smoothstep(1./32.,1./512., lastHit.dist);
  gl_FragColor *= smoothstep(0.9, 0.8, distance(lastHit.p.xy, vec2(0)));
  gl_FragColor *= smoothstep(10., 0., dist);
  gl_FragColor -= bg(fitp) * (1.-gl_FragColor.a);
  // gl_FragColor.rgb
  vec2 uv = p3.xy/2.+.5;
  gl_FragColor += addHsv(texture(u_fb, uv + vec2(0.0, -0.01)), vec3(sf(uv.x), .1, 0.0))*.9 * (1.1-gl_FragColor.a);
}
