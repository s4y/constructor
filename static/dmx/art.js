// xx += 1;
// xx += Math.random() - 0.5;

function rgb2hsv(r,g,b) {
  let v=Math.max(r,g,b), c=v-Math.min(r,g,b);
  let h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
  return [60*(h<0?h+6:h), v&&c/v, v];
}

function hsv2rgb(h,s,v) 
{                              
  let f= (n,k=(n+h/60)%6) => v - v*s*Math.max( Math.min(k,4-k,1), 0);     
  return [f(5),f(3),f(1)];       
}   

let bri = 1;

// const c = [0.5, 0.5 * (Math.pow(Math.cos(yy + + Math.sin(x * 0.5 + t * 0.2) * 0.1 + Math.sin(x + t) * 0.5), 4)), 0.5]
let snd = Math.max(0, sf(Math.abs(xx) / 2) - (1-(yy/2+0.5)));
snd = Math.pow(snd + 0.8, 200);
snd = 0;
let c = [0, 0, 0];

bri = 0.0 + 0.2 * Math.pow(Math.sin((xx/2+0.5) * 2 - t * 1.07) / 2 + 0.5, 10) * (Math.sin(Math.abs(xx * 2) + t * 4.2)/2+0.5) * (Math.sin(Math.abs(yy * 0.5 + t * 2.2))/2+10.5);

// c = [0.5, 0, 0.5];

c = [
  0 * camid.data[x * 4 + (Math.floor(y/2+0.2)) * 8 * 8 + 0] / 255,
  0 * camid.data[x * 4 + (Math.floor(y/2+0.2)) * 8 * 8 + 1] / 255,
  0 * camid.data[x * 4 + (Math.floor(y/2+0.2)) * 8 * 8 + 2] / 255,
];

let hs = rgb2hsv(...c);
hs[0] += 365/3*2;
c = hsv2rgb(...hs);

// c[1] += bri * 1;

// c[0] += 0;
// c[1] += 1;
// c[2] += 0;

if (x == 6 || x == 4 || x == 5)  {
  // c[0] += 1.4;
}

// c[0] += 1 * (Math.pow(1 - beat * 1 % 1, 8));
// c[1] += 0 * (1-Math.pow(beat * 2 % 1, 2));
// c[2] += 0.0 * (1-Math.pow(beat * 2 % 1, 2));
// c[1] += bri;
// c[2] += bri;

if (!preview) {
  c[0] *= 0.2;
  c[1] *= 0.2;
  c[2] *= 0.2;
}

const flare = 0.2 * Math.pow(Math.cos(Math.abs(xx) - beat*Math.PI*2)/2+0.5, 50);

// for (let i = 0; i < 1; i++)
//   c[i] = Math.max(c[i], flare);

return c.map(x => Math.max(x, 0));
