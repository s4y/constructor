#extension GL_OES_standard_derivatives : enable
precision highp float;

// #includebase "../t420babe/"
// #include "main.frag"

#includebase "../t420babe/"
#include "./lib/common/peakamp.glsl"

varying vec3 p3;
uniform vec2 u_resolution;
uniform float t;
uniform peakamp u_audio;

#ifndef COMMON_WRAP_TIME
#include "./lib/common/wrap-time.glsl"
#endif

vec2 st;

#include "lib/t420babe/doppler.glsl"

void main() {
  audio = u_audio;
  vec3 color;
  choppy_doppler_square_fractal(p3.xy, t, audio, color);
  gl_FragColor = vec4(color, 1);
}
