#include "/shaders/s4y/common.glsl"

precision highp float;

uniform float spinny;
mat4 rotation;

bool isnan(float x){
return !(x <= 0.0 || 0.0 <= x);
}

float fsin(float x) {
float w = fwidth(x);
return sin(x) * smoothstep(PI*2., 0., w);
}

float flower(vec2 p, float c) {
float angle = atan(p.x, p.y);
float a = angle + sin(distance(p, vec2(0.0)) + t * 0.11);
a += c;
a = sin(a * 5.) / 3.;
a = sin(a + (1.-distance(p, vec2(0.))))/2.+.5;
a += t * 0.05;
a = sin(a * PI * 2.)/2.+.5;
return a;
}

vec4 bg(vec3 norm, vec3 p) {
vec3 tp = norm - p;

float o = 0.;
for (int i = 0; i < 10; i++) {
  o = flower(tp.xy * .5, o);
}
return vec4(vec3(o), 1.);
}

const int kSteps = 40;
const float kEpsilon = 1./512.;

// https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdBoundingBox( vec3 p, vec3 b, float e )
{
     p = abs(p  )-b;
vec3 q = abs(p+e)-e;
return min(min(
    length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
    length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
    length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
}

struct Hit {
float dist;
vec3 boxP;
};

Hit sceneSDF(vec3 boxP) {
boxP.z -= 1.0;
boxP.xy /= 2.;
boxP = (rotation * vec4(boxP, 1.)).xyz;
// boxP = (rotX(sin(boxP.x*1.+t)) * vec4(boxP, 1.)).xyz;
float big = 0.5;
return Hit(
  min(sdSphere(boxP, big), sdBoundingBox(boxP, vec3(big), big*.4 * pow(sf(boxP.y/20.+0.5), 3.))),
  boxP);
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 estimateNormal(vec3 p) {
  return normalize(vec3(
      sceneSDF(vec3(p.x + kEpsilon, p.y, p.z)).dist - sceneSDF(vec3(p.x - kEpsilon, p.y, p.z)).dist,
      sceneSDF(vec3(p.x, p.y + kEpsilon, p.z)).dist - sceneSDF(vec3(p.x, p.y - kEpsilon, p.z)).dist,
      sceneSDF(vec3(p.x, p.y, p.z  + kEpsilon)).dist - sceneSDF(vec3(p.x, p.y, p.z - kEpsilon)).dist
  ));
}

vec3 phongalate(vec3 pos, vec3 norm, vec3 lightPos, float shiny, vec3 specColor, vec3 diffColor) {
  return vec3(0)
    + specColor * pow(max(dot(norm, normalize(lightPos - pos)), 0.), 1000.)
    + diffColor * pow(max(0., dot(norm, normalize(lightPos - pos))), 10.);
  ;
}

vec4 marchBox(vec3 p, bool recur);

vec4 colorAt(vec3 norm, vec3 boxP, vec3 hitP, vec3 ray) {
// return vec4(ray, 1.);
// return bg(norm*-5., hitP);
vec3 ap = abs(boxP);
float edge = pow(clamp(max(
  max(min(ap.x, ap.z), min(ap.y, ap.z)), min(ap.x, ap.y)), 0., 1.) + 0.01, 100.);
float outl = pow(clamp(max(
  max(min(ap.x, ap.z), min(ap.y, ap.z)), min(ap.x, ap.y)), 0., 1.), 20.);
outl *= clamp(pow(sf(0.2), 4.), 0., 1.);
vec3 lighted = vec3(0);
// lighted += max(vec3(0), vec3(0.5,0,0) * dot(normalize(vec3(0.2,1,0.6)), norm));
lighted += phongalate(boxP, norm, vec3(-3,4,-10), 1., vec3(1), vec3(1., .5, 1.)) * clamp(sf(0.), 0., 1.);

// float pat = sin(boxP.x * boxP.z * 40. + t * 0.1);

return bg(norm*-5., hitP) * .8 + vec4(lighted, 1.);
}

vec4 marchBox(vec3 p, bool recur) {
vec4 tp = vec4(p, 1.);
tp.z += 1.;
// tp.y /= max(0.1, sf(abs(tp.x)));
vec3 ray = normalize(tp.xyz);

float surfaceDist = 0.;
float dist = 0.;
Hit hit;
for (int i = 0; i < kSteps; i++) {
  hit = sceneSDF(p + ray * dist);
  surfaceDist = hit.dist;
  dist += surfaceDist;

  if (surfaceDist < kEpsilon)
    break;
  if (dist > 1e1)
    return vec4(0);
}
dist = clamp(dist, 0., 20.);

if (surfaceDist > kEpsilon * 2.)
  return vec4(0);
if (isnan(dist) || isnan(surfaceDist))
  return vec4(0);

vec3 hitP = p + ray * clamp(dist, 0., 20.);
vec3 norm = estimateNormal(hitP);

vec4 ret = colorAt(norm, hit.boxP, hitP, ray);
return ret;
}

void main() {
  vec3 p = p3 * vec3(1. * (u_resolution.x/u_resolution.y), 1., 1.) * 1.5;
  rotation = transpose(rotZ(t*0.1) * rotY(t * 0.06 + pow(sin(t * 0.1), 0.)*10.) * rotX(t * 0.01));
  vec4 boxC = marchBox(p, false);
  gl_FragColor = boxC;
}


