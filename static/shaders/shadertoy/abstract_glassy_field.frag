#extension GL_OES_standard_derivatives : enable
precision highp float;

varying vec3 p3;
uniform sampler2D u_freq;
uniform sampler2D u_smooth_freq;
uniform float u_fade;

uniform float t;
float /* uniform sampler2D */ iChannel0;
float /* uniform sampler2D */ iChannel1;

uniform vec2 u_resolution;
vec2 iResolution;
float iTime;

vec4 texture(float tex, vec2 uv) {
  return vec4(0.);//vec4(sin(uv.x*uv.y*.05)) * vec4(1,0.0,0.0,1);//texture2D(tex, uv);
}

float sf(float at) {
  return texture2D(u_freq, vec2(at, 0))[0];
}

float ssf(float at) {
  return texture2D(u_smooth_freq, vec2(at, 0))[0];
}

float antialias = 4.;
vec2 center = vec2(0.);
float rate = 0.4;
float warp1 = 0.27;
float warp2 = 0.6667;
float density = 0.5;
float size = 0.5;
vec2 coord;

#define RENDERSIZE u_resolution
#define FRAMEINDEX (t*60.)

/*

	Abstract Glassy Field
	---------------------

	An abstract, blobby-looking field - rendered in the style of hot, glowing glass. It was 
	produced using cheap low-budget psuedoscience. :)

	The surface was constructed with a spherized sinusoidal function, of sorts. I like it, because 
	it's very cheap to produce, mildly reminiscent of noise and allows a camera to pass through it 
	without having to resort to trickery.

	The fluid filled glass look is fake, but at least interesting to look at. Basically, it was
	produced by indexing the reflected and refracted surface rays into a 3D tri-planar texture
	lookup. By the way, I've tried the real thing on this particular surface - with multiple ray 
	bounces and so forth - and to say it's slower is an understatement. :)

	By the way, if anyone is aware of some cheap and simple improvements, corrections, etc, feel
	free to let me know.

*/



#define     twpi    6.283185307179586   // two pi, 2*pi
#define     pi      3.141592653589793   // pi
#define     hfpi    1.570796326794897   // half pi, pi/2, 90deg
#define     rcpi    0.318309886183791   // reciprocal of pi, 1/pi 
#define     R       RENDERSIZE.xy
#define     AA      (1.0+antialias*9.0)/R.y
#define     TT      FRAMEINDEX*rate*0.01
#define     SS      0.05+size*0.1

float fsin(float x){
    float w = fwidth(x);
    return sin(x)*smoothstep(twpi, 0.0, w); 
}

float fcos(float x){
    float w = fwidth(x);
    return cos(x)*smoothstep(twpi, 0.0, w); 
}

vec2 rot(vec2 r, float a){
    mat2 rotate = mat2(fcos(a), -fsin(a), fsin(a), fcos(a));
    return r*rotate;
} 

float polygon(vec2 p, int v, float s) {
    float a = atan(p.x, p.y)+0.2;
    float b = twpi/float(v);
    return cos(floor(0.5+a/b)*b-a)*length(p)-s*clamp(ssf(0.1)*2.,0.,1.5);
}








#define FAR 50. // Far plane, or maximum distance.

//float objID = 0.; // Object ID

float accum; // Used to create the glow, by accumulating values in the raymarching function.

// 2x2 matrix rotation. Note the absence of "cos." It's there, but in disguise, and comes courtesy
// of Fabrice Neyret's "ouside the box" thinking. :)
mat2 rot2( float a ){ vec2 v = sin(vec2(1.570796, 0) - a);	return mat2(v, -v.y, v.x); }


// Tri-Planar blending function. Based on an old Nvidia writeup:
// GPU Gems 3 - Ryan Geiss: https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch01.html
vec3 tpl( float t, in vec3 p, in vec3 n ){
    
    n = max(abs(n) - .2, 0.001);
    n /= dot(n, vec3(1));
	vec3 tx = texture(t, p.zy).xyz;
    vec3 ty = texture(t, p.xz).xyz;
    vec3 tz = texture(t, p.xy).xyz;
    
    // Textures are stored in sRGB (I think), so you have to convert them to linear space 
    // (squaring is a rough approximation) prior to working with them... or something like that. :)
    // Once the final color value is gamma corrected, you should see correct looking colors.
    return (tx*tx*n.x + ty*ty*n.y + tz*tz*n.z);
}


// Camera path.
vec3 camPath(float t){

  return vec3(0, t, t);
  
    //return vec3(0, 0, t); // Straight path.
    //return vec3(-sin(t/2.), sin(t/2.)*.5 + 1.57, t); // Windy path.
    
    //float s = sin(t/24.)*cos(t/12.);
    //return vec3(s*12., 0., t);
    
    float a = sin(t * 0.11);
    float b = cos(t * 0.14);
    return vec3(a*4. -b*1.5, b*1.7 + a*1.5, t);
    
}


