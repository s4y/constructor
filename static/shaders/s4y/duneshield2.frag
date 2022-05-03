#include "./common.glsl"

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
  p.z += 0.5;

  p = transform(rotX(t * -0.7), p);
  // p = transform(rotY(t * 0.1) * rotX(t * 0.11), p);

  vec3 oop = p;
  oop = transform(rotY(t * 1.0) * rotX(t * 1.1), oop);

  p = transform(rotY(-stepmod(atan(p.z, p.x), PI/4.)), p);
  // p = transform(rotX(-stepmod(atan(p.y, p.z), PI/8.)), p);
  // p.z -= 0.1;
  // p.z *= 0.0;

  float dist = p.z + 0.1;

  // dist = max(dist, -sdBox(oop, vec3(0.05)));

  // dist = sdSphere(p, 0.1);

  return Hit(dist/2., oop);
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
  return vec4(normalize(p), 1.);
}

vec4 march(vec3 p) {
  vec3 odir = normalize(transform(inv_proj_mat, p));
  vec3 dir = odir;
  vec3 lightdir = vec3(0,0,0);
  float surfaceDist = 0.;
  float enterSurfaceDist = 0.;
  float enterDist = 0.;
  float dist = -1.;
  bool inside = false;
  bool backtrack = false;

  vec4 light;

  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    dist += inside ? max(.01, -surfaceDist) : backtrack ? -surfaceDist : surfaceDist;
    vec3 tp = transform(inv_proj_mat, p) + dir * dist;
    hit = sd(tp);
    surfaceDist = hit.dist;

    if (inside && !backtrack && surfaceDist > 0.) {
      inside = false;
      backtrack = true;
    } else if (!inside && !backtrack && surfaceDist < kEpsilon) {
      enterDist = dist;
      enterSurfaceDist = surfaceDist;
      vec3 norm = estimateNormal(transform(inv_proj_mat, p) + dir * dist) * -.5;
      lightdir += norm;
      dir += norm * -0.5;
      break;
      inside = true;
    } else if (backtrack && surfaceDist < kEpsilon) {
      vec3 norm = estimateNormal(transform(inv_proj_mat, p) + dir * dist) * .5;
      lightdir += norm;
      backtrack = false;
      dir += norm * 0.5;
    }
    if (dist > 10.)
      break;
  }

  vec3 hitP = transform(inv_proj_mat, p) + odir * enterDist;
  vec3 norm = estimateNormal(hitP);
  vec3 texP = p + lightdir * 0.5;//norm * -0.3 + transform(inverse(inv_proj_mat), hitP);

  light += hsv(0./3., .0, 1.) * pow(clamp(dot(normalize(vec3(-1,0.5,-1)), norm), 0., 1.), 2.);
  light += hsv(2./3., .0, 1.) * pow(clamp(dot(normalize(vec3(1,1,-1)), norm) + 0.1, 0., 1.), 2.);
  // light += vec4(1.) * smoothstep(0., 1., dist - enterDist);
  // light = pow(light, vec4(5.));
  // light = bg(transform(inverse(inv_proj_mat), hitP)) * (1.-light.a) + light;
  // light = mulHsv(bg(norm + hitP), vec3(1,0.5,0.9)) * (1.-light.a) + light;
  light += bg(texP) * (1.-light.a) + light;
  light *= smoothstep(7., 6., dist);
  light *= smoothstep(kEpsilon*2., kEpsilon, enterSurfaceDist);
  light.a = 1.;
  return light;

  // vec2 texp = vec2(atan(hitP.z, hitP.x)/(PI*2.)+0.75, hitP.y/PI/10.+0.5);
  // light += vec4(texture(last, texp).xyz, 1.) * (1.-light.a);
  return mix(light, bg(norm), smoothstep(kEpsilon, kEpsilon * 2., enterDist));
}

void main() {
  commonInit();

  aspect = u_resolution.x/u_resolution.y;
  inv_proj_mat = inverse(perspectiveProj(
    PI/3.5, aspect, 0.3, 10.0
  ));

  gl_FragColor += march(p3);
  // gl_FragColor += texture(filt, p3.xy/2.+.5) * (1.-gl_FragColor.a);

}
