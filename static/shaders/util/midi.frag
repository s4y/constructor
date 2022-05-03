#include "/shaders/s4y/common.glsl"

uniform sampler2D u_fb;
uniform vec4 midiNotes[32];

uniform float midiBeat;

float find(vec3 p, float x) {
  return abs(transform(rotZ(x), p).x);
}

vec3 seek(vec3 x) {
  for (int i = 0; i < 10; i++) {
    x += sin(x.y);//transform(rotZ(0.0), x);
  }
  x = sin(x*PI/2.);
  return x;
}

void main() {
  commonInit();

  vec3 p = p3;// + found * 0.1;
  for (int i = 0; i < midiNotes.length(); i++) {
    p.x += (ssf(p.y)/2.+.5) * 0.1;
    vec4 note = midiNotes[i];
    float vol = (1.-pow(1.-note.z, 10.));
    gl_FragColor += hsv(
        mod(note.y*12., 1.),
        0.5 + vol, 1.) * (
        0.2 * vol * smoothstep(
          0.02 + note.x/4.,
          0.055,
          distance(
            sin(note.y*12.*PI) * 0.5
            / distance(p, vec3(0))
            + (0.5 + vol * 0.1 * sin(note.w*12.))
            * 0.1
            * sin(
              // (sin(note.w*500.)*1.)
              // + note.w
              + distance(p, vec3(0))
              * note.y/12. * 200.
              + t
              * (5.*sin(note.y*100.))
              ), 0.)));

        // (1.-pow(1.-note.y, 10.)) * sin(note.z/10. + p3.x * 20. + t * (1.+sin(note.z)/2.+.5)));
  }

  float found = 0.;
  for (int i = 0; i < 10; i++)
    found += find(p3*5., found*ssf(p.x/20.+.5));

  // vec2 uv = (p.xy * (1.-(found)*0.1))/2.+.5;
  // gl_FragColor = max(gl_FragColor, texture(u_fb, uv) - (1./256.));

  // gl_FragColor.r = seek(gl_FragColor.r);
  int idx = int((p3.x/2.+.5)*32.);
  vec4 note = midiNotes[idx];
  gl_FragColor = hsv(note.y, 1., 1.);
  gl_FragColor *= midiBeat;
  // gl_FragColor = hsv((note.y)*12., 1., note.z);//(1.-pow(1.-note.z, 10.)) * sin(p3.y*10. + sin(note.w) * t * .2));
}
