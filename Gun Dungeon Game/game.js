// ─────────────────────────────────────────────
//  GUNGEON SURVIVORS  –  game.js
// ─────────────────────────────────────────────

const canvas  = document.getElementById('game-canvas');
const ctx     = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const mctx    = minimap.getContext('2d');

// ── Resize ────────────────────────────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Constants ─────────────────────────────────
const TILE      = 48;
const ROOM_W    = 17;   // tiles wide
const ROOM_H    = 13;   // tiles tall
const HALL_LEN  = 4;    // tiles long hallway
const HALL_W    = 3;    // tiles wide hallway

const DIRS = { N:[0,-1], S:[0,1], E:[1,0], W:[-1,0] };
const OPP  = { N:'S', S:'N', E:'W', W:'E' };

// ── Input ─────────────────────────────────────
const keys  = {};
const mouse = { x: 0, y: 0, down: false };
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if(e.button===0) mouse.down = true; });
canvas.addEventListener('mouseup',   e => { if(e.button===0) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ── Utilities ─────────────────────────────────
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── World / Tile map ──────────────────────────
// Each cell: 0=void, 1=floor, 2=wall, 3=door
let worldMap = [];    // 2D array [row][col]
let worldW, worldH;
let rooms = [];       // { x, y, w, h, cx, cy, type, cleared, enemies:[] }
let currentRoom = 0;
let spawnRoomIdx = 0;
let bossRoomIdx  = 0;

function setTile(tx, ty, v) {
  if (ty >= 0 && ty < worldH && tx >= 0 && tx < worldW) worldMap[ty][tx] = v;
}
function getTile(tx, ty) {
  if (ty < 0 || ty >= worldH || tx < 0 || tx >= worldW) return 2;
  return worldMap[ty][tx];
}

// ── Dungeon Generation ────────────────────────
function generateDungeon() {
  // Grid of room slots
  const GRID = 5;
  const grid = Array.from({length:GRID}, () => Array(GRID).fill(null));
  const placed = [];

  // Start from center
  const start = {gx:2, gy:2};
  grid[start.gy][start.gx] = { type:'start' };
  placed.push({gx:2, gy:2});

  const TARGET = 10; // total rooms
  let attempts = 0;
  while (placed.length < TARGET && attempts < 1000) {
    attempts++;
    const src = choice(placed);
    const dir = choice(['N','S','E','W']);
    const [dx,dy] = DIRS[dir];
    const nx = src.gx + dx, ny = src.gy + dy;
    if (nx<0||nx>=GRID||ny<0||ny>=GRID) continue;
    if (grid[ny][nx]) continue;
    const type = placed.length === TARGET-1 ? 'boss' : 'normal';
    grid[ny][nx] = { type, from: OPP[dir], fromGx: src.gx, fromGy: src.gy };
    placed.push({gx:nx, gy:ny});
  }

  // Convert to pixel map
  const PW = ROOM_W + HALL_LEN*2 + 2;
  const PH = ROOM_H + HALL_LEN*2 + 2;
  worldW = GRID * PW + 4;
  worldH = GRID * PH + 4;
  worldMap = Array.from({length:worldH}, () => Array(worldW).fill(0));

  rooms = [];
  const roomsByGrid = {};

  placed.forEach(({gx, gy}) => {
    const info = grid[gy][gx];
    const ox = gx * PW + 2;
    const oy = gy * PH + 2;
    const rx = ox + HALL_LEN;
    const ry = oy + HALL_LEN;

    // Floor tiles for room
    for (let row=0; row<ROOM_H; row++)
      for (let col=0; col<ROOM_W; col++)
        setTile(rx+col, ry+row, 1);

    // Walls around room
    for (let col=-1; col<=ROOM_W; col++) {
      setTile(rx+col, ry-1, 2);
      setTile(rx+col, ry+ROOM_H, 2);
    }
    for (let row=-1; row<=ROOM_H; row++) {
      setTile(rx-1, ry+row, 2);
      setTile(rx+ROOM_W, ry+row, 2);
    }

    const room = {
      tx: rx, ty: ry,
      gx, gy,
      w: ROOM_W, h: ROOM_H,
      cx: (rx + ROOM_W/2) * TILE,
      cy: (ry + ROOM_H/2) * TILE,
      type: info.type,
      cleared: info.type === 'start',
      enemies: [],
      doors: {}
    };
    rooms.push(room);
    roomsByGrid[`${gx},${gy}`] = room;
  });

  // Connect adjacent rooms with hallways
  placed.forEach(({gx, gy}) => {
    const room = roomsByGrid[`${gx},${gy}`];
    [['N',0,-1],['S',0,1],['E',1,0],['W',-1,0]].forEach(([dir,dx,dy]) => {
      const nx = gx+dx, ny = gy+dy;
      const nb = roomsByGrid[`${nx},${ny}`];
      if (!nb) return;
      carveHallway(room, nb, dir);
      room.doors[dir] = true;
    });
  });

  // Identify spawn and boss rooms
  spawnRoomIdx = rooms.findIndex(r => r.type === 'start');
  bossRoomIdx  = rooms.findIndex(r => r.type === 'boss');
}

function carveHallway(roomA, roomB, dir) {
  // Carve open between two rooms
  const ax = roomA.tx, ay = roomA.ty;
  const bx = roomB.tx, by = roomB.ty;

  if (dir === 'E') {
    const midY = ay + Math.floor(ROOM_H/2);
    const startX = ax + ROOM_W;
    const endX   = bx - 1;
    for (let x = startX; x <= endX; x++)
      for (let w = -1; w <= 1; w++)
        setTile(x, midY + w, 1);
    // walls above/below hall
    for (let x = startX; x <= endX; x++) {
      setTile(x, midY - 2, 2);
      setTile(x, midY + 2, 2);
    }
  } else if (dir === 'S') {
    const midX = ax + Math.floor(ROOM_W/2);
    const startY = ay + ROOM_H;
    const endY   = by - 1;
    for (let y = startY; y <= endY; y++)
      for (let w = -1; w <= 1; w++)
        setTile(midX + w, y, 1);
    for (let y = startY; y <= endY; y++) {
      setTile(midX - 2, y, 2);
      setTile(midX + 2, y, 2);
    }
  }
  // N and W are handled by the reverse call
}

// ── Camera ────────────────────────────────────
const cam = { x: 0, y: 0 };
function updateCamera(player) {
  const tx = player.x - canvas.width  / 2;
  const ty = player.y - canvas.height / 2;
  cam.x += (tx - cam.x) * 0.12;
  cam.y += (ty - cam.y) * 0.12;
}

// ── Player ────────────────────────────────────
const BUFFS_DEF = [
  { id:'speed',    icon:'👟', name:'Fleet Foot',     desc:'+25% move speed',     apply: p => { p.speed *= 1.25; } },
  { id:'damage',   icon:'🔥', name:'Hot Lead',       desc:'+30% bullet damage',  apply: p => { p.bulletDamage *= 1.30; } },
  { id:'firerate', icon:'⚡', name:'Trigger Happy',  desc:'+30% fire rate',      apply: p => { p.fireRate *= 0.70; } },
  { id:'health',   icon:'❤️', name:'Iron Skin',      desc:'+40 max HP',          apply: p => { p.maxHp += 40; p.hp = Math.min(p.hp+40, p.maxHp); } },
  { id:'pierce',   icon:'🗡️', name:'Piercing Shot',  desc:'Bullets pierce +1',   apply: p => { p.pierce++; } },
  { id:'multishot',icon:'💥', name:'Spread Shot',    desc:'+1 extra bullet',     apply: p => { p.extraBullets++; } },
  { id:'regen',    icon:'💊', name:'Medkit',         desc:'Regen 1 HP/sec',      apply: p => { p.regen += 1; } },
  { id:'range',    icon:'🎯', name:'Long Barrel',    desc:'+40% bullet range',   apply: p => { p.bulletRange *= 1.40; } },
  { id:'bullet_speed',icon:'🚀',name:'Hypervelocity',desc:'+30% bullet speed',   apply: p => { p.bulletSpeed *= 1.30; } },
];

function createPlayer(x, y) {
  return {
    x, y,
    w: 22, h: 22,
    hp: 100, maxHp: 100,
    speed: 180,
    angle: 0,
    // shooting
    fireRate: 280,        // ms between shots
    fireCooldown: 0,
    bulletDamage: 18,
    bulletSpeed: 520,
    bulletRange: 420,
    pierce: 0,
    extraBullets: 0,
    regen: 0,
    regenAccum: 0,
    // xp
    xp: 0,
    xpNext: 80,
    level: 1,
    // state
    alive: true,
    invincible: 0,
    appliedBuffs: []
  };
}

// ── Entities ──────────────────────────────────
let player;
let bullets    = [];
let enemies    = [];
let particles  = [];
let xpOrbs     = [];
let enemyBullets = [];

// ── Enemy Types ───────────────────────────────
const ENEMY_TYPES = {
  grunt: {
    name:'Grunt', color:'#e05', w:22, h:22,
    hp:40, speed:80, damage:12,
    xp:20, score:10,
    fireRate:1400, bulletSpeed:220, bulletDamage:10,
    ai: 'chase'
  },
  shooter: {
    name:'Shooter', color:'#a0f', w:20, h:20,
    hp:30, speed:55, damage:8,
    xp:25, score:15,
    fireRate:1000, bulletSpeed:280, bulletDamage:14,
    ai: 'strafe'
  },
  tank: {
    name:'Tank', color:'#f80', w:32, h:32,
    hp:120, speed:50, damage:20,
    xp:50, score:30,
    fireRate:2000, bulletSpeed:180, bulletDamage:18,
    ai: 'chase'
  },
  speeder: {
    name:'Speeder', color:'#0ef', w:16, h:16,
    hp:20, speed:160, damage:15,
    xp:30, score:20,
    fireRate:2500, bulletSpeed:300, bulletDamage:8,
    ai: 'orbit'
  },
};

const BOSS_DEF = {
  name:'THE LICH', color:'#8f0', w:60, h:60,
  hp:1200, speed:60, damage:30,
  xp:500, score:500,
  fireRate:600, bulletSpeed:240, bulletDamage:22,
  ai: 'boss'
};

function spawnEnemy(room, type) {
  const def = type === 'boss' ? BOSS_DEF : ENEMY_TYPES[type];
  const margin = 80;
  const px = room.tx * TILE + margin + Math.random() * (room.w * TILE - margin*2);
  const py = room.ty * TILE + margin + Math.random() * (room.h * TILE - margin*2);
  return {
    x: px, y: py,
    w: def.w, h: def.h,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    color: def.color,
    xp: def.xp,
    name: def.name,
    fireRate: def.fireRate,
    fireCooldown: Math.random() * def.fireRate,
    bulletSpeed: def.bulletSpeed,
    bulletDamage: def.bulletDamage,
    ai: def.ai,
    angle: 0,
    alive: true,
    orbitAngle: Math.random() * Math.PI * 2,
    type: type,
    // boss phases
    phase: 1,
    bossTimer: 0,
  };
}

function populateRooms() {
  rooms.forEach((room, idx) => {
    if (room.type === 'start') return;
    if (room.type === 'boss') {
      room.enemies = [spawnEnemy(room, 'boss')];
      return;
    }
    const count = randInt(3, 7);
    const types = Object.keys(ENEMY_TYPES);
    room.enemies = Array.from({length: count}, () => spawnEnemy(room, choice(types)));
  });
}

// ── Bullets ───────────────────────────────────
function fireBullet(x, y, angle, speed, damage, range, pierce, fromPlayer) {
  bullets.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
    damage, range, distTraveled:0, pierce, pierceLeft: pierce,
    fromPlayer, alive:true, w:7, h:7 });
}