// A fake, noisy looking field - cheaply constructed from a spherized sinusoidal
// combination. I came up with it when I was bored one day. :) Lousy to hone in
// on, but it has the benefit of being able to guide a camera through it.
float map(vec3 p){
 
    p.xy -= camPath(p.z).xy; // Perturb the object around the camera path.
    
     
	p = cos(p*.315*1.25 + sin(p.zxy*.875*1.25)); // 3D sinusoidal mutation.
    
    
    float n = length(p); // Spherize. The result is some mutated, spherical blob-like shapes.

    // It's an easy field to create, but not so great to hone in one. The "1.4" fudge factor
    // is there to get a little extra distance... Obtained by trial and error.
    return (n - 1.025)*1.33;
    
}

/*
// Alternative, even more abstract, field.
float map(vec3 p){
    
    p.xy -= camPath(p.z).xy; // Perturb the object around the camera path.
   
	p = cos(p*.1575 + sin(p.zxy*.4375)); // 3D sinusoidal mutation.
    
    // Spherize. The result is some mutated, spherical blob-like shapes.
    float n = dot(p, p); 
    
    p = sin(p*3.+cos(p.yzx*3.)); // Finer bumps. Subtle.
    
    return (n - p.x*p.y*p.z*.35 - .9)*1.33; // Combine, and we're done.
    
}
*/


// I keep a collection of occlusion routines... OK, that sounded really nerdy. :)
// Anyway, I like this one. I'm assuming it's based on IQ's original.
float cao(in vec3 p, in vec3 n)
{
	float sca = 1., occ = 0.;
    for(float i=0.; i<5.; i++){
    
        float hr = .01 + i*.35/4.;        
        float dd = map(n * hr + p);
        occ += (hr - dd)*sca;
        sca *= 0.7;
    }
    return clamp(1.0 - occ, 0., 1.);    
}


// Standard normal function. It's not as fast as the tetrahedral calculation, but more symmetrical.
vec3 nr(vec3 p){

	const vec2 e = vec2(0.002, 0);
	return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), 
                          map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}



// Basic raymarcher.
float trace(in vec3 ro, in vec3 rd){
    
    accum = 0.;
    float t = 0.0, h;
    for(int i = 0; i < 128; i++){
    
        h = map(ro+rd*t);
        // Note the "t*b + a" addition. Basically, we're putting less emphasis on accuracy, as
        // "t" increases. It's a cheap trick that works in most situations... Not all, though.
        if(abs(h)<0.001*(t*.25 + 1.) || t>FAR) break; // Alternative: 0.001*max(t*.25, 1.)
        t += h;
        
        // Simple distance-based accumulation to produce some glow.
        if(abs(h)<.35) accum += (.35-abs(h))/24.;
        
    }

    return min(t, FAR);
}


// Shadows.
float sha(in vec3 ro, in vec3 rd, in float start, in float end, in float k){

    float shade = 1.0;
    const int maxIterationsShad = 24; 

    float dist = start;
    float stepDist = end/float(maxIterationsShad);

    for (int i=0; i<maxIterationsShad; i++){
        float h = map(ro + rd*dist);
        //shade = min(shade, k*h/dist);
        shade = min(shade, smoothstep(0.0, 1.0, k*h/dist));

        dist += clamp(h, 0.01, 0.2);
        
        // There's some accuracy loss involved, but early exits from accumulative distance function can help.
        if (abs(h)<0.001 || dist > end) break; 
    }
    
    return min(max(shade, 0.) + 0.4, 1.0); 
}


// Texture bump mapping. Four tri-planar lookups, or 12 texture lookups in total.
vec3 db( float tx, in vec3 p, in vec3 n, float bf){
   
    const vec2 e = vec2(0.001, 0);
    
    // Three gradient vectors rolled into a matrix, constructed with offset greyscale texture values.    
    mat3 m = mat3( tpl(tx, p - e.xyy, n), tpl(tx, p - e.yxy, n), tpl(tx, p - e.yyx, n));
    
    vec3 g = vec3(0.299, 0.587, 0.114)*m; // Converting to greyscale.
    g = (g - dot(tpl(tx,  p , n), vec3(0.299, 0.587, 0.114)) )/e.x; g -= n*dot(n, g);
                      
    return normalize( n + g*bf ); // Bumped normal. "bf" - bump factor.
	
}

