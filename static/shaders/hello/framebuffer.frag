#include "/shaders/s4y/common.glsl"

uniform sampler2D u_fb;

void main() {
  float bri = step(abs(sin(p3.x * 10. + t) * 0.3 + p3.y / sin(t)), 0.01);
  gl_FragColor = vec4(bri);

  gl_FragColor += texture2D(u_fb, vec2(p3.xy/2.+.5) + vec2(0.001, 0.00)) - 0.002;
}
