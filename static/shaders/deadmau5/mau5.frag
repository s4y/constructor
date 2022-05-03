precision highp float;

uniform sampler2D u_freq;
uniform sampler2D u_smooth_freq;

const float PI = asin(1.0) * 2.;

uniform vec2 u_resolution;
uniform vec3 p3;
uniform float t;

vec4 uColor = vec4(1,0,0,1);
float uSize = 1.;
float uGrid = 1.;
float uSmooth = 0.0025;
float uRotate = 0.;
vec2 uOffset = vec2(0.5,0.5);

float sf(float at) {
  return texture2D(u_freq, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture2D(u_smooth_freq, vec2(at, 0))[0];
}


mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

float logo(vec2 glob_uv, float feather, float uSize, float uRotate, float id_index){
    glob_uv *= uSize;
    glob_uv = rotate2d(uRotate) * glob_uv - vec2(.0,0.115);

    // base head circle

    float head_size = .238;
    float eyed = length(glob_uv + vec2(0.,0.115));
    float c = smoothstep(head_size,head_size - feather,eyed);


    // mouth

    float size_mouth = .202;
    float mouth = length(glob_uv * vec2(0.98,1.01) + vec2(0.,0.115));
    float mask_mouth = length(glob_uv * vec2(0.85,12.) + vec2(0.,1.4));
    float mask = smoothstep(size_mouth,size_mouth - feather,mouth) - smoothstep(size_mouth,size_mouth - feather*5.,mask_mouth);
    mask *= 1. - step(-0.125,glob_uv.y);

    c *= 1. - mask;

    // left ear

    float size_ear = .22;

    vec2 left_ear_uv = glob_uv - vec2(-0.27,0.135);
    left_ear_uv.y += left_ear_uv.x/10.;
    c += smoothstep(size_ear + 0.005,size_ear + 0.005 - feather,length(left_ear_uv * vec2(0.98, 1.05)));
    float left_ear = length((rotate2d(-.6) * (glob_uv + vec2(0.28,-0.138))) * vec2(0.98, 1.05));
    c += smoothstep(size_ear,size_ear - feather,left_ear);

    // right ear

    vec2 right_ear_uv = glob_uv - vec2(0.27,0.135);
    right_ear_uv.y -= right_ear_uv.x/10.;
    c += smoothstep(size_ear + 0.005,size_ear + 0.005 - feather,length(right_ear_uv * vec2(0.98, 1.05)));
    float right_ear = length((rotate2d(.6) * (glob_uv + vec2(-0.28,-0.138))) * vec2(0.98, 1.05));
    c += smoothstep(size_ear,size_ear - feather,right_ear);

    // left eye

    float size_eye = 0.07;

    vec2 left_eye_uv = glob_uv - vec2(-0.13,0.004);
    vec2 left_eye = (rotate2d(0.75) * left_eye_uv) * vec2(1.,1.2);
    c *= 1. - (smoothstep(size_eye + feather,size_eye,length(left_eye)) * step(0.,left_eye.y));
    left_eye_uv = (rotate2d(0.85) * left_eye_uv) * vec2(0.95,1.45);
    c *= 1. - smoothstep(size_eye + feather,size_eye,length(left_eye_uv));

    // right eye

    vec2 right_eye_uv = glob_uv - vec2(0.13,0.004);
    vec2 right_eye = (rotate2d(-0.75) * right_eye_uv) * vec2(1.,1.2);
    c *= 1. - (smoothstep(size_eye + feather,size_eye,length(right_eye)) * step(0.,right_eye.y));
    right_eye_uv = (rotate2d(-0.85) * right_eye_uv) * vec2(0.95,1.45);
    c *= 1. - smoothstep(size_eye + feather,size_eye,length(right_eye_uv));

    return c;
}

struct TDOutputInfo {
  vec2 res;
};

// out vec4 fragColor;
void main()
{
    TDOutputInfo uTDOutputInfo = TDOutputInfo(u_resolution);

    vec2 p = p3.xy;
    vec2 uv = vec2(gl_FragCoord.xy/u_resolution);//vUV.st - .5;
    vec2 glob_uv = vec2(.0);
    vec2 id = vec2(.0);
    float aspect = uTDOutputInfo.res.x / uTDOutputInfo.res.y;

    float thump = pow(sf(0.02),4.);

    uv.x = ((uv.x*2.-1.) * aspect)/2.+.5;
    uv.y = ((uv.y*2.-1.)*(1.+sf((abs(uv.x*2.-1.))/5.)*thump))/2.+.5;

    // uRotate = sin(t)/2.+.5;

    // uv = fract(uv * vec2(uGrid * aspect,uGrid));
    // id = floor(uv * vec2(uGrid * aspect,uGrid));
    glob_uv = (uv - uOffset);

    vec4 color = uColor;
    float feather = uSmooth;

    float id_index = id.x + id.y;

    float c = logo(glob_uv, feather, uSize, uRotate, id_index);

    // c += logo(glob_uv - vec2(1.), feather, uSize, uRotate, id_index);
    // c += logo(glob_uv - vec2(0.,1.), feather, uSize, uRotate, id_index);
    // c += logo(glob_uv - vec2(1.,0.), feather, uSize, uRotate, id_index);

    c = clamp(1.,0.,c);

    vec4 fin_color = vec4(mix(uColor.rgb, vec3(0,0,1), thump) * c, c);

    gl_FragColor = fin_color;
    // fragColor = TDOutputSwizzle(fin_color);
}