function fireEnemyBullet(x, y, angle, speed, damage) {
  enemyBullets.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
    damage, alive:true, w:6, h:6, range:600, distTraveled:0 });
}

// ── XP Orbs ───────────────────────────────────
function spawnXpOrb(x, y, amount) {
  xpOrbs.push({ x, y, amount, alive:true, vy:-1, age:0 });
}

// ── Particles ─────────────────────────────────
function spawnParticles(x, y, color, count=8) {
  for (let i=0; i<count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(40, 140);
    particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      color, life:1, maxLife:1, r: rand(2,5) });
  }
}

// ── Collision helpers ─────────────────────────
function rectOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w)/2 &&
         Math.abs(a.y - b.y) < (a.h + b.h)/2;
}

function tileAt(wx, wy) {
  return getTile(Math.floor(wx/TILE), Math.floor(wy/TILE));
}

function solidAt(wx, wy) {
  const t = tileAt(wx, wy);
  return t === 0 || t === 2;
}

function moveWithCollision(obj, dx, dy) {
  const hw = obj.w/2, hh = obj.h/2;
  // Move X
  obj.x += dx;
  if (solidAt(obj.x - hw + 2, obj.y) || solidAt(obj.x + hw - 2, obj.y) ||
      solidAt(obj.x - hw + 2, obj.y - hh + 2) || solidAt(obj.x + hw - 2, obj.y - hh + 2) ||
      solidAt(obj.x - hw + 2, obj.y + hh - 2) || solidAt(obj.x + hw - 2, obj.y + hh - 2)) {
    obj.x -= dx;
  }
  // Move Y
  obj.y += dy;
  if (solidAt(obj.x, obj.y - hh + 2) || solidAt(obj.x, obj.y + hh - 2) ||
      solidAt(obj.x - hw + 2, obj.y - hh + 2) || solidAt(obj.x + hw - 2, obj.y - hh + 2) ||
      solidAt(obj.x - hw + 2, obj.y + hh - 2) || solidAt(obj.x + hw - 2, obj.y + hh - 2)) {
    obj.y -= dy;
  }
}

