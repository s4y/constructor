#extension GL_OES_standard_derivatives : enable
precision highp float;

float antialias = 4.;
vec2 center = vec2(0.);
float rate = 0.5;
float warp1 = 0.27;
float warp2 = 0.6667;
float density = 0.5;
float size = 0.5;

uniform sampler2D u_freq;
uniform sampler2D u_smooth_freq;

varying vec3 p3;
uniform vec2 u_resolution;
uniform float t;

float sf(float at) {
  return texture2D(u_freq, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture2D(u_smooth_freq, vec2(at, 0))[0];
}

#define RENDERSIZE u_resolution
#define FRAMEINDEX (t*60.)

/*
{
    "CATEGORIES": [
        "Automatically Converted",
        "Shadertoy"
    ],
    "DESCRIPTION": "",
    "INPUTS": [
        {
            "DEFAULT": [
                0,
                0
            ],
            "LABEL": "center",
            "MAX": [
                1,
                1
            ],
            "MIN": [
                -1,
                -1
            ],
            "NAME": "center",
            "TYPE": "point2D"
        },
        {
            "DEFAULT": 0.5,
            "LABEL": "rate",
            "MAX": 1,
            "MIN": -1,
            "NAME": "rate",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.5,
            "LABEL": "size",
            "MAX": 1,
            "MIN": 0,
            "NAME": "size",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.5,
            "LABEL": "density",
            "MAX": 1,
            "MIN": 0,
            "NAME": "density",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.27,
            "LABEL": "warp1",
            "MAX": 1,
            "MIN": 0,
            "NAME": "warp1",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.6667,
            "LABEL": "warp2",
            "MAX": 1,
            "MIN": 0,
            "NAME": "warp2",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.5,
            "LABEL": "antialias",
            "MAX": 1,
            "MIN": 0,
            "NAME": "antialias",
            "TYPE": "float"
        }
    ],
    "ISFVSN": "2"
}
*/

////////////////////////////////////////////////////////////
// ArrowVortex  by mojovideotech
//
// based on :
// shadertoy.com//XtVXWw
//
// License :
// Creative Commons Attribution-NonCommercial-ShareAlike 3.0
////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    // Create tunnel coordinates (p) and remap to normal coordinates (uv)
    // Technique from @iq: https://www.shadertoy.com/view/Ms2SWW
    // and a derivative:   https://www.shadertoy.com/view/Xd2SWD

#define     twpi    6.283185307179586   // two pi, 2*pi
#define     pi      3.141592653589793   // pi
#define     hfpi    1.570796326794897   // half pi, pi/2, 90deg
#define     rcpi    0.318309886183791   // reciprocal of pi, 1/pi 
#define     R       RENDERSIZE.xy
#define     AA      (1.0+antialias*9.0)/R.y
#define     TT      FRAMEINDEX*rate*0.01
#define     SS      0.05+size*0.1

float fsin(float x){
    float w = fwidth(x);
    return sin(x)*smoothstep(twpi, 0.0, w); 
}

float fcos(float x){
    float w = fwidth(x);
    return cos(x)*smoothstep(twpi, 0.0, w); 
}

vec2 rot(vec2 r, float a){
    mat2 rotate = mat2(fcos(a), -fsin(a), fsin(a), fcos(a));
    return r*rotate;
} 

float polygon(vec2 p, int v, float s) {
    float a = atan(p.x, p.y)+0.2;
    float b = twpi/float(v);
    return cos(floor(0.5+a/b)*b-a)*length(p)-s*clamp(ssf(0.1)*2.,0.,1.5);
}

vec4 arrow_main(vec3 center)
{
    vec2 p = center.xy*2.0-(2.0*gl_FragCoord.xy-R.xy)/min(R.y, R.x);   

    // warp1 = sin(t);
    // warp2 = sin(t);// * ssf(distance(p.xy, vec2(0)) / 10.);

    vec2 uvO = p;
    float rotZ = (warp2+0.07)*sin(1.0+warp2*3.0*sin(length(p*2.5*warp1+0.5)));
    p = rot(p, rotZ);
    float a = atan(p.y,p.x);                                         
    float rS = pow(pow(p.x*p.x,4.0)+pow(p.y*p.y,4.0), 0.25);  
    float rR = length(p);
    float r = mix(rS, rR, 0.5+0.5*warp1); 
    vec2 uv = vec2(0.3/r+TT, a*rcpi);               
    uv += vec2(0.0, 0.25*sin(TT+uv.x*2.0));           
    vec2 rD = fract(uv*floor(3.0+9.0*density)+5.0*sin(TT))-0.5;    
    rD = rot(rD, hfpi); 
    vec2 rP = rD+vec2(0.0, -0.12);
    float col = smoothstep(AA, 0.0, polygon(rP, 4, SS));    
    vec2 tP = rD+vec2(-0.05, 0.15);
    col = max(col, smoothstep(AA, 0.0, polygon(tP, 3, SS))); 
    col = col*r*1.5;
    col += 0.05*length(uvO);
    return vec4(col);
}

float sdSphere(vec3 p, float r) {
  return max(0.0, distance(p, vec3(0.0)) - r);
}

struct Hit {
  float dist;
  vec3 boxP;
};

mat4 rotX(float angle) {
  return mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, cos(angle), -sin(angle), 0.0,
    0.0, sin(angle), cos(angle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rotY(float angle) {
  return mat4(
    cos(angle), 0.0, sin(angle), 0.0,
    0.0, 1.0, 0.0, 0.0,
    -sin(angle), 0.0, cos(angle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 transpose(in highp mat4 inMatrix) {
    highp vec4 i0 = inMatrix[0];
    highp vec4 i1 = inMatrix[1];
    highp vec4 i2 = inMatrix[2];
    highp vec4 i3 = inMatrix[3];

    highp mat4 outMatrix = mat4(
                 vec4(i0.x, i1.x, i2.x, i3.x),
                 vec4(i0.y, i1.y, i2.y, i3.y),
                 vec4(i0.z, i1.z, i2.z, i3.z),
                 vec4(i0.w, i1.w, i2.w, i3.w)
                 );

    return outMatrix;
}

vec3 applyTransform(mat4 t, vec3 p) {
  vec4 p4 = transpose(t) * vec4(p, 1.0);
  return p4.xyz / p4.w;
}

Hit sceneSDF(vec3 boxP) {
  vec3 obp = boxP;
  boxP.z -= 1.0;

  boxP = applyTransform(rotY(t*0.9) * rotX(t), boxP);
  boxP.x *= 1. - sf(abs(boxP.y)/10.) * 0.2;

  return Hit(
    sdSphere(boxP, 0.5),
    boxP
  );
}

const int kSteps = 40;
const float kEpsilon = 1./1024.;

vec3 estimateNormal(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        sceneSDF(vec3(p.x + EPSILON, p.y, p.z)).dist - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)).dist,
        sceneSDF(vec3(p.x, p.y + EPSILON, p.z)).dist - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)).dist,
        sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)).dist - sceneSDF(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}

void main() {
  vec3 p = p3 * vec3(u_resolution.x/u_resolution.y, 1, 1);
  gl_FragColor = arrow_main(p);
  return;

  vec3 dir = vec3(0, 0, 1);
  float surfaceDist = 0.;
  float dist = 0.;
  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = dir * dist + p;
    hit = sceneSDF(tp);
    surfaceDist = hit.dist;
    dist += surfaceDist;

    if (surfaceDist < kEpsilon)
      break;
  }

  if (dist > 1e0) {
    gl_FragColor = arrow_main(p);
    return;
  }

    vec3 hitP = dir * dist + p;

  vec3 norm = estimateNormal(hitP*vec3(1, 1, -0.2));

  gl_FragColor = arrow_main(norm);

  // gl_FragColor += clamp(vec4(1, 0, 1, 1) * dot(norm, normalize(vec3(0, 1, 0))), 0., 1.);
}