// Compact, self-contained version of IQ's 3D value noise function. I have a transparent noise
// example that explains it, if you require it.
float n3D(vec3 p){
    
	const vec3 s = vec3(7, 157, 113);
	vec3 ip = floor(p); p -= ip; 
    vec4 h = vec4(0., s.yz, s.y + s.z) + dot(ip, s);
    p = p*p*(3. - 2.*p); //p *= p*p*(p*(p * 6. - 15.) + 10.);
    h = mix(fract(sin(h)*43758.5453), fract(sin(h + s.x)*43758.5453), p.x);
    h.xy = mix(h.xz, h.yw, p.y);
    return mix(h.x, h.y, p.z); // Range: [0, 1].
}



vec3 arrow_main(vec3 center)
{
    vec2 p = center.xy*2.0-(2.0*coord.xy-R.xy)/min(R.y, R.x);   

    // warp1 = sin(t);
    // warp2 = sin(t);// * ssf(distance(p.xy, vec2(0)) / 10.);

    vec2 uvO = p;
    float rotZ = (warp2+0.07)*sin(1.0+warp2*3.0*sin(length(p*2.5*warp1+0.5)));
    p = rot(p, rotZ);
    float a = atan(p.y,p.x);                                         
    float rS = pow(pow(p.x*p.x,4.0)+pow(p.y*p.y,4.0), 0.25);  
    float rR = length(p);
    float r = mix(rS, rR, 0.5+0.5*warp1); 
    vec2 uv = vec2(0.3/r+TT, a*rcpi);               
    uv += vec2(0.0, 0.25*sin(TT+uv.x*2.0));           
    vec2 rD = fract(uv*floor(3.0+9.0*density)+5.0*sin(TT))-0.5;    
    rD = rot(rD, hfpi); 
    vec2 rP = rD+vec2(0.0, -0.12);
    float col = smoothstep(AA, 0.0, polygon(rP, 4, SS));    
    vec2 tP = rD+vec2(-0.05, 0.15);
    col = max(col, smoothstep(AA, 0.0, polygon(tP, 3, SS))); 
    col = col*r*1.5;
    col += 0.05*length(uvO);
    return vec3(col);
}

