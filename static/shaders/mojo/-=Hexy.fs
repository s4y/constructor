/*
{
    "CATEGORIES": [
        "Automatically Converted",
        "GLSLSandbox"
    ],
    "DESCRIPTION": "Automatically converted from http://glslsandbox.com/e#70108.0",
    "INPUTS": [
        {
            "DEFAULT": [
                0,
                0
            ],
            "LABEL": "center",
            "MAX": [
                1,
                1
            ],
            "MIN": [
                -1,
                -1
            ],
            "NAME": "center",
            "TYPE": "point2D"
        },
        {
            "DEFAULT": 0.5,
            "LABEL": "rate",
            "MAX": 1,
            "MIN": -1,
            "NAME": "rate",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.5,
            "LABEL": "scale",
            "MAX": 1,
            "MIN": 0,
            "NAME": "scale",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.6667,
            "LABEL": "rot",
            "MAX": 1,
            "MIN": 0,
            "NAME": "rot",
            "TYPE": "float"
        },
        {
            "DEFAULT": 1.0,
            "LABEL": "density",
            "MAX": 1,
            "MIN": 0,
            "NAME": "density",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.75,
            "LABEL": "bright",
            "MAX": 1,
            "MIN": 0,
            "NAME": "bright",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.333,
            "LABEL": "shape",
            "MAX": 1,
            "MIN": 0,
            "NAME": "shape",
            "TYPE": "float"
        }
    ],    "ISFVSN": "2"
}
*/

////////////////////////////////////////////////////////////
// Hexy   by mojovideotech
//
// based on
// glslsandbox.com//e#70108.0
//
// Creative Commons Attribution-NonCommercial-ShareAlike 3.0
////////////////////////////////////////////////////////////


#define     twpi    6.283185307 
#define     R       RENDERSIZE.xy
#define     T       TIME*rate*3.0



vec2 fcos(vec2 x){
    vec2 w = fwidth(x);
    return cos(x)*smoothstep(twpi, 0.0, w); 
}

vec2 fsin(vec2 x){
    vec2 w = fwidth(x);
    return sin(x)*smoothstep(twpi, 0.0, w); 
}

float fcos(float x){
    float w = fwidth(x);
    return cos(x)*smoothstep(twpi, 0.0, w); 
}

float fsin(float x){
    float w = fwidth(x);
    return sin(x)*smoothstep(twpi, 0.0, w); 
}

vec2 rotate(vec2 v, float a) {
	float s = sin(a),c = cos(a);
	mat2 m = mat2(c, -s, s, c);
	return m * v;
}

float hexDist(vec2 n) {
	n = abs(n);
    float c = dot(n, normalize(vec2(1.0, 1.73)));
    c = max(c, n.x);
    return c;
}

bool inHex(vec2 n, float r) { return hexDist(n) < r; }


void main()
{
	float s = 20.0+15.0*fsin(fcos(1e16));    
    float r = shape+0.15;
    vec2 uv = (gl_FragCoord.xy-R)/min(R.x,R.y);
    uv *= 1.0-scale*0.9;
    uv -= center;
    uv = rotate(uv, twpi*rot); 
    vec2 hex = vec2(2.0-density, 1.73);
    vec2 halfHex = hex*0.5;
    vec2 f1 = mod(uv*s, hex)-halfHex;
    vec2 f2 = mod(uv*s-halfHex, hex)-halfHex;
    vec2 gv;
    if (length(f1) < length(f2)){gv = f1;} 
        else {gv = f2;}
    vec2 id = (uv*s)-gv;
    vec3 col = vec3(0.0);
    float r2 = fcos(T+id.x+id.x*id.x+id.y*fcos(id.x*id.y))*r;
    float r3 = fsin(T-id.x-id.x*id.x-id.y)*r;
    col.rg = (id.xy+s)*(1.0/s);
  	col.rg *= fcos(col.rg)/fsin(col.rg);
    col.rgb *= inHex(gv, r2) ? 1.0 : 0.5; 
    col.rgb -= inHex(gv, r-0.05) ? 0.5 : 0.0;  
    col.b = fcos(col.r)*bright; 
    col.rgb += 0.5+0.25*fcos(T*0.25);
    
    gl_FragColor = vec4(col, 1.0);
}
