precision highp float;

uniform sampler2D u_freq;
uniform sampler2D u_smooth_freq;

varying vec3 p3;
uniform vec2 u_resolution;
uniform float t;

float sf(float at) {
  return texture2D(u_freq, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture2D(u_smooth_freq, vec2(at, 0))[0];
}

struct Hit {
  float dist;
  vec3 boxP;
};

mat4 rotX(float angle) {
  return mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, cos(angle), -sin(angle), 0.0,
    0.0, sin(angle), cos(angle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 rotY(float angle) {
  return mat4(
    cos(angle), 0.0, sin(angle), 0.0,
    0.0, 1.0, 0.0, 0.0,
    -sin(angle), 0.0, cos(angle), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

mat4 inverse(mat4 m) {
  float
      a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3],
      a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3],
      a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3],
      a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3],

      b00 = a00 * a11 - a01 * a10,
      b01 = a00 * a12 - a02 * a10,
      b02 = a00 * a13 - a03 * a10,
      b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11,
      b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30,
      b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30,
      b09 = a21 * a32 - a22 * a31,
      b10 = a21 * a33 - a23 * a31,
      b11 = a22 * a33 - a23 * a32,

      det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  return mat4(
      a11 * b11 - a12 * b10 + a13 * b09,
      a02 * b10 - a01 * b11 - a03 * b09,
      a31 * b05 - a32 * b04 + a33 * b03,
      a22 * b04 - a21 * b05 - a23 * b03,
      a12 * b08 - a10 * b11 - a13 * b07,
      a00 * b11 - a02 * b08 + a03 * b07,
      a32 * b02 - a30 * b05 - a33 * b01,
      a20 * b05 - a22 * b02 + a23 * b01,
      a10 * b10 - a11 * b08 + a13 * b06,
      a01 * b08 - a00 * b10 - a03 * b06,
      a30 * b04 - a31 * b02 + a33 * b00,
      a21 * b02 - a20 * b04 - a23 * b00,
      a11 * b07 - a10 * b09 - a12 * b06,
      a00 * b09 - a01 * b07 + a02 * b06,
      a31 * b01 - a30 * b03 - a32 * b00,
      a20 * b03 - a21 * b01 + a22 * b00) / det;
}

mat4 perspectiveProj(float fov, float aspect, float near, float far) {
  float f = 1.0 / tan(fov/2.0);
  return mat4(
    f / aspect, 0.0, 0.0, 0.0,
    0.0, f, 0.0, 0.0,
    0.0, 0.0, (far + near) / (far - near), 1.0,
    0.0, 0.0, (2.0 * far * near) / (near - far), 0.0
  );
}

mat4 transpose(in highp mat4 inMatrix) {
    highp vec4 i0 = inMatrix[0];
    highp vec4 i1 = inMatrix[1];
    highp vec4 i2 = inMatrix[2];
    highp vec4 i3 = inMatrix[3];

    highp mat4 outMatrix = mat4(
                 vec4(i0.x, i1.x, i2.x, i3.x),
                 vec4(i0.y, i1.y, i2.y, i3.y),
                 vec4(i0.z, i1.z, i2.z, i3.z),
                 vec4(i0.w, i1.w, i2.w, i3.w)
                 );

    return outMatrix;
}

vec3 applyTransform(mat4 t, vec3 p) {
  vec4 p4 = transpose(t) * vec4(p, 1.0);
  return p4.xyz / p4.w;
}

float sdSphere(vec3 p, float r) {
  return max(0.0, distance(p, vec3(0.0)) - r);
}

Hit sceneSDFa(vec3 p) {
  p.z -= t;

	// p = cos(p*0.01*sin(distance(p.xy, vec2(0))*.05) + sin(p.zyx));
	vec2 aa = cos(p.xz*0.01*sin(p.y*.5) - sin(p.zx));

  return Hit(length(aa + 0.5) - 1., p);
}

Hit sceneSDFb(vec3 p) {
  p.z -= t;

	vec3 bb = cos(p*0.01*sin(p.y*.05) + sin(p.zyx));

  return Hit(length(bb) - 1., p);
}

const int kSteps = 100;
const float kEpsilon = 1./1024.;

const float PI = asin(1.0) * 2.;

vec3 estimateNormal(vec3 p) {
    const float EPSILON = kEpsilon;
    return normalize(vec3(
        sceneSDF(vec3(p.x + EPSILON, p.y, p.z)).dist - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)).dist,
        sceneSDF(vec3(p.x, p.y + EPSILON, p.z)).dist - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)).dist,
        sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)).dist - sceneSDF(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}

void main() {
  float aspect = u_resolution.x/u_resolution.y;
  mat4 inv_proj_mat = inverse(perspectiveProj(
    PI/1.5, aspect, 0.1, 10.0
  ));

  vec3 p = p3 * vec3(u_resolution.x/u_resolution.y, 1, 1);
  vec3 dir = normalize(applyTransform(inv_proj_mat, p));
  float surfaceDist = 0.;
  float dist = 0.;
  Hit hit;
  for (int i = 0; i < kSteps; i++) {
    vec3 tp = applyTransform(inv_proj_mat, p) + dir * dist;
    hit = sceneSDF(tp);
    surfaceDist = hit.dist;
    dist += surfaceDist;

    if (surfaceDist < kEpsilon)
      break;
  }

  if (dist > 1e2) {
    discard;
  }

  vec3 hitP = dir * dist + p;
  vec3 norm = estimateNormal(hitP*vec3(1, 1, -0.2));

  vec4 color = vec4(0, 0, 0, 1);
  color += vec4(0.05, 0, 0, 1) * dot(hitP, normalize(vec3(0, 1, -2)));
  color += vec4(0, 0, 1, 1) * dot(hitP, normalize(vec3(0, -1, 0)));

  gl_FragColor = sin(color);
  color *= -1./dist;

}
