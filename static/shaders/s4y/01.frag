precision highp float;

varying vec3 p3;
uniform vec2 u_resolution;
uniform float t;
uniform sampler2D u_freq;
uniform struct {
  float lowpass;
  float highpass;
  float bandpass;
  float notch;
} u_audio;

vec2 p;
float aspect;
vec3 fitp;
vec3 fillp;

#include "./common.glsl"

float sf(float at) {
  return texture2D(u_freq, vec2(at, 0))[0];
}

float dot(vec2 p, float yee) {
  return pow(clamp(distance(p, vec2(0.))-sf(yee)-0.5, 0., 1.), 2.);
}

vec4 fdot(vec2 p, float yee) {
  float bri = dot(p.xy*10.-vec2(0,sf(abs(p.x*10.))), yee);
  return hsv(bri * 0.2, .1, 1.-bri);
}

void main() {
  p = p3.xy;
  aspect = u_resolution.x/u_resolution.y;
  fitp = p3 * (aspect > 1.0 ? vec3(aspect, 1.0, 1.0): vec3(1.0, 1.0 / aspect, 1.0));
  fillp = p3 * (aspect > 1.0 ? vec3(1.0, 1.0 / aspect, 1.0): vec3(aspect, 1.0, 1.0));
  // float f = texture2D(u_freq, vec2(mod(sin(atan(p.y,p.x))/2.+.5, 1.), 0))[0];
  // float bri = step(f*0.5, distance(p.xy, vec2(0))-0.25);
  gl_FragColor += 1.-fdot(mod(transform(rotZ((t*0.05)*0.29), fitp).xy+0.5 + 0.125, .25) - 0.125, 0.1);
  gl_FragColor += 1.-fdot(mod(transform(rotZ((t*0.05)*-0.23), fitp).xy+0.4 + 0.125, .25) - 0.125, 0.2);
  gl_FragColor += 1.-fdot(mod(transform(rotZ((t*0.05)*0.36), fitp).xy+0.6 + 0.125, .25) - 0.125, 0.3);
  gl_FragColor += 1.-fdot(mod(transform(rotZ((t*0.05)*-0.20), fitp).xy+0.3 + 0.125, .25) - 0.125, 0.05);
  gl_FragColor += 1.-fdot(mod(transform(rotZ((t*0.05)*0.39), fitp).xy+0.2 + 0.125, .25) - 0.125, 0.4);
  gl_FragColor.rgb = sin(gl_FragColor.rgb*PI*2.);
  gl_FragColor *= 0.3;
  // gl_FragColor.rgb = 1.-gl_FragColor.rgb;
  // gl_FragColor = vec4(tan(t));

  gl_FragColor *= pow(abs(p.x)+0.6, 5.);
}
