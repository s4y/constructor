#include "/shaders/s4y/common.glsl"

mat4 cam_mat;

uniform sampler2D webcam;
uniform sampler2D last;

uniform float gRotX;
uniform float gRotY;
uniform float gRotZ;
uniform float gTimeOfDay;

const int kSteps = 40;
const float kEpsilon = 1./512.;

struct Hit {
  float dist;
  vec3 p;
  float which;
};

Hit sd(vec3 p, const int steps) {
  float ofs = 0.;
  float fi = 0.;
  float weight = 1.;
  float ws = 0.;
  vec2 pp = p.xz * 0.2;
  for (int i = 0; i < steps; i++) {
    fi += 1.;
    vec2 dir = vec2(cos(fi), sin(fi));
    float x = dot(dir, pp);
    x *= pow(1.18, fi);
    x += t * (2. + 0.1 * fi);
    float d = cos(x);
    pp += normalize(dir) * -d * weight * 0.08;
    ofs += exp(sin(x) - 1.) * weight;
    ws += weight;
    weight = weight * 0.84;
  }
  p.y -= ofs * ws * 0.1;
  p.y += 10.5;
  // dist = min(dist, sdBox(boxP, vec3(0.2)));
  return Hit(p.y, p, 0.);
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p, const int steps) {
    return normalize(vec3(
        sd(vec3(p.x + kEpsilon, p.y, p.z), steps).dist - sd(vec3(p.x - kEpsilon, p.y, p.z), steps).dist,
        sd(vec3(p.x, p.y + kEpsilon, p.z), steps).dist - sd(vec3(p.x, p.y - kEpsilon, p.z), steps).dist,
        sd(vec3(p.x, p.y, p.z  + kEpsilon), steps).dist - sd(vec3(p.x, p.y, p.z - kEpsilon), steps).dist
    ));
}

vec3 bg(vec3 ray) {
  float v;
  vec2 p = ray.xy;
  // p = p/2.+.5;
  for (int i = 0; i < 2; i++) {
    p += abs(p)/(dot(p, p))+t*0.1;
    p = mod(p, 1.);
  }
  float sunZone = distance(ray.xy, mix(vec2(0.8), vec2(-0.4), gTimeOfDay));
  vec3 sunColor = mix(hsv(0.1,.2,1.).rgb, hsv(0.1,2.,1.).rgb, pow(gTimeOfDay, 2.));
  float sun = smoothstep(0.1 + gTimeOfDay * 0.2, 0. + gTimeOfDay * 0.2 - 0.01 + pow(gTimeOfDay, 4.) * 0.1, sunZone);
  vec3 c = mix(hsv(0.6,.5,1.0).rgb, hsv(-0.2, 1., .1).rgb, pow(gTimeOfDay, 1.));
  // c += hsv(sf(length(p)-mod(length(p),1.)) * 0.1, 1., 1.).rgb;// + sun(ray);
  // c += hsv(0.5, 1., sf(abs(ray.x))).rgb * (gTimeOfDay);
  c += texture(last, ray.xy/2.+.5).rgb;
  // c = mix(vec3(1), c, smoothstep(0., 1., mix(ray.y / 2. + 0.5, 1., gTimeOfDay)));
  // c = mix(c, addHsv(vec4(sunColor, 1.), vec3(0., -0.5, -0.1)).rgb, smoothstep(.5 * (1.-gTimeOfDay) + 0.01, 0., sunZone));
  // c = mix(c, sunColor, sun);
  return c;
}

void main() {
  commonInit();
  cam_mat = inverse(rotY(gRotY*PI*2.-PI) * rotX((gRotX - 0.5) * PI) * rotZ(sin(t)*0.0) * translateZ(gRotZ) * perspectiveProj(PI/1.2, u_resolution.x/u_resolution.y, 0.1, 10.));
  // gl_FragColor = vec4(exp(abs(p3.x)-1.));
  // return;
  float aspect = u_resolution.x/u_resolution.y;
  // vec2 fitp = p3.xy * vec2(aspect, 1.);
  // vec2 p = p3.xy;
  // if (u_resolution.x > u_resolution.y)
  //   p.x *= u_resolution.x/u_resolution.y;
  // else
  //   p.y *= u_resolution.y/u_resolution.x;
  vec3 pp = transform(cam_mat, vec3(p3.xy, 0.));
  vec3 dir = normalize(pp);
  vec3 tp;
  float dist = -1.;
  Hit lastHit;
  for (int i = 0; i < kSteps; i++) {
    tp = dir * dist;
    lastHit = sd(tp, 10);
    dist += lastHit.dist;
    if (dist > 50.)
      break;
    if (lastHit.dist < kEpsilon)
      break;
  }

  vec3 norm = estimateNormal(tp, 50);

  tp = dir * dist;
  float fresnel = (0.2 + (1.0-0.2)*(pow(1.0 - max(0.0, dot(-norm, normalize(tp))), 2.0)));

  vec4 c = vec4(fresnel * bg(tp/40.-norm), 1.);

  // c = vec4(vec3(1) * dot(norm, vec3(0,8,-4)), 1);
  // c += vec4(refl(norm), 1.) * fresnel;
  c = pow(c, vec4(1.5));
  // c.a = 1.;
  c *= smoothstep(kEpsilon * 100., kEpsilon, lastHit.dist);
  // c += vec4(bg(vec3(fitp, 0)), 1.) * (1.-c.a);
  gl_FragColor = c;
  // gl_FragColor = vec4(aces_tonemap(c.rgb), 1.);
  // // gl_FragColor *= smoothstep(0.6, 0.5, distance(lastHit.p.xy, vec2(0)));
  gl_FragColor *= smoothstep(120., 80., dist);
  gl_FragColor += vec4(bg(pp), 1.) * (1.-gl_FragColor.a);
  // // gl_FragColor.gb *= 0.;
  // // gl_FragColor += texture2D(u_fb, p3.xy/2.+.5);
}
