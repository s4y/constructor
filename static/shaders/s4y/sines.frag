#include "./common.glsl"

void main() {
  for (float i = 0.; i < 1.; i += 0.1) {
    float bri = smoothstep(.01, .001, abs(p3.y + sin(p3.x * 10. + t + i * 10.) * 0.5 * pow(sf(i/4.), 3.)));
    gl_FragColor += vec4(bri) * i;
  }
}
