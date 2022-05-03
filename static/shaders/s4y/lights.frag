#include "/shaders/s4y/common.glsl"

float light(vec3 p, float f, float ff) {
  return pow(clamp(1.-pow(distance(p.xy*10., vec2(0)) * (1.0 - ff*0.4) - 2., 2.), 0., 1. + f*3.), 20.);
}

void main() {
  vec3 p = p3 * vec3(u_resolution.x/u_resolution.y, 1, 1);
  for (int i = 0; i < 50; i++) {
    float a = float(i)/50. * PI * 2. + t * (0.+(sin(t*0.1)/2.+.5)*0.001);
    float r = 0.5;//(sin(t))*0.5 * (1.+ssf(mod(a*5., 1.)));
    float pp = light(p + vec3(cos(a)*r, sin(a+t*0.2)*r, 0.), (sin(t*10.)/2.+.5)*3., sf(mod(float(i)/50.*50., 0.5))) * (1.+sf(float(i)/40.));
    gl_FragColor = max(gl_FragColor, hsv(mod(a, 0.2), fsf(0.2)*2., 1.) * pp);
  }
}
