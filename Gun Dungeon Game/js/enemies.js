// ── Enemy definitions ─────────────────────────────────────────────────────────
const ENEMY_TYPES = {
  pineapple_slice: {
    // Melee — faster than player (player speed = 180), no ranged attack
    name:'Pineapple Slice', color:'#f5c842', w:22, h:22,
    hp:40, speed:230, damage:15, xp:20,
    ai:'pineapple',
  },
  meatball: {
    // Melee — slow idle, charges in a straight line predicting player movement
    name:'Meatball', color:'#8b3a1a', w:32, h:32,
    hp:120, speed:65, damage:28, xp:50,
    chargeSpeed:390,
    ai:'meatball',
  },
  fish: {
    // Ranged — slower than player, shoots water drops at current player position
    name:'Fish', color:'#5bc8f5', w:20, h:20,
    hp:30, speed:110, damage:0, xp:25,
    fireRate:1300, bulletSpeed:230, bulletDamage:12,
    ai:'fish',
  },
  mini_oven: {
    // Ranged — slower than player, lobs predicted fireballs at player
    name:'Mini Oven', color:'#c0c0c0', w:22, h:22,
    hp:45, speed:95, damage:0, xp:35,
    fireRate:2400, bulletSpeed:145, bulletDamage:22,
    ai:'mini_oven',
  },
};

