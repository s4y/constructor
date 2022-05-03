precision highp float;

varying vec3 p3;
uniform vec2 u_resolution;
uniform float t;
uniform sampler2D u_freq;
uniform sampler2D u_smooth_freq;

float sf(float at) {
  return texture2D(u_freq, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture2D(u_smooth_freq, vec2(at, 0))[0];
}

void main() {
  vec2 p = p3.xy;
  p *= 10.;
  if (p.x > 1.)
    discard;
  if (p.x < -1.)
    discard;
  if (p.y > 0.)
    gl_FragColor = vec4(sf(p.x/2.+.5));
  else
    gl_FragColor = vec4(ssf(p.x/2.+.5));
  gl_FragColor *= vec4(0, 1, 0, 1);
}
