#include "/shaders/s4y/common.glsl"

const int kSteps = 40;
const float kEpsilon = 1./256.;

float scene(vec3 p) {
  vec3 op = p;
  p.z -= 1.;
  p.y += sin(sin(t + PI) * p.z * 10.) * 0.1;
  p = transform(kIdentityTransform
    * rotX(t * 0.5)
    * rotY(t * 0.51)
    * rotY(sin(sin(t * 1. + 0.5) * p.y * PI * 0.5) * .1)
  , p);

  return sdBox(p, vec3(0.3));// + sin(op.y * op.z * 10.) * 0.1;
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        scene(vec3(p.x + kEpsilon, p.y, p.z)) - scene(vec3(p.x - kEpsilon, p.y, p.z)),
        scene(vec3(p.x, p.y + kEpsilon, p.z)) - scene(vec3(p.x, p.y - kEpsilon, p.z)),
        scene(vec3(p.x, p.y, p.z  + kEpsilon)) - scene(vec3(p.x, p.y, p.z - kEpsilon))
    ));
}

vec4 bg(vec2 p) {
  float bri = max(sin(p.x * .7) / 2. + .5,
    sin(p.y * .7) / 2. + .5);
  return vec4(1., bri / 1.2, 1., 1.);
}

void main() {
  vec3 p = p3 * vec3(u_resolution.x/u_resolution.y, 1, 1);

  float dist = 0.;
  float hitDist;
  for (int i = 0; i < kSteps; i++) {
    hitDist = scene(p + vec3(0., 0., dist));
    dist += hitDist;
    if (hitDist < kEpsilon)
      break;
  }
  gl_FragColor = vec4(1.);
  vec3 norm = estimateNormal(p + vec3(0., 0., dist));
  gl_FragColor = vec4(bg((norm * 10. + p).xy));
  gl_FragColor *= 1. - smoothstep(10., 11., dist);
  gl_FragColor = clamp(gl_FragColor, vec4(0), vec4(1));
  // gl_FragColor += vec4(0,0,0,1) * (1.-gl_FragColor.a);
}

