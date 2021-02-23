precision mediump float;

uniform float u_fade;

void main() {
  gl_FragColor = vec4(0, 0, 0, 1) * u_fade;
}
