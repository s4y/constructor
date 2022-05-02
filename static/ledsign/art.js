const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3 - 2 * t);
};
const spow = (x, exp) => Math.pow(Math.abs(x), exp) * (x > 0 ? 1 : -1);
const sipow = (x, exp) => (1-Math.pow(1-Math.abs(x), exp)) * (x > 0 ? 1 : -1);

const aspect = w/h;
const dither = ((x+y*6)%4/4 + 0.02 * 0.8);
let bri = 0;

// return 0.5 > dither;

return Math.floor(beatAmt * w) == (w-x);

bri += (Math.pow(fsf(Math.abs(xx)/5), 4.) - 0.1) > (yy/2+0.5);

// bri += smoothstep(1.5, 0, Math.sqrt(xx * xx + yy * yy / aspect / aspect) / Math.pow(1-(beat * 1 % 1), 5) - 0.7);
// xx += -sipow(Math.sin(((beat*2)%1) * Math.PI * 2), 4);
// bri += smoothstep(0.8, 0, Math.sqrt(xx * xx + yy * yy / aspect / aspect));

// bri += Math.pow(1-beatAmt, 10);

return bri > dither;

let amt = Math.pow(sf(Math.abs(xx)), 5);

return Math.abs(
  yy + (Math.cos(xx * 20 + 100 * t)*amt)) < (3/h);

