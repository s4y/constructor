#include "./common.glsl"

void main() {
  vec3 p = p3;
  for (float i = 0.; i < 1.; i += 0.1) {
    p = transform(rotZ(0.3 * sin(float(i) * 100.)), p);
    float bri = smoothstep(.01, .001, abs(p.y + sin(p.x * 10. + sin(i * 200.)) * 1.5 * pow(ssf(i/4.), 3.)));
    gl_FragColor += vec4(bri) * i;
  }
}
