#include "./common.glsl"

uniform sampler2D webcam;
uniform sampler2D remoteCam;
uniform float remoteCam_aspect;

uniform sampler2D last;
uniform float last_aspect;

uniform sampler2D filt;

const int kSteps = 80;
const float kEpsilon = 1./4096.;

uniform float sndGo;
uniform float midiBeat;
uniform float beat;

const int level = 0;

mat4 inv_proj_mat;
float aspect;

struct Hit {
  float dist;
  vec3 p;
};

float sdSponge4y(vec3 p, vec3 size) {
  return distance(p.xy, vec2(0.)) - size.x;
}

Hit sd(vec3 p) {
  float t = sndGo * .1 + t * 0.1;
  vec3 op = p;
  p.z += 4.;
  // p.z -= t;
  // p *= 4.;
  // p = mod(p + 0.3, .6) - 0.3;
  // p = transform(rotZ(0. * t * PI * 2. / 2. + PI/4.) * rotY(0.0 * sin(t*PI*2. / 32.)), p);
  // p = transform(rotZ(sin(t * PI * 2. / 2.) * -0.1 - PI / 4.), p);
  p = transform(rotZ(p.z * 1.0 * sin(t * .1)), p);
  // p.xy += 0.25;
  // p.y += 0.4;
  // p.z += t * -2.8;

  p = transform(rotY(sin(t*0.2)) * rotX(sin(t*PI*2. / 32. * 0.1)), p);

  vec3 moodP = p;//transform(rotY(0.3)*rotZ(0.3), p);
  // if (abs(moodP.x)<0.05&&abs(moodP.z)<0.05)
  //   moodP.y += t*10.1;
  // else if (abs(moodP.x)<0.05&&abs(moodP.y)<0.05)
  //   moodP.z += t*10.1;
  // else if (abs(moodP.z)<0.05&&abs(moodP.y)<0.05)
  //   moodP.x += t*10.1;
  // moodP = mod(moodP+0.05, .1)-0.05;

  // if (op.z < 1.)
  //   p = mod(p+.25, .5)-.25;
  // p = transform(rotY((t * (120./60.) * PI * 2. * 0.1 + sndGo * 0.1)), p);
  // p = transform(rotY((t * (120./60.) * PI * 2.) * sin((p.y-mod(p.y+0.1/12., .1/6.))*1.) / (op.z+-1.)), p);
  // p = transform(rotY(p.z * 0.01 + t * 0.001), p);
  // p.z += pow(sf(mod(p.y/1.+.5, 1.)), 1.) * 0.5;
  // p.z += 1.;
  // p *= 1. + sin((p.x * 2.2 + p.z * 10. + 10.) * 4.) * sin((p.x * 2. - p.y / 2.) * 6.5) * sin((p.y + p.x * 15.) * 6.0) * 0.000;

  // float dist = min(max(sdMengerSponge(p, vec3(0.06)), sdCross(p, vec2(0.025))), mix(sdMengerSponge(p * (1. - 1.5 * distance(p, vec3(0.))), vec3(0.07)), sdSphere(p, 0.20), -0.5 * pow(ssf(abs(p.x)/10.) + 0.01, 8.)) - 0.0);
  float dist;


  dist = sdMengerSponge(p, vec3(0.6));

  dist = mix(dist, sdSphere(p, 0.6), 0.15);

  // p.xy += .25;
  // if (op.z < 2.0) {
  //   // p.xy += 0.25;
  //   p = mod(p + .125, .25) - 0.125;
  //   p *= 1. - 0.5 * distance(p, vec3(0.));
  // }
  // dist = sdSphere(p, (0.02 + pow(sf(0.05), 3.) * 0.1));

  // if (true) {
  //   // p.y += ssf(mod(p.x/1.+.5, 1.)) * 0.1;
  //   p = mod(p + .5, 1.) - .5;
  //   if (op.z < -1.0) {
  //     p *= 1. - 1.2 * distance(p, vec3(0.));
  //   }
  //   dist = sdBox(p, vec3(0.10 + pow(sf(0.05), 3.) * 0.1));
  // } else {
  //   // p = transform(rotY(sin(p.z * t)), p);
  //   p = mod(p + .5, 1.) - .5;
  //   dist = sdBox(p, vec3(0.09 * (.5 + 0.5 * (1.-midiBeat))));
  // }
  // p.y *= 1. + 0.6 * ssf(mod(abs(p.x)/4., 1.));
  // p = transform(rotY((sf(mod(p.y / 1. + t, 1.)) * 1.)), p);
  // dist = sdSphere(p, .17 * (1.-0.0*pow(sf(p.x/100.), 4.))) * -1.;
  // dist = mix(dist, sdMengerSponge(p + vec3(sin(p.z + p.x * 1.1)*10., 0, 0), vec3(1.))*1., 0.0);
  // dist = sdBox(p, vec3(0.07));
  return Hit(dist/4., p);
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

  // p.x /= aspect;// / webcam_aspect;
  // p.x /= last_aspect;
  // p.z = -p.z/10.;

  // return texture(remoteCam, p.xy * 10./2.+vec2(0.25, 0.5));

  // p.z += pow(ssf(1.-mod(p.z*1., 1.)), 2.);
  return hsv(mod(p.z*10., 1.)*0.1, .0, pow(sf(mod(p.z+p.x, 1.)), 1.));
  // return addHsv(vec4(texture(remoteCam, p.xy * 10./2.+.5).rgb, 1.), vec3(p.x+sndGo, 0., 0.));
  // return vec4(pow(texture(last, p.xy/2.+.5).rgb * 0.5, vec3(1.)), 1.);
}

