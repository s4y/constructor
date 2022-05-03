#include "./common.glsl"

uniform sampler2D u_fb;

uniform float sndGo;

void main() {
  float t = sndGo;
  float bri = smoothstep(.01, .001, abs(p3.y / fsf(0.01) + sin(p3.x * 10. + t) * 0.3));
  vec4 l = texture(u_fb, p3.xy/2.+.5);
  gl_FragColor = vec4(bri);// + l - (1./256.);
}
