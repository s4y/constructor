#include "/shaders/s4y/common.glsl"

precision mediump float;

uniform sampler2D buf;

void main() {
  gl_FragColor = texture(buf, p3.xy/2.+.5);
}
