attribute vec3 p_in;
varying vec3 p3;

void main() {
  p3 = p_in;
  gl_Position = vec4(p_in, 1);
}