vec4 march(vec3 p) {
  vec3 dir = normalize(transform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float enterDist = 0.;
  float thiccness = 0.;
  float dist = -1.02;
  bool inside = false;

  vec4 light;

  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = transform(inv_proj_mat, p) + dir * dist;
    hit = sd(tp);
    surfaceDist = hit.dist;
    dist += inside ? -surfaceDist : surfaceDist;

    if (surfaceDist < kEpsilon && !inside) {
      enterDist = dist;
      // dir += estimateNormal(transform(inv_proj_mat, p) + dir * dist) * 0.1;
      inside = true;
    } else if (-surfaceDist < kEpsilon && inside) {
      inside = false;
      // light += hsv(dist * 0.1, 0., 1.) * (dist - enterDist);
      break;
    }
    // if (dist > 1e2)
    //   discard;
  }
  if (inside) {
    thiccness = 1.;
  }

  vec3 hitP = transform(inv_proj_mat, p) + dir * dist;
  vec3 norm = estimateNormal(hitP);

  light += hsv(1./3., 0.2, 1.) * pow(clamp(dot(normalize(vec3(-1,0.5,2)), norm), 0., 1.), 1.);
  light += hsv(hitP.z * 0.4 + 0.2, 1., 1.) * pow(clamp(dot(normalize(vec3(1,1,-1)), norm) + 0.1, 0., 1.), 1.);
  light.a = 1.;
  // vec4 light = vec4(abs(norm), 1.) * smoothstep(0., 2., dist - enterDist);
  // light = pow(light, vec4(5.));
  // light = bg(transform(inverse(inv_proj_mat), hitP)) * (1.-light.a) + light;
  // light = mulHsv(bg(norm + hitP), vec3(1,0.5,0.9)) * (1.-light.a) + light;
  // hitP *= length(fwidth(hitP));
  // light *= smoothstep(kEpsilon*20., kEpsilon, surfaceDist);
  light *= smoothstep(10., 0., dist);
  // light += bg(p) * (1.-light.a);
  // light -= vec4(length(fwidth(hitP)));
  return light;
  vec3 lightHsv = rgb2hsv(light.rgb);
  // lightHsv[2] = 1.-lightHsv[2];
  return vec4(hsv2rgb(lightHsv), 1.);

  // vec2 texp = vec2(atan(hitP.z, hitP.x)/(PI*2.)+0.75, hitP.y/PI/10.+0.5);
  // light += vec4(texture(last, texp).xyz, 1.) * (1.-light.a);
  return mix(light, bg(norm), smoothstep(kEpsilon, kEpsilon * 2., enterDist));
}

void main() {
  commonInit();

  // level = int(texture(filt, p3.xy/2.+.5).x * 2.);

  aspect = u_resolution.x/u_resolution.y;
  inv_proj_mat = inverse(perspectiveProj(
    PI/3.5, aspect, 0.3, 10.0
  ));

  gl_FragColor = march(p3);
}