// ── Level-Up / Buff Screen ────────────────────
let paused = false;
let pendingLevelUp = false;

function triggerLevelUp() {
  paused = true;
  pendingLevelUp = true;
  player.level++;
  document.getElementById('level-text').textContent = `Lv ${player.level}`;

  // Pick 3 unique buffs
  const shuffled = [...BUFFS_DEF].sort(() => Math.random()-0.5).slice(0,3);
  const container = document.getElementById('buff-choices');
  container.innerHTML = '';
  document.getElementById('screen-levelup').classList.remove('hidden');

  shuffled.forEach(buff => {
    const card = document.createElement('div');
    card.className = 'buff-card';
    card.innerHTML = `<div class="buff-icon">${buff.icon}</div>
      <div class="buff-name">${buff.name}</div>
      <div class="buff-desc">${buff.desc}</div>`;
    card.addEventListener('click', () => {
      buff.apply(player);
      player.appliedBuffs.push(buff.id);
      document.getElementById('screen-levelup').classList.add('hidden');
      paused = false;
      pendingLevelUp = false;
    });
    container.appendChild(card);
  });
}

function gainXp(amount) {
  player.xp += amount;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.xpNext = Math.floor(player.xpNext * 1.35);
    triggerLevelUp();
    return; // pause; next level-up will be triggered after buff chosen
  }
}

