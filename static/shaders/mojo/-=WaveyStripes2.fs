/*{
    "CATEGORIES": [
        "generator",
        "stripes",
        "contours",
        "iterations",
        "waves"
    ],
    "CREDIT": "by mojovideotech",
    "DESCRIPTION": "",
    "INPUTS": [
        {
            "DEFAULT": [
                0,
                0
            ],
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
            "MAX": 1,
            "MIN": 0,
            "NAME": "zoom",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.33,
            "MAX": 1,
            "MIN": 0,
            "NAME": "density",
            "TYPE": "float"
        },
        {
            "DEFAULT": 57,
            "MAX": 100,
            "MIN": 1,
            "NAME": "seed",
            "TYPE": "float"
        },
        {
            "DEFAULT": 0.25,
            "MAX": 1,
            "MIN": 0,
            "NAME": "rate",
            "TYPE": "float"
        },
        {
            "DEFAULT": true,
            "NAME": "vertical",
            "TYPE": "bool"
        },
        {
            "DEFAULT": false,
            "NAME": "autopan",
            "TYPE": "bool"
        }
    ],
    "ISFVSN": "2"
}
*/


////////////////////////////////////////////////////////////
// WaveyStripes  by mojovideotech
//
// based on :
// shadertoy.com/wlsfRn  by Inigo Quilez (IQ) 
//
// License :
// Creative Commons Attribution-NonCommercial-ShareAlike 3.0
////////////////////////////////////////////////////////////


#define   ag     0.414213562  // silver ratio
#define   twpi   6.283185307    // two pi, 2*pi


float N11(float n) { return fract(sin(n)*43349.4437); }

float noise(vec2 p) {
	 float S1 = floor(seed), S2 = S1+1.0;
	 vec2 i = floor(p), f = fract(p);
	 f = f*f*(3.0-2.0*f);
	 float n = i.x+i.y*S1;
	 return mix(mix( N11(n+0.0), N11(n+1.0), f.x),
					mix( N11(n+S1), N11(n+S2), f.x), f.y);
}

float fsin(float x){
    float w = fwidth(x);
    return sin(x)*smoothstep(twpi, 0.0, w);
}

float fcos(float x){
    float w = fwidth(x);
    return cos(x)*smoothstep(twpi, 0.0, w);
}

vec2 map(vec2 p, float T) {
	 for( int i=0; i<4; i++ ){
	 float a = noise(p*ag)*twpi+T;
		p += 0.1*vec2(fcos(a), fsin(a));
	 }
	 return p;
}

float height( in vec2 p, in vec2 q ) {
	 float h = dot(p-q,p-q);
	 h += 0.005*noise(p);
	 return h;
}


void main() 
{
	 vec3 col = vec3(0.0);
	 vec2 R = RENDERSIZE;
	 float A = max(R.x, R.y), T = TIME*(rate+0.01), t = T*0.25;
	 vec2 uv = (gl_FragCoord.xy-R)/A;
	 if (autopan) uv -= normalize(vec2(fsin(t), fcos(t)))-center*0.5;
		else uv -= center;
	 uv *= 6.0-zoom*4.0;
	 if (vertical) { uv.xy = uv.yx; }
	 vec2 p = uv.yx, q = map(p, T);
	 float w = (20.0*density+10.0)*q.x;
	 float u = floor(w), f = fract(w);
	 col = vec3(0.7, 0.55, 0.5) + 0.3*sin(3.0*u+vec3(0.0, 1.5, 2.0));
	 float sha = smoothstep(0.0, 0.5, f)-smoothstep(0.8, 1.0, f);
	 vec2  eps = vec2(A, 0.0);
	 float l2c = height(q,p);
	 float l2x = height(map(p+eps.xy ,T),p)-l2c;
	 float l2y = height(map(p+eps.yx, T),p)-l2c;
	 vec3  nor = normalize(vec3(l2x, eps.x, l2y));   
	 col *= 0.3+0.7*sha;
	 col *= 0.8+0.2*vec3(1.0, 0.9, 0.3)*dot(nor, vec3(0.7, 0.3, 0.7));
	 col += 0.3*pow(nor.y, 8.0)*sha;

  gl_FragColor = vec4(col, 1.0);
}
