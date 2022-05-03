#include "/shaders/s4y/common.glsl"

uniform sampler2D last;

float delt(vec2 uv) {
  float delta = sin(uv.y*10.+sin(((t-mod(t,(1.-(0.01))/150.*60./6.))*10.))*10.);
  delta -= mod(delta, 0.9);
  return delta;
}

void main() {
  commonInit();
  vec2 uv = p3.xy/2.+.5;
  // float delta = sin(uv.x*10.+sin(((t-mod(t,1./150.*60.))*10.)));
  float d = delt(uv);
  uv.y += d;
  uv.x += d;
  vec2 ouv = uv;
  uv = mod(uv, 1.);
  gl_FragColor = texture(last, uv);
  // gl_FragColor.r *= 1. - d * 0.1;
  gl_FragColor = addHsv(gl_FragColor, vec3(delt(uv.yx * 0.75) * 0.00, .0, 0));
}
