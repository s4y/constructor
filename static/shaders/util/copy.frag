precision mediump float;

varying vec3 p3;
uniform sampler2D buf;

void main() {
  gl_FragColor = texture2D(buf, p3.xy/2.+.5);
}
