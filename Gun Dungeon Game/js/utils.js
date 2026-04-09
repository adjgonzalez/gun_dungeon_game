function rand(min, max)   { return Math.random() * (max - min) + min; }
function randInt(min, max){ return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(a, b)       { return Math.hypot(a.x - b.x, a.y - b.y); }
function choice(arr)      { return arr[Math.floor(Math.random() * arr.length)]; }

function rectOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
         Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}
