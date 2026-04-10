// ── Enemy definitions ─────────────────────────────────────────────────────────
const ENEMY_TYPES = {
  grunt: {
    name:'Grunt', color:'#e05', w:22, h:22,
    hp:40, speed:80, damage:12, xp:20,
    fireRate:1400, bulletSpeed:220, bulletDamage:10,
    ai:'chase',
  },
  shooter: {
    name:'Shooter', color:'#a0f', w:20, h:20,
    hp:30, speed:55, damage:8, xp:25,
    fireRate:1000, bulletSpeed:280, bulletDamage:14,
    ai:'strafe',
  },
  tank: {
    name:'Tank', color:'#f80', w:32, h:32,
    hp:120, speed:50, damage:20, xp:50,
    fireRate:2000, bulletSpeed:180, bulletDamage:18,
    ai:'chase',
  },
  speeder: {
    name:'Speeder', color:'#0ef', w:16, h:16,
    hp:20, speed:160, damage:15, xp:30,
    fireRate:2500, bulletSpeed:300, bulletDamage:8,
    ai:'orbit',
  },
};

const BOSS_DEF = {
  name:'THE LICH', color:'#8f0', w:60, h:60,
  hp:1200, speed:60, damage:30, xp:500,
  fireRate:600, bulletSpeed:240, bulletDamage:22,
  ai:'boss',
};

// ── Spawning ──────────────────────────────────────────────────────────────────
function spawnEnemy(room, type) {
  const def    = type === 'boss' ? BOSS_DEF : ENEMY_TYPES[type];
  const margin = 80;
  return {
    x: room.tx * TILE + margin + Math.random() * (room.w * TILE - margin * 2),
    y: room.ty * TILE + margin + Math.random() * (room.h * TILE - margin * 2),
    w: def.w, h: def.h,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed, damage: def.damage,
    color: def.color, xp: def.xp, name: def.name,
    fireRate: def.fireRate,
    fireCooldown: Math.random() * def.fireRate,
    bulletSpeed: def.bulletSpeed, bulletDamage: def.bulletDamage,
    ai: def.ai, angle: 0, alive: true,
    orbitAngle: Math.random() * Math.PI * 2,
    type, phase: 1, bossTimer: 0, charging: 0,
  };
}

function populateRooms() {
  const margin = 80;
  state.rooms.forEach(room => {
    room.enemies    = [];
    room.spawnQueue = [];
    if (room.type === 'start') return;

    if (room.type === 'boss') {
      room.spawnQueue = [{
        x: room.tx * TILE + room.w * TILE / 2,
        y: room.ty * TILE + room.h * TILE / 2,
        type: 'boss', delay: 2.0,
      }];
      return;
    }

    const types = Object.keys(ENEMY_TYPES);
    const count = randInt(3, 7);
    room.spawnQueue = Array.from({ length: count }, (_, i) => ({
      x: room.tx * TILE + margin + Math.random() * (room.w * TILE - margin * 2),
      y: room.ty * TILE + margin + Math.random() * (room.h * TILE - margin * 2),
      type: choice(types),
      delay: 0.5 + i * 0.35,
    }));
  });
}

function triggerRoomSpawn(room) {
  room.spawnQueue.forEach((sq, i) => {
    const def = sq.type === 'boss' ? BOSS_DEF : ENEMY_TYPES[sq.type];
    room.enemies.push({
      x: sq.x, y: sq.y,
      w: def.w, h: def.h,
      hp: def.hp, maxHp: def.hp,
      speed: def.speed, damage: def.damage,
      color: def.color, xp: def.xp, name: def.name,
      fireRate: def.fireRate, fireCooldown: def.fireRate,
      bulletSpeed: def.bulletSpeed, bulletDamage: def.bulletDamage,
      ai: def.ai, angle: 0,
      alive: false, spawning: true, spawnTimer: sq.delay,
      orbitAngle: Math.random() * Math.PI * 2,
      type: sq.type, phase: 1, bossTimer: 0, charging: 0,
    });
  });
  room.spawnQueue = [];
  state.enemies = room.enemies.filter(e => e.alive || e.spawning);
}

// ── AI behaviours ─────────────────────────────────────────────────────────────
function updateBoss(e, dt, dx, dy, d) {
  const hpRatio = e.hp / e.maxHp;
  if (hpRatio < 0.5  && e.phase === 1) { e.phase = 2; e.speed *= 1.4; e.fireRate *= 0.7; }
  if (hpRatio < 0.25 && e.phase === 2) { e.phase = 3; e.speed *= 1.3; e.fireRate *= 0.6; }

  e.bossTimer += dt;
  if (e.bossTimer > 3) { e.bossTimer = 0; e.charging = 1.0; }

  const speed = e.charging > 0 ? e.speed * 3 : e.speed;
  if (e.charging > 0) e.charging -= dt * 2;
  if (d > e.w + 10) moveWithCollision(e, dx / d * speed * dt, dy / d * speed * dt);
}

function fireBossPattern(e) {
  const count = e.phase === 1 ? 8 : e.phase === 2 ? 12 : 16;
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 / count) * i + e.bossTimer * 0.5;
    fireEnemyBullet(e.x, e.y, a, e.bulletSpeed, e.bulletDamage);
  }
}

function updateEnemy(e, dt) {
  if (e.spawning) {
    e.spawnTimer -= dt;
    if (e.spawnTimer <= 0) {
      e.spawning = false;
      e.alive    = true;
    }
    return;
  }
  if (!e.alive) return;
  const dx = state.player.x - e.x;
  const dy = state.player.y - e.y;
  const d  = Math.hypot(dx, dy) || 1;
  e.angle  = Math.atan2(dy, dx);

  switch (e.ai) {
    case 'chase':
      if (d > e.w) moveWithCollision(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
      break;

    case 'strafe':
      if (d > 200) {
        moveWithCollision(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
      } else {
        moveWithCollision(e, Math.cos(e.orbitAngle) * e.speed * dt, Math.sin(e.orbitAngle) * e.speed * dt);
        e.orbitAngle += dt * 1.2;
      }
      break;

    case 'orbit': {
      e.orbitAngle += dt * 2.5;
      const targetR = 130;
      const tx = state.player.x + Math.cos(e.orbitAngle) * targetR;
      const ty = state.player.y + Math.sin(e.orbitAngle) * targetR;
      const ex = tx - e.x, ey = ty - e.y;
      const ed = Math.hypot(ex, ey) || 1;
      moveWithCollision(e, ex / ed * e.speed * dt, ey / ed * e.speed * dt);
      break;
    }

    case 'boss':
      updateBoss(e, dt, dx, dy, d);
      break;
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

function updateEnemyContact(dt) {
  const player = state.player;
  state.enemies.forEach(e => {
    if (!e.alive) return;
    if (player.invincible <= 0 && rectOverlap(e, player)) {
      player.hp        -= e.damage * dt * 2;
      player.invincible = 0.3;
      if (player.hp <= 0) { player.alive = false; endGame(false); }
    }
  });
}