// ── Room management ───────────────────────────
function getRoomAt(wx, wy) {
  for (let i=0; i<rooms.length; i++) {
    const r = rooms[i];
    if (wx >= r.tx*TILE && wx < (r.tx+r.w)*TILE &&
        wy >= r.ty*TILE && wy < (r.ty+r.h)*TILE) return i;
  }
  return -1;
}

function updateCurrentRoom() {
  const idx = getRoomAt(player.x, player.y);
  if (idx >= 0 && idx !== currentRoom) {
    currentRoom = idx;
    // activate enemies
    enemies = rooms[idx].enemies.filter(e => e.alive);
  }
}

function checkRoomClear() {
  const room = rooms[currentRoom];
  if (room.cleared) return;
  const alive = room.enemies.filter(e => e.alive);
  if (alive.length === 0) {
    room.cleared = true;
    spawnParticles(room.cx, room.cy, '#ffd700', 30);
    if (room.type === 'boss') endGame(true);
  }
}

// ── HUD update ────────────────────────────────
function updateHUD() {
  document.getElementById('health-fill').style.width =
    clamp(player.hp / player.maxHp * 100, 0, 100) + '%';
  document.getElementById('health-text').textContent =
    `${Math.ceil(player.hp)}/${player.maxHp}`;
  document.getElementById('xp-fill').style.width =
    clamp(player.xp / player.xpNext * 100, 0, 100) + '%';
}

