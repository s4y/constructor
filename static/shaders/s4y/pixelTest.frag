precision highp float;

uniform sampler2D u_freq;
uniform sampler2D u_smooth_freq;

varying vec3 p3;
uniform vec2 u_resolution;
uniform float t;

void main() {
  vec2 p = p3.xy;
  gl_FragColor = vec4(smoothstep(-0.001, 0.001, p.y + sin(p.x+t)*0.8));
  // gl_FragColor = vec4((mod(gl_FragCoord.x, 2.) ^ mod(gl_FragCoord.y, 2.)));
}
