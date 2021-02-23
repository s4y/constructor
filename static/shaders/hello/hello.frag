#extension GL_OES_standard_derivatives : enable
#include "/shaders/s4y/common.glsl"

// #includebase "../t420babe/"
// #include "main.frag"

#includebase "../t420babe/"
#include "./lib/common/peakamp.glsl"

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
  gl_FragColor *= step(distance(p3.xy, vec2(0)), color.b*0.6);
  gl_FragColor *= 1.-distance(p3.xy, vec2(0));
}
