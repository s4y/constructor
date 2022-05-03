#include "./common.glsl"

float clouds(vec3 p) {
  float yeet = (sin(2.*p.x*0.2*(sin(p.y)-5.)+t*0.1)*sin(p.y*4.+sin(p.x*4.)*0.1))/2.+.5;
  return smoothstep(0.6, 1., yeet);
}

void main() {
  commonInit();

  gl_FragColor = mix(
      vec4(0.6, 0.8, 1, 1),
      vec4(0.9, 1, 1, 1),
      smoothstep(1., -1., p3.y));

  gl_FragColor = mix(gl_FragColor, vec4(1), clouds(p3 + vec3(0, t, 0)));
}
