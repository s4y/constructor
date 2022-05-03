#include "/shaders/s4y/common.glsl"

precision highp float;
precision highp int;

#define iResolution u_resolution
#define iTime t
#define iMouse (vec2(0., 0.5))

uniform float bri_1;
uniform sampler2D webcam;

uniform float gRotX;
uniform float gRotY;

mat4 cam_mat;

void mainImageStars( out vec4 fragColor, in vec2 fragCoord )
{
  const int iterations = 17;
  const float formuparam = 0.54;
;
  const int volsteps = 1;
  const float stepsize = 0.1;

  const float zoom    = 2.00;
  const float tile    = 0.850;
  const float speed   = 0.101 ;

  const float brightness  = 0.02;
  const float darkmatter  = 0.300;
  const float distfading  = 0.030;
  const float saturation  = 0.550;

	//get coords and direction
	vec2 uv=fragCoord.xy/iResolution.xy-.5;
	uv.y*=iResolution.y/iResolution.x;
	vec3 dir=vec3(uv*zoom,1.);
  dir.y-=t*0.1;
	float time=iTime*speed+.25;

	//mouse rotation
	// float a1=.5+iMouse.x/iResolution.x*2.;
	// float a2=.8+iMouse.y/iResolution.y*2.;
	// mat2 rot1=mat2(cos(a1),sin(a1),-sin(a1),cos(a1));
	// mat2 rot2=mat2(cos(a2),sin(a2),-sin(a2),cos(a2));
	// dir.xz*=rot1;
	// dir.xy*=rot2;
	vec3 from=vec3(1.,.5,0.5);
  from = transform(rotZ(sin(t)*0.1), from);
  dir = transform(rotZ(sin(t)*0.1), dir);
	// from+=vec3(iMouse.x,0.,-2.);
	// from.xz*=rot1;
	// from.xy*=rot2;
	
	//volumetric rendering
	float s=0.1,fade=1.;
	vec3 v=vec3(0.);
	for (int r=0; r<volsteps; r++) {
		vec3 p=from+s*dir*.5;
		// p = abs(vec3(tile)-mod(p,vec3(tile*2.))); // tiling fold
		float pa,a=pa=0.;
		for (int i=0; i<iterations; i++) { 
			p=abs(p)/dot(p,p)-formuparam; // the magic formula
			a=abs(length(p)-pa); // absolute sum of average change
			pa=length(p);
		}
		float dm=max(0.,darkmatter-a*a*.001); //dark matter
		a*=a*a; // add contrast
    // a *= sf(mod(abs(a/100.), 1.));
		// if (r>6) fade*=1.-dm; // dark matter, don't render near
		//v+=vec3(dm,dm*.5,0.);
		// v+=fade;
		v+=vec3(s,s*s,s*s)*a*brightness*fade; // coloring based on distance
		fade*=distfading; // distance fading
		s+=stepsize;
	}
	// v=mix(vec3(length(v)),v,saturation); //color adjust
	fragColor = vec4(v*.1,1.);	
	
}


//
//afl_ext 2017-2019

#define DRAG_MULT 0.048
#define ITERATIONS_RAYMARCH 13
#define ITERATIONS_NORMAL 48

#define Mouse iMouse
#define Resolution (u_resolution)
#define Time (t)

vec2 wavedx(vec2 position, vec2 direction, float speed, float frequency, float timeshift) {
    float x = dot(direction, position) * frequency + timeshift * speed;
    float wave = exp(sin(x) - 1.0);
    float dx = wave * cos(x);
    return vec2(wave, -dx);
}

float getwaves(vec2 position, int iterations){
	float iter = 0.0;
    float phase = 6.0;
    float speed = 2.0;
    float weight = 1.0;
    float w = 0.0;
    float ws = 0.0;
    for(int i=0;i<iterations;i++){
        vec2 p = vec2(sin(iter), cos(iter));
        vec2 res = wavedx(position, p, speed, phase, Time) * mix(1., sf(sin(phase)), 0.);
        position += normalize(p) * res.y * weight * DRAG_MULT;
        w += res.x * weight;
        // w *= fsf(sin(position.y / 10. * weight)/2.+.5) * 3;
        iter += 12.0;
        ws += weight;
        weight = mix(weight, 0.0, 0.2);
        phase *= 1.18;
        speed *= 1.07;
    }
    return w / ws;
}

