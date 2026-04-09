const keys  = {};
const mouse = { x: 0, y: 0, down: false };

window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

function initInput(canvas) {
  canvas.addEventListener('mousemove',    e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  canvas.addEventListener('mousedown',    e => { if (e.button === 0) mouse.down = true; });
  canvas.addEventListener('mouseup',      e => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('contextmenu',  e => e.preventDefault());
}
