#include "/shaders/s4y/common.glsl"

uniform sampler2D u_fb;
uniform sampler2D webcam;
#loadimage logo no_crypto.png

struct Hit {
  float dist;
  vec3 p;
  float which;
};

Hit sdMany(vec3 p) {
  p.z += 2.;
  // p = transform(rotX(t*0.45) * rotY(t*0.5), p);
  // p.z -= t * 1.;
  p.x += 1.;
  vec3 op = p;
  if (p.z < -1.) {
    vec3 md = vec3(2., 1., 1.);
    p.xyz = mod(p.xyz + md/2., md) - md/2.;
  }
  p = transform(rotZ(op.z-p.z), p);
  p = transform(rotY(PI/2.+t), p);
  p.y *= 1. - sf(p.x/10./2.+.5);
  Hit hit = Hit(sdBox(p, vec3(0.5,0.5,0.05)), p*2., 0.);
  vec4 color = texture(logo, p.xy*2./2.+.5);
  if (color.r < .5)
    hit.dist = max(hit.dist, 0.02);
  // hit.dist/=2.;
  return hit;
}

Hit sdOne(vec3 p) {
  p.z += 2.;
  p = transform(rotX(sin(t*0.45)*0.4) * rotY(t*0.5), p);
  p.y *= 1. - sf(p.x/10./2.+.5);
  Hit hit = Hit(sdBox(p, vec3(0.5,0.1,0.05)), p*2., 1.);
  vec4 color = texture(logo, p.xy*vec2(3.,9.)/2.+.5);
  if (color.r > .5)
    hit.dist = max(hit.dist, 0.1);
  hit.dist/=4.;
  return hit;
}

Hit sd(vec3 p) {
  Hit oneHit = sdOne(p);
  return oneHit;
  Hit manyHit = sdMany(p);
  // return oneHit;
  if (oneHit.dist < manyHit.dist)
    return oneHit;
  return manyHit;
}

void main() {
  float aspect = u_resolution.x/u_resolution.y;
  // vec2 p = p3.xy;
  // if (u_resolution.x > u_resolution.y)
  //   p.x *= u_resolution.x/u_resolution.y;
  // else
  //   p.y *= u_resolution.y/u_resolution.x;
  mat4 inv_proj_mat = inverse(perspectiveProj(
    PI/4., aspect, 0.2, 10.0
  ));
  vec3 dir = normalize(transform(inv_proj_mat, p3));
  float dist = -1.;
  Hit lastHit;
  for (int i = 0; i < 80; i++) {
    vec3 tp = transform(inv_proj_mat, p3) + dir * dist;
    lastHit = sd(tp);
    dist += lastHit.dist;
    if (dist > 50.)
      discard;
    if (abs(lastHit.dist) < 1./512.)
      break;
  }
  vec4 c = hsv(0.,lastHit.which,1.);//1.-pow(sf(lastHit.p.x/10./2.+.5)+0.3, 2.));
  gl_FragColor = c;
  gl_FragColor *= smoothstep(1./256., 0., lastHit.dist);
  gl_FragColor *= smoothstep(20., 0., dist);
  // gl_FragColor += texture2D(u_fb, p3.xy/2.+.5) - 40./256.;
}