float raymarchwater(vec3 camera, vec3 start, vec3 end, float depth){
    vec3 pos = start;
    float h = 0.0;
    float hupper = depth;
    float hlower = 0.0;
    vec2 zer = vec2(0.0);
    vec3 dir = normalize(end - start);
    for(int i=0;i<318;i++){
        h = getwaves(pos.xz * 0.1, ITERATIONS_RAYMARCH) * depth - depth;
        if(h + 0.01 > pos.y) {
            return distance(pos, camera);
        }
        pos += dir * (pos.y - h);
    }
    return -1.0;
}

float H = 0.0;
vec3 normal(vec2 pos, float e, float depth){
    vec2 ex = vec2(e, 0);
    H = getwaves(pos.xy * 0.1, ITERATIONS_NORMAL) * depth;
    vec3 a = vec3(pos.x, H, pos.y);
    return normalize(cross(normalize(a-vec3(pos.x - e, getwaves(pos.xy * 0.1 - ex.xy * 0.1, ITERATIONS_NORMAL) * depth, pos.y)), 
                           normalize(a-vec3(pos.x, getwaves(pos.xy * 0.1 + ex.yx * 0.1, ITERATIONS_NORMAL) * depth, pos.y + e))));
}
mat3 rotmat(vec3 axis, float angle)
{
	axis = normalize(axis);
	float s = sin(angle);
	float c = cos(angle);
	float oc = 1.0 - c;
	return mat3(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s, 
	oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s, 
	oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

vec3 getRay(vec2 uv){
	return normalize(transform(kIdentityTransform, vec3(uv*2.-1., 1.0)));
    uv = (uv * 2.0 - 1.0) * vec2(Resolution.x / Resolution.y, 1.0);
	vec3 proj = normalize(vec3(uv.x, uv.y, 1.0) + vec3(uv.x, uv.y, -1.0) * pow(length(uv), 2.0) * 0.05);	
    if(Resolution.x < 400.0) return proj;
	vec3 ray = rotmat(vec3(0.0, -1.0, 0.0), 3.0 * (Mouse.x * 2.0 - 1.0)) * rotmat(vec3(1.0, 0.0, 0.0), 1.5 * (Mouse.y * 2.0 - 1.0)) * proj;
    return ray;
}

float intersectPlane(vec3 origin, vec3 direction, vec3 point, vec3 normal)
{ 
    return clamp(dot(point - origin, normal) / dot(direction, normal), -1.0, 9991999.0); 
}

vec3 extra_cheap_atmosphere(vec3 raydir, vec3 sundir){
  return vec3(1.0);
	sundir.y = max(sundir.y, -0.07);
	float special_trick = 1.0 / (raydir.y * 1.0 + 0.1);
	float special_trick2 = 1.0 / (sundir.y * 11.0 + 1.0);
	float raysundt = 0.;//pow(abs(dot(sundir, raydir)), 2.0);
	float sundt = pow(max(0.0, dot(sundir, raydir)), 8.0);
	float mymie = sundt * special_trick * 0.2;
	vec3 suncolor = mix(vec3(1.0), max(vec3(0.0), vec3(1.0) - vec3(5.5, 13.0, 22.4) / 22.4), special_trick2);
	vec3 bluesky= mulHsv(vec4(0.2, 1.55, 3., 1.), vec3(1,1,bri_1)).rgb;// * suncolor;
	vec3 bluesky2 = max(vec3(0.0), bluesky - vec3(5.5, 13.0, 22.4) * 0.002 * (special_trick + -6.0 * sundir.y * sundir.y));
	bluesky2 *= special_trick * (0.24 + raysundt * 0.24);// * mix(ssf(0.1), pow(fsf(sin(abs(raydir.x))) * smoothstep(1.3, 0.9, distance(raydir.x * 1.3, 0.)) * smoothstep(20.0, 0., raydir.y), 4.), .9);
	return bluesky2 * (1.0 + 1.0 * pow(1.0 - raydir.y, 3.0));
} 
vec3 getatm(vec3 ray){
 	return extra_cheap_atmosphere(ray, normalize(vec3(1.0))) * 0.5;
    
}

float sun(vec3 ray){
 	vec3 sd = normalize(vec3(1.0));   
    return pow(max(0.0, dot(ray, sd)), 528.0) * 110.0;
}

vec3 stars(vec2 uv) {
  vec4 stars;
  mainImageStars(stars, uv*u_resolution*4.);
  return stars.rgb;
}

vec3 bg(vec3 ray) {
  float v;
  vec2 p = ray.xy;
  // p = p/2.+.5;
  for (int i = 0; i < 2; i++) {
    p += abs(p)/(dot(p, p))+t*0.1;
    p = mod(p, 1.);
  }
  return mulHsv(addHsv(gColor, vec3(length(p)/10.,1.,0.)), vec3(1,1,1)).xyz;//sf(length(p)-mod(length(p),1.)))).xyz;// + sun(ray);
}

vec3 aces_tonemap(vec3 color){	
	mat3 m1 = mat3(
        0.59719, 0.07600, 0.02840,
        0.35458, 0.90834, 0.13383,
        0.04823, 0.01566, 0.83777
	);
	mat3 m2 = mat3(
        1.60475, -0.10208, -0.00327,
        -0.53108,  1.10813, -0.07276,
        -0.07367, -0.00605,  1.07602
	);
	vec3 v = m1 * color;    
	vec3 a = v * (v + 0.0245786) - 0.000090537;
	vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
	return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0 / 2.2));	
}
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = p3.xy/2.+.5;
	uv = transform(cam_mat, vec3(uv, 0.)).xy;

	float waterdepth = 3.1;// * ssf(0.1);
	vec3 wfloor = vec3(0.0, -waterdepth, 0.0);
	vec3 wceil = vec3(0.0, 0.0, 0.0);
	vec3 orig = vec3(0.0, 0.0, 0.0);//t * 10.);
	vec3 ray = normalize(vec3(uv*2.-1., 1.));//getRay(orig);
	float hihit = intersectPlane(orig, ray, wceil, vec3(0.0, 1.0, 0.0));
    if(ray.y >= -0.01){
        vec3 C = getatm(ray) + stars(uv) * 0. + bg(ray);
        //tonemapping
    	C = aces_tonemap(C);
     	fragColor = vec4( C,1.0);   
        return;
    }
	float lohit = intersectPlane(orig, ray, wfloor, vec3(0.0, 1.0, 0.0));
    vec3 hipos = orig + ray * hihit;
    vec3 lopos = orig + ray * lohit;
	float dist = raymarchwater(orig, hipos, lopos, waterdepth);
    vec3 pos = orig + ray * dist;

	vec3 N = normal(pos.xz, 0.001, waterdepth);
    vec2 velocity = N.xz * (1.0 - N.y);
    N = mix(vec3(0.0, 1.0, 0.0), N, 1.0 / (dist * dist * 0.01 + 1.0));

    vec3 R = reflect(ray, N);

    float fresnel = (0.04 + (1.0-0.04)*(pow(1.0 - max(0.0, dot(-N, ray)), 5.0)));
	
    vec3 C = fresnel * getatm(R) * 2.0 + fresnel * stars(R.xy) * 0. + fresnel * bg(R);
    //tonemapping
    C = aces_tonemap(C);
    
	fragColor = vec4(C,1.0);
}

void main() {
  commonInit();
  // gl_FragColor = vec4(bg(p3 * vec3(u_resolution.x/u_resolution.y, 1., 1.)), 1.);
  // return;
  cam_mat = inverse(/* transpose(rotX(gRotX) * rotY(gRotY*PI/2.-PI/4.) * rotZ(sin(t * 0.3)*0.1)) * */ perspectiveProj(PI/1.3, u_resolution.x/u_resolution.y, 0.1, 10.));
  mainImage(gl_FragColor, (p3.xy/2.+.5) * Resolution);
}