const BOSS_DEF = {
  name:'GIANT PINEAPPLE', color:'#f5c842', w:60, h:60,
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
      fireRate:  def.fireRate  || 0,
      fireCooldown: (def.fireRate || 0) * (0.5 + Math.random() * 0.5),
      bulletSpeed:  def.bulletSpeed  || 0,
      bulletDamage: def.bulletDamage || 0,
      chargeSpeed:  def.chargeSpeed  || 0,
      ai: def.ai, angle: 0,
      alive: false, spawning: true, spawnTimer: sq.delay,
      orbitAngle: Math.random() * Math.PI * 2,
      type: sq.type, phase: 1, bossTimer: 0, charging: 0,
      // meatball state machine
      mbState: 'idle', chargeCooldown: rand(1.5, 3.0),
      chargeTimer: 0, windupTimer: 0,
      chargeDir: { x: 0, y: 0 }, windingUp: false,
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

// ── Individual AI handlers ────────────────────────────────────────────────────
function aiPineapple(e, dt, dx, dy, d) {
  // Pure melee chaser — faster than player, always closes in
  if (d > e.w) moveWithCollision(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
}

function aiMeatball(e, dt, dx, dy, d) {
  const player = state.player;
  e.windingUp = false;

  if (e.mbState === 'idle') {
    // Slow shamble toward player
    if (d > e.w + 4) moveWithCollision(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
    e.chargeCooldown -= dt;
    if (e.chargeCooldown <= 0 && d < 420) {
      // Predict where the player will be when the meatball arrives
      const travelTime = d / e.chargeSpeed;
      const predX = player.x + (player.vx || 0) * travelTime;
      const predY = player.y + (player.vy || 0) * travelTime;
      const pdx   = predX - e.x, pdy = predY - e.y;
      const pd    = Math.hypot(pdx, pdy) || 1;
      e.chargeDir  = { x: pdx / pd, y: pdy / pd };
      e.mbState    = 'windup';
      e.windupTimer = 0.55;
    }
  } else if (e.mbState === 'windup') {
    // Brief pause — enemy shakes as a warning
    e.windingUp   = true;
    e.windupTimer -= dt;
    if (e.windupTimer <= 0) {
      e.mbState    = 'charging';
      e.chargeTimer = 0.75;
    }
  } else if (e.mbState === 'charging') {
    // Lock direction charge — cannot steer
    moveWithCollision(e, e.chargeDir.x * e.chargeSpeed * dt, e.chargeDir.y * e.chargeSpeed * dt);
    e.chargeTimer -= dt;
    if (e.chargeTimer <= 0) {
      e.mbState        = 'idle';
      e.chargeCooldown = rand(2.0, 3.5);
    }
  }
}

function aiFish(e, dt, dx, dy, d) {
  const PREFERRED = 200, FLEE = 120;
  if (d > PREFERRED) {
    // Close in slowly
    moveWithCollision(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
  } else if (d < FLEE) {
    // Back away if player gets too close
    moveWithCollision(e, -dx / d * e.speed * 0.7 * dt, -dy / d * e.speed * 0.7 * dt);
  } else {
    // Strafe sideways at preferred range
    moveWithCollision(e,  Math.cos(e.orbitAngle) * e.speed * 0.6 * dt,
                          Math.sin(e.orbitAngle) * e.speed * 0.6 * dt);
    e.orbitAngle += dt * 1.0;
  }

  // Shoot at current player position — no prediction
  e.fireCooldown -= dt * 1000;
  if (e.fireCooldown <= 0 && d < 500) {
    e.fireCooldown = e.fireRate;
    fireEnemyBullet(e.x, e.y, e.angle, e.bulletSpeed, e.bulletDamage);
  }
}

function aiMiniOven(e, dt, dx, dy, d) {
  const PREFERRED = 280, FLEE = 140;
  if (d > PREFERRED) {
    moveWithCollision(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
  } else if (d < FLEE) {
    moveWithCollision(e, -dx / d * e.speed * 0.8 * dt, -dy / d * e.speed * 0.8 * dt);
  }
  // No strafing — the oven just stands and lobs fireballs

  // Shoot predicted fireball
  e.fireCooldown -= dt * 1000;
  if (e.fireCooldown <= 0 && d < 550) {
    e.fireCooldown = e.fireRate;
    const player     = state.player;
    const travelTime = d / e.bulletSpeed;
    const predX      = player.x + (player.vx || 0) * travelTime;
    const predY      = player.y + (player.vy || 0) * travelTime;
    fireEnemyFireball(e.x, e.y, predX, predY, e.bulletSpeed, e.bulletDamage);
  }
}

function updateEnemy(e, dt) {
  if (e.spawning) {
    e.spawnTimer -= dt;
    if (e.spawnTimer <= 0) { e.spawning = false; e.alive = true; }
    return;
  }
  if (!e.alive) return;

  const player = state.player;
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const d  = Math.hypot(dx, dy) || 1;
  e.angle  = Math.atan2(dy, dx);

  switch (e.ai) {
    case 'pineapple': aiPineapple(e, dt, dx, dy, d); break;
    case 'meatball':  aiMeatball (e, dt, dx, dy, d); break;
    case 'fish':      aiFish     (e, dt, dx, dy, d); break;
    case 'mini_oven': aiMiniOven (e, dt, dx, dy, d); break;
    case 'boss':      updateBoss (e, dt, dx, dy, d); break;
  }

  // Boss shooting handled separately
  if (e.ai === 'boss') {
    e.fireCooldown -= dt * 1000;
    if (e.fireCooldown <= 0 && d < 700) {
      e.fireCooldown = e.fireRate;
      fireBossPattern(e);
    }
  }
}

function separateEntities() {
  const player  = state.player;
  const enemies = state.enemies;

  // Separate player from each enemy
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.alive) continue;

    const minDist = (player.w + e.w) / 2;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d  = Math.hypot(dx, dy);
    if (d < minDist && d > 0) {
      const push   = (minDist - d) / 2;
      const nx     = dx / d, ny = dy / d;
      player.x    += nx * push;
      player.y    += ny * push;
      e.x         -= nx * push;
      e.y         -= ny * push;
    }
  }

  // Separate enemies from each other
  for (let i = 0; i < enemies.length; i++) {
    if (!enemies[i].alive) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      if (!enemies[j].alive) continue;
      const a = enemies[i], b = enemies[j];
      const minDist = (a.w + b.w) / 2;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d  = Math.hypot(dx, dy);
      if (d < minDist && d > 0) {
        const push = (minDist - d) / 2;
        const nx   = dx / d, ny = dy / d;
        a.x += nx * push;
        a.y += ny * push;
        b.x -= nx * push;
        b.y -= ny * push;
      }
    }
  }
}

function updateEnemyContact(dt) {
  const player = state.player;
  state.enemies.forEach(e => {
    if (!e.alive) return;
    const minDist = (player.w + e.w) / 2;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d  = Math.hypot(dx, dy);
    if (d < minDist) {
      if (player.invincible <= 0) {
        player.hp        -= e.damage * dt * 3;
        player.invincible = 0.25;
        if (player.hp <= 0) { player.alive = false; endGame(false); }
      }
    }
  });
}