// Simple environment mapping.
vec3 envMap(vec3 rd, vec3 n){
    
    vec3 col = arrow_main(rd);
    // vec3 col = tpl(iChannel1, rd*4., n);
    return smoothstep(0., 1., col);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    
    
	// Screen coordinates.
	vec2 u = (fragCoord - iResolution.xy*.5)/iResolution.y;
	
	// Camera Setup.
    float speed = 4.;
    vec3 o = camPath(iTime*speed); // Camera position, doubling as the ray origin.
    vec3 lk = camPath(iTime*speed + .25);  // "Look At" position.
    vec3 l = camPath(iTime*speed + 2.) + vec3(0, 1, 0); // Light position, somewhere near the moving camera.


    // Using the above to produce the unit ray-direction vector.
    float FOV = 3.14159/2.; ///3. FOV - Field of view.
    vec3 fwd = normalize(lk-o);
    vec3 rgt = normalize(vec3(fwd.z, 0, -fwd.x )); 
    vec3 up = cross(fwd, rgt);

    // Unit direction ray.
    //vec3 r = normalize(fwd + FOV*(u.x*rgt + u.y*up));
    // Lens distortion.
    vec3 r = fwd + FOV*(u.x*rgt + u.y*up);
    r = normalize(vec3(r.xy, (r.z - length(r.xy)*.125)));


    // Raymarch.
    float t = trace(o, r);
    
    // Save the object ID directly after the raymarching equation, since other equations that
    // use the "map" function will distort the results. I leaned that the hard way. :)
    //float sObjID = objID;

    // Initialize the scene color to the background.
    vec3 col = vec3(0);
    
    // If the surface is hit, light it up.
    if(t<FAR){
    
        // Position.
        vec3 p = o + r*t;
		
        // Normal.
        vec3 n = nr(p);
        
        // Sometimes, it's handy to keep a copy of the normal. In this case, I'd prefer the
        // bumps on the surface to not have as much influence on the reflrection and 
        // refraction vectors, so I tone down the bumped normal with this. See the reflection
        // and refraction lines.
        vec3 svn = n;
        
        // Texture bump the normal.
        float sz = 1./3.; 
        n = db(iChannel0, p*sz, n, .1/(1. + t*.25/FAR));

        l -= p; // Light to surface vector. Ie: Light direction vector.
        float d = max(length(l), 0.001); // Light to surface distance.
        l /= d; // Normalizing the light direction vector.

        
        float at = 1./(1. + d*.05 + d*d*.0125); // Light attenuation.
        
        // Ambient occlusion and shadowing.
        float ao =  cao(p, n);
        float sh = sha(p, l, 0.04, d, 16.);
        
        // Diffuse, specular, fresnel. Only the latter is being used here.
        float di = max(dot(l, n), 0.);
        float sp = pow(max( dot( reflect(r, n), l ), 0.), 64.); // Specular term.
        float fr = clamp(1.0 + dot(r, n), .0, 1.); // Fresnel reflection term.
 
         
        
        // Texturing - or coloring - the surface. The "color"' of glass is provide by the surrounds...
        // of it's contents, so just make it dark.
        vec3 tx = vec3(.05); // tpl(iChannel0, p*sz, n);
         

		// Very simple coloring.
        col = tx*(di*.1 + ao*.25) + vec3(.5, .7, 1)*sp*2. + vec3(1, .7, .4)*pow(fr, 8.)*.25;
 
        // Very cheap, and totally fake, reflection and refraction. Obtain the reflection and
        // refraction vectors at the surface, then pass them to the environment mapping function.
        // Note that glass and fluid have different refractive indices, so I've fudged them into 
        // one figure.
        vec3 refl = envMap(normalize(reflect(r, svn*.5 + n*.5)), svn*.5 + n*.5);
        vec3 refr = envMap(normalize(refract(r, svn*.5 + n*.5, 1./1.35)), svn*.5 + n*.5);
        
        /*
		// You can also index into a 3D texture, but I prefer the above.
        vec3 refl = texture(iChannel2, normalize(reflect(r, svn*.5 + n*.5))).xyz;
        vec3 refr = texture(iChannel2, normalize(refract(r, svn*.5 + n*.5, 1./1.31))).xyz;
        refl *= refl*.5;
        refr *= refr*.5;
        */
        
        // More fake physics that looks like real physics. :) Mixing the reflection and refraction 
        // colors according to a Fresnel variation.
        vec3 refCol = mix(refr, refl, pow(fr, 5.)); //(refr + refl)*.5; // Adding them, if preferred.
        
        // Obviously, the reflected\refracted colors will involve lit values from their respective
        // hit points, but this is fake, so we're just combining it with a portion of the surface 
        // diffuse value.
        col += refCol*((di*di*.25+.75) + ao*.25)*1.5; // Add the reflected color. You could combine it in other ways too.
        
        // Based on IQ's suggestion: Using the diffuse setting to vary the color slightly in the
        // hope that it adds a little more depth. It also gives the impression that Beer's Law is 
        // taking effect, even though it clearly isn't. I might try to vary with curvature - or some other
        // depth guage - later to see if it makes a difference.
        col = mix(col.xzy, col, di*.85 + .15); 
        
        // Glow.
        // Taking the accumulated color (see the raymarching function), tweaking it to look a little
        // hotter, then combining it with the object color.
        vec3 accCol = vec3(1, .3, .1)*accum;
        vec3 gc = pow(min(vec3(1.5, 1, 1)*accum, 1.), vec3(1, 2.5, 12.))*.5 + accCol*.5;
        col += col*gc*12.;
        
        
        // Purple electric charge.
        float hi = abs(mod(t/1. + iTime/3., 8.) - 8./2.)*2.;
        vec3 cCol = vec3(.01, .05, 1)*col*1./(.001 + hi*hi*.2);
        col += mix(cCol.yxz, cCol, n3D(p*3.));
 		// Similar effect.
        //vec3 cCol = vec3(.01, .05, 1)*col*abs(tan(t/1.5 + iTime/3.));
        //col += cCol;
 
        
        // Apply some shading.
        col *= ao*sh*at;

        
    }
    
    
    // Blend in a bit of light fog for atmospheric effect.
    vec3 fog = vec3(.125, .04, .05)*(r.y*.5 + .5);    
    col = mix(col, fog, smoothstep(0., .95, t/FAR)); // exp(-.002*t*t), etc. fog.zxy

    
    // Subtle vignette.
    u = fragCoord/iResolution.xy;
    col = mix(vec3(0), col, pow( 16.0*u.x*u.y*(1.0-u.x)*(1.0-u.y) , .125)*.5 + .5);

 
    
    // Rough gamma correction, and we're done.
    fragColor = vec4(sqrt(clamp(col, 0., 1.)), 1);
    
    
}

void main() {
  iResolution = u_resolution;
  iTime = t;
  coord = (p3.xy/2.+.5)*u_resolution;
  mainImage(gl_FragColor, (p3.xy/2.+.5)*u_resolution);
  // gl_FragColor *= vec4(1,0,0,1);
  // gl_FragColor = pow(gl_FragColor, vec4(10.));
  gl_FragColor *= u_fade;
}

