#include "./common.glsl"

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

float dot(vec2 p, float yee) {
  return pow(clamp(distance(p, vec2(0.))-sf(yee)-0.2, 0., 1.), 2.);
}

vec4 fdot(vec2 p, float yee) {
  float bri = dot(p.xy*10.-vec2(0,sf(abs(p.x*10.))), yee);
  return hsv(bri * 0.2, 1., 1.-bri);
}

void main() {
  gl_FragColor = vec4(1.);
  return;
  p = p3.xy;
  aspect = u_resolution.x/u_resolution.y;
  fitp = p3 * (aspect > 1.0 ? vec3(aspect, 1.0, 1.0): vec3(1.0, 1.0 / aspect, 1.0));
  fillp = p3 * (aspect > 1.0 ? vec3(1.0, 1.0 / aspect, 1.0): vec3(aspect, 1.0, 1.0));
  // float f = texture2D(u_freq, vec2(mod(sin(atan(p.y,p.x))/2.+.5, 1.), 0))[0];
  // float bri = step(f*0.5, distance(p.xy, vec2(0))-0.25);
  gl_FragColor += 1.-fdot(mod(transform(rotZ(t*0.29), fitp).xy+0.5 + 0.25, .5) - 0.25, 0.1);
  gl_FragColor += 1.-fdot(mod(transform(rotZ(t*-0.23), fitp).xy+0.4 + 0.25, .5) - 0.25, 0.2);
  gl_FragColor += 1.-fdot(mod(transform(rotZ(t*0.36), fitp).xy+0.6 + 0.25, .5) - 0.25, 0.3);
  gl_FragColor += 1.-fdot(mod(transform(rotZ(t*-0.20), fitp).xy+0.3 + 0.25, .5) - 0.25, 0.05);
  gl_FragColor += 1.-fdot(mod(transform(rotZ(t*0.39), fitp).xy+0.2 + 0.25, .5) - 0.25, 0.4);
  gl_FragColor.rgb = sin(gl_FragColor.rgb*PI*2.);
  // gl_FragColor.rgb = 1.-gl_FragColor.rgb;
  // gl_FragColor = vec4(tan(t));
}