// ── Drawing ───────────────────────────────────
function drawTiles() {
  const startCol = Math.floor(cam.x / TILE);
  const startRow = Math.floor(cam.y / TILE);
  const endCol   = startCol + Math.ceil(canvas.width  / TILE) + 2;
  const endRow   = startRow + Math.ceil(canvas.height / TILE) + 2;

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const t = getTile(col, row);
      const sx = col * TILE - cam.x;
      const sy = row * TILE - cam.y;
      if (t === 0) {
        ctx.fillStyle = '#050508';
      } else if (t === 1) {
        // Checkerboard floor
        ctx.fillStyle = (col + row) % 2 === 0 ? '#1a1a2e' : '#16213e';
      } else {
        ctx.fillStyle = '#4a3f55';
      }
      ctx.fillRect(sx, sy, TILE, TILE);
      // Wall top highlight
      if (t === 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(sx, sy, TILE, 4);
      }
    }
  }
}

function drawEntity(e) {
  const sx = e.x - cam.x;
  const sy = e.y - cam.y;
  const hw = e.w/2, hh = e.h/2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + hh - 2, hw*0.8, 5, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(e.angle);

  if (e.type === 'boss') {
    // Boss: bigger glowing diamond
    ctx.shadowBlur = 20;
    ctx.shadowColor = e.color;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(hw, 0);
    ctx.lineTo(0, hh);
    ctx.lineTo(-hw, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (e === player) {
    // Player body
    ctx.fillStyle = '#7ec8e3';
    ctx.fillRect(-hw, -hh, e.w, e.h);
    // Gun
    ctx.fillStyle = '#ccc';
    ctx.fillRect(0, -4, hw + 8, 8);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(-6, -8, 5, 5);
    ctx.fillRect(2, -8, 5, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(-5, -7, 3, 3);
    ctx.fillRect(3, -7, 3, 3);
  } else {
    // Enemy body
    ctx.fillStyle = e.color;
    ctx.fillRect(-hw, -hh, e.w, e.h);
    // Gun nub
    ctx.fillStyle = '#888';
    ctx.fillRect(2, -3, hw + 4, 6);
  }
  ctx.restore();

  // HP bar for enemies / boss
  if (e !== player) {
    const barW = e.w + 8;
    const bx = sx - barW/2;
    const by = sy - hh - 10;
    ctx.fillStyle = '#400';
    ctx.fillRect(bx, by, barW, 5);
    ctx.fillStyle = e.type === 'boss' ? '#0f0' : '#f33';
    ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), 5);
  }
}

function drawBullets() {
  bullets.forEach(b => {
    if (!b.alive) return;
    const sx = b.x - cam.x, sy = b.y - cam.y;
    ctx.fillStyle = '#ffe066';
    ctx.shadowBlur = 8; ctx.shadowColor = '#ff0';
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  });
  enemyBullets.forEach(b => {
    if (!b.alive) return;
    const sx = b.x - cam.x, sy = b.y - cam.y;
    ctx.fillStyle = '#f44';
    ctx.shadowBlur = 6; ctx.shadowColor = '#f00';
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawParticles() {
  particles.forEach(p => {
    const sx = p.x - cam.x, sy = p.y - cam.y;
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawXpOrbs() {
  xpOrbs.forEach(o => {
    if (!o.alive) return;
    const sx = o.x - cam.x, sy = o.y - cam.y;
    ctx.fillStyle = '#4f4';
    ctx.shadowBlur = 8; ctx.shadowColor = '#0f0';
    ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  });
}

// ── Minimap ───────────────────────────────────
function drawMinimap() {
  const mw = minimap.width, mh = minimap.height;
  mctx.clearRect(0, 0, mw, mh);
  mctx.fillStyle = '#111';
  mctx.fillRect(0, 0, mw, mh);

  const SCALE = 2.2;
  // Compute world bounds
  const wx0 = rooms.reduce((m,r) => Math.min(m,r.tx), Infinity) * TILE;
  const wy0 = rooms.reduce((m,r) => Math.min(m,r.ty), Infinity) * TILE;
  const wx1 = rooms.reduce((m,r) => Math.max(m,r.tx+r.w), 0) * TILE;
  const wy1 = rooms.reduce((m,r) => Math.max(m,r.ty+r.h), 0) * TILE;
  const ww = wx1 - wx0, wh = wy1 - wy0;
  const scaleX = mw / ww * TILE / SCALE;
  const scaleY = mh / wh * TILE / SCALE;
  const sc = Math.min(scaleX, scaleY) * SCALE;

  rooms.forEach((r, idx) => {
    const rx = (r.tx * TILE - wx0) * sc / TILE;
    const ry = (r.ty * TILE - wy0) * sc / TILE;
    const rw = r.w * sc;
    const rh = r.h * sc;
    if (r.type === 'boss') mctx.fillStyle = '#f00';
    else if (r.type === 'start') mctx.fillStyle = '#0f0';
    else if (r.cleared) mctx.fillStyle = '#446';
    else mctx.fillStyle = '#335';
    mctx.fillRect(rx, ry, rw, rh);
    if (idx === currentRoom) {
      mctx.strokeStyle = '#ff0';
      mctx.lineWidth = 1.5;
      mctx.strokeRect(rx, ry, rw, rh);
    }
  });

  // Player dot
  const px = (player.x - wx0) * sc / TILE;
  const py = (player.y - wy0) * sc / TILE;
  mctx.fillStyle = '#fff';
  mctx.beginPath();
  mctx.arc(px, py, 3, 0, Math.PI*2);
  mctx.fill();
}

// ── AI ────────────────────────────────────────
function updateEnemy(e, dt) {
  if (!e.alive) return;
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const d  = Math.hypot(dx, dy) || 1;
  e.angle  = Math.atan2(dy, dx);

  if (e.ai === 'chase') {
    if (d > e.w) {
      moveWithCollision(e, dx/d * e.speed * dt, dy/d * e.speed * dt);
    }
  } else if (e.ai === 'strafe') {
    if (d > 200) {
      moveWithCollision(e, dx/d * e.speed * dt, dy/d * e.speed * dt);
    } else {
      // Strafe perpendicular
      const perp = e.orbitAngle || 0;
      moveWithCollision(e, Math.cos(perp) * e.speed * dt, Math.sin(perp) * e.speed * dt);
      e.orbitAngle = (e.orbitAngle || 0) + dt * 1.2;
    }
  } else if (e.ai === 'orbit') {
    e.orbitAngle += dt * 2.5;
    const targetR = 130;
    const tx = player.x + Math.cos(e.orbitAngle) * targetR;
    const ty = player.y + Math.sin(e.orbitAngle) * targetR;
    const ex = tx - e.x, ey = ty - e.y;
    const ed = Math.hypot(ex,ey) || 1;
    moveWithCollision(e, ex/ed * e.speed * dt, ey/ed * e.speed * dt);
  } else if (e.ai === 'boss') {
    updateBoss(e, dt, dx, dy, d);
  }

  // Shooting
  e.fireCooldown -= dt * 1000;
  if (e.fireCooldown <= 0 && d < 600) {
    e.fireCooldown = e.fireRate;
    if (e.ai === 'boss') {
      fireBossPattern(e);
    } else {
      const spread = e.ai === 'strafe' ? 0.15 : 0.05;
      fireEnemyBullet(e.x, e.y, e.angle + rand(-spread, spread), e.bulletSpeed, e.bulletDamage);
    }
  }
}

function updateBoss(e, dt, dx, dy, d) {
  // Phase transitions
  const hpRatio = e.hp / e.maxHp;
  if (hpRatio < 0.5 && e.phase === 1) { e.phase = 2; e.speed *= 1.4; e.fireRate *= 0.7; }
  if (hpRatio < 0.25 && e.phase === 2) { e.phase = 3; e.speed *= 1.3; e.fireRate *= 0.6; }

  e.bossTimer = (e.bossTimer || 0) + dt;
  // Charge towards player every few seconds
  if (e.bossTimer > 3) {
    e.bossTimer = 0;
    e.charging = 1.0;
  }
  const speed = e.charging > 0 ? e.speed * 3 : e.speed;
  if (e.charging > 0) e.charging -= dt * 2;
  if (d > e.w + 10) moveWithCollision(e, dx/d * speed * dt, dy/d * speed * dt);
}

function fireBossPattern(e) {
  const count = e.phase === 1 ? 8 : e.phase === 2 ? 12 : 16;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 / count) * i + e.bossTimer * 0.5;
    fireEnemyBullet(e.x, e.y, a, e.bulletSpeed, e.bulletDamage);
  }
}

// ── Player shooting ───────────────────────────
function playerShoot(dt) {
  player.fireCooldown -= dt * 1000;
  if (!mouse.down || player.fireCooldown > 0) return;
  player.fireCooldown = player.fireRate;

  const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
  const baseAngle = Math.atan2(wy - player.y, wx - player.x);
  const count = 1 + player.extraBullets;
  const spread = 0.12;

  for (let i = 0; i < count; i++) {
    const offset = (i - (count-1)/2) * spread;
    fireBullet(player.x, player.y, baseAngle + offset,
      player.bulletSpeed, player.bulletDamage,
      player.bulletRange, player.pierce, true);
  }
}

// ── Update loop ───────────────────────────────
let lastTime = 0;

function update(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (paused || !player || !player.alive) {
    requestAnimationFrame(update);
    return;
  }

  // Player movement
  let mx = 0, my = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    my -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  my += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  const ml = Math.hypot(mx, my) || 1;
  if (mx || my) moveWithCollision(player, mx/ml * player.speed * dt, my/ml * player.speed * dt);

  // Player angle (face mouse)
  const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
  player.angle = Math.atan2(wy - player.y, wx - player.x);

  // Shooting
  playerShoot(dt);

  // HP regen
  if (player.regen > 0) {
    player.regenAccum += dt;
    if (player.regenAccum >= 1) {
      player.regenAccum -= 1;
      player.hp = Math.min(player.hp + player.regen, player.maxHp);
    }
  }

  // Invincibility frames
  if (player.invincible > 0) player.invincible -= dt;

  // Update room / enemies
  updateCurrentRoom();
  const room = rooms[currentRoom];
  enemies = room.enemies.filter(e => e.alive);
  enemies.forEach(e => updateEnemy(e, dt));

  // Player bullets
  bullets.forEach(b => {
    if (!b.alive) return;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.distTraveled += Math.hypot(b.vx, b.vy) * dt;
    if (b.distTraveled > b.range || solidAt(b.x, b.y)) {
      spawnParticles(b.x, b.y, '#ffe066', 4);
      b.alive = false; return;
    }
    enemies.forEach(e => {
      if (!e.alive || !b.alive) return;
      if (rectOverlap(b, e)) {
        e.hp -= b.damage;
        spawnParticles(e.x, e.y, e.color, 6);
        if (b.pierceLeft <= 0) b.alive = false;
        else b.pierceLeft--;
        if (e.hp <= 0) {
          e.alive = false;
          spawnXpOrb(e.x, e.y, e.xp);
          spawnParticles(e.x, e.y, e.color, 16);
        }
      }
    });
  });

  // Enemy bullets
  enemyBullets.forEach(b => {
    if (!b.alive) return;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.distTraveled += Math.hypot(b.vx, b.vy) * dt;
    if (b.distTraveled > b.range || solidAt(b.x, b.y)) { b.alive = false; return; }
    if (player.invincible <= 0 && rectOverlap(b, player)) {
      player.hp -= b.damage;
      player.invincible = 0.5;
      b.alive = false;
      spawnParticles(player.x, player.y, '#f44', 8);
      if (player.hp <= 0) { player.alive = false; endGame(false); }
    }
  });

  // Enemy contact damage
  enemies.forEach(e => {
    if (player.invincible <= 0 && rectOverlap(e, player)) {
      player.hp -= e.damage * dt * 2;
      player.invincible = 0.3;
      if (player.hp <= 0) { player.alive = false; endGame(false); }
    }
  });

  // XP orbs pull toward player
  xpOrbs.forEach(o => {
    if (!o.alive) return;
    o.age += dt;
    const d = dist(o, player);
    if (d < 80 || o.age > 8) {
      const dx2 = player.x - o.x, dy2 = player.y - o.y;
      const dd = Math.hypot(dx2,dy2) || 1;
      const spd = 220 + (80-Math.min(d,80));
      o.x += dx2/dd * spd * dt;
      o.y += dy2/dd * spd * dt;
    } else {
      o.y += o.vy;
    }
    if (dist(o, player) < 18) {
      o.alive = false;
      gainXp(o.amount);
    }
  });

  // Particles
  particles.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 60 * dt;
    p.life -= dt * 1.8;
  });

  // Cleanup
  bullets      = bullets.filter(b => b.alive);
  enemyBullets = enemyBullets.filter(b => b.alive);
  xpOrbs       = xpOrbs.filter(o => o.alive);
  particles    = particles.filter(p => p.life > 0);

  checkRoomClear();
  updateCamera(player);
  updateHUD();

  // Draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTiles();
  drawXpOrbs();
  drawParticles();
  drawBullets();
  enemies.forEach(drawEntity);
  drawEntity(player);

  // Flash if low hp
  if (player.hp < player.maxHp * 0.3) {
    ctx.fillStyle = `rgba(200,0,0,${0.15 + 0.1 * Math.sin(ts*0.005)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Boss HP bar at top
  if (room.type === 'boss' && enemies.length > 0) {
    const boss = enemies[0];
    ctx.fillStyle = '#222';
    ctx.fillRect(canvas.width/2 - 200, 14, 400, 20);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(canvas.width/2 - 200, 14, 400 * (boss.hp/boss.maxHp), 20);
    ctx.fillStyle = '#fff';
    ctx.font = '13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`${boss.name}  ${Math.ceil(boss.hp)} / ${boss.maxHp}`, canvas.width/2, 29);
    ctx.textAlign = 'left';
  }

  // Room clear indicator
  if (room.cleared && room.type !== 'boss') {
    ctx.fillStyle = 'rgba(100,255,100,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawMinimap();
  requestAnimationFrame(update);
}

// ── Game flow ─────────────────────────────────
function startGame() {
  document.getElementById('screen-start').classList.add('hidden');
  document.getElementById('screen-gameover').classList.add('hidden');
  bullets = []; enemies = []; particles = []; xpOrbs = []; enemyBullets = [];
  paused = false;

  generateDungeon();
  populateRooms();

  const spawn = rooms[spawnRoomIdx];
  player = createPlayer(spawn.cx, spawn.cy);
  cam.x = player.x - canvas.width/2;
  cam.y = player.y - canvas.height/2;
  currentRoom = spawnRoomIdx;
  enemies = rooms[currentRoom].enemies.filter(e => e.alive);

  document.getElementById('level-text').textContent = 'Lv 1';
  requestAnimationFrame(update);
}

function endGame(won) {
  paused = true;
  const title = document.getElementById('gameover-title');
  const msg   = document.getElementById('gameover-msg');
  if (won) {
    title.textContent = 'YOU WIN!';
    msg.textContent   = `You defeated the Lich and escaped the dungeon! Level ${player.level}`;
  } else {
    title.textContent = 'GAME OVER';
    msg.textContent   = `You fell in the dungeon at level ${player.level}.`;
  }
  setTimeout(() => {
    document.getElementById('screen-gameover').classList.remove('hidden');
  }, 800);
}

// ── Bootstrap ─────────────────────────────────
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
lastTime = performance.now();
