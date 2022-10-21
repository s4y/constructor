if (id != null) {
  w *= 2;
  xx /= 2;
  if (!id) {
    x += w;
    xx -= 0.5;
  } else {
    xx += 0.5;
  }
}



// return false;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3 - 2 * t);
};
const spow = (x, exp) => Math.pow(Math.abs(x), exp) * (x > 0 ? 1 : -1);
const sipow = (x, exp) => (1-Math.pow(1-Math.abs(x), exp)) * (x > 0 ? 1 : -1);

const aspect = w/h;
const dither = ((x+y*6)%4/4) + 0.02;
let bri = 0;

const cdist = (x, y) => Math.sqrt(x*x + y*y);

const smile = (x, y) => {
  return (Math.abs(cdist(x/1.5, y-0.4) - 1.5) < 0.5 && y < 0.0)
    || cdist(x + 1.0, y - 1.0) < 0.7
    || cdist(x - 1.0, y - 1.0) < 0.7;
};

const sign = (x, by) => (x<0)?-1:1;
const smod = (x, by) => (x % by) * sign(x);
const balmod = (x, by) => smod(x+by/2, by) - by/2;

// xx += t * 0.4;
// xx = ((xx+1) % 2) - 1;

// bri += Math.pow(Math.max(0, Math.sqrt(xx * xx + yy * yy / aspect) - 0.5 + 0.5 * Math.pow(ssf(0.05), 10)), 20) > dither;

// yy += Math.sin(xx * 20 + t * 2) * 0.0;// * Math.pow(ssf(Math.abs(xx) / 5) * 0.9, 10.);

// xx = ((((xx/2+.5)+Math.cos(yy*10+t*1)*0.1)%1)*2-1);
// xx = ((((xx/2+.5)+Math.cos(yy*10+t*0.5)*0.5*Math.pow(sf(0.1), 10))%1)*2-1);

// xx += sf(yy/2+.5)*0.1;

// return Math.sin((xx + yy * 0.1 + t * 0.1) * 20) > 0.99;

// yy += ssf((xx+t)%1/2)*2;
// bri += (yy + (Math.sin(xx * 10 + t * 4) + ssf(0.1) * Math.sin(xx * 21 + t * 4) + Math.sin(xx * 54 + t * 4)) * 0.7 < -0.0);

const mul = Math.sin(t*0.1)/2+.5;// - ssf(0.4) * 0.7;
// bri += smile(balmod(xx*aspect*2*mul + t * 1, 10), yy *mul* 2 + 0.2) ? 1 : 0;

// bri += (Math.abs(y-3) < 0.2);

// bri += Math.max(0, Math.pow(Math.sin((xx * 1.1 + t * 0.00) * (yy * 0.11 * aspect + t * 0.0) * aspect / 5 + t * 2), 2.));
// return bri > 0.9;

// bri += Math.pow(sf(Math.abs(xx)) - 0.0, 1) * h - 2 > Math.abs(y-3);

// return beatAmt < 0.5;
// bri += Math.pow(sf(Math.abs(xx)) - 0.05, 4) * h - 2 > Math.abs(y-3);

// bri += smoothstep(1.0, -1.5, Math.sqrt(xx * xx + yy * yy / aspect / aspect) / Math.pow(1-(beat * 1 % 1), 10) - 1.7);
xx += -sipow(Math.sin(((beat/2+0.1)%1) * Math.PI * 2), 4);
yy /= aspect;
// bri += smoothstep(0.4, 0, Math.sqrt(xx * xx + yy * yy));
// bri += Math.max(0, -0.1 + Math.pow(1-beatAmt, 10));


// bri += Math.pow(Math.max(0, sf(Math.abs(xx))-0.5) * 1.8, 4);
bri = Math.abs(bri);
bri = bri % 1.5;

return bri > dither;

let amt = Math.pow(sf(Math.abs(xx)), 5);

return Math.abs(
  yy + (Math.cos(xx * 20 + 100 * t)*amt)) < (3/h);

