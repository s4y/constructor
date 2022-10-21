#include "/shaders/s4y/common.glsl"

uniform sampler2D last;

void main() {
  commonInit();

  mat3 neighborhood[3] = getNeighborhood(last, p3.xy/2.+.5, u_resolution * 2.);

  vec3 r = convolve(neighborhood, edgeKernelV);
  gl_FragColor = vec4(max(max(r.r, r.g), r.b));
}
