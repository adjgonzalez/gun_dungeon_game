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
  name:'GIANT PINEAPPLE', color:'#f5c842', w:75, h:75,
  hp:2200, speed:55, damage:0, xp:500,
  ai:'boss',
};

// Per-phase scaling: basicGap = seconds between basic attacks,
// projSpeed = spike projectile speed, dmgMult / specialSpeedMult scale at 30% HP
const BOSS_PHASE_CONFIG = {
  1: { basicGap:1.4,  projSpeed:220, ringCount:8,  floorCount:5, dmgMult:1.0, specialSpeedMult:1.0 },
  2: { basicGap:1.0,  projSpeed:300, ringCount:12, floorCount:6, dmgMult:1.0, specialSpeedMult:1.0 },
  3: { basicGap:0.70, projSpeed:390, ringCount:16, floorCount:8, dmgMult:1.5, specialSpeedMult:1.5 },
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
    room.pendingWaves = [];
    room.currentWave = 0;
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
    const wave1Count = randInt(5, 10);
    const wave2Count = randInt(5, 10);

    const buildWave = (count, baseDelay) => Array.from({ length: count }, (_, i) => ({
      x: room.tx * TILE + margin + Math.random() * (room.w * TILE - margin * 2),
      y: room.ty * TILE + margin + Math.random() * (room.h * TILE - margin * 2),
      type: choice(types),
      delay: baseDelay + i * 0.35,
    }));

    room.pendingWaves = [
      buildWave(wave1Count, 0.5),
      buildWave(wave2Count, 0.8),
    ];
    room.spawnQueue = room.pendingWaves.shift() || [];
  });
}

function triggerRoomSpawn(room) {
  room.currentWave = (room.currentWave || 0) + 1;
  room.spawnQueue.forEach((sq) => {
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
    // Boss-specific attack-cycle state
    if (sq.type === 'boss') {
      const enemy = room.enemies[room.enemies.length - 1];
      Object.assign(enemy, {
        bossPhase:          1,
        bossBaseSpeed:      BOSS_DEF.speed,
        bossAttackState:    'basic_wait',
        bossBasicTimer:     2.5,
        bossBasicCount:     0,
        bossCurrentPattern: 0,
        bossBasicsPerCycle: 3,
        bossSpecialTimer:   0,
        bossCurrentSpecial: null,
        bossSpecialData:    {},
        bossEnraged:        false,
        bossInvulnTimer:    1.8,
      });
    }
  });
  room.spawnQueue = [];
  state.enemies = room.enemies.filter(e => e.alive || e.spawning);
}

// ── Boss AI ────────────────────────────────────────────────────────────────────

function updateBoss(e, dt, dx, dy, d) {
  if ((e.bossInvulnTimer || 0) > 0) {
    e.bossInvulnTimer = Math.max(0, e.bossInvulnTimer - dt);
  }
  _bossCheckPhase(e);
  const cfg = BOSS_PHASE_CONFIG[e.bossPhase];

  // Movement — locked during windup and active stomps/rolls
  const moveLocked = e.bossAttackState === 'special_windup' ||
    (e.bossAttackState === 'special_active' &&
      (e.bossCurrentSpecial === 'roll' || e.bossCurrentSpecial === 'stomp'));
  if (!moveLocked && d > e.w + 20) {
    moveWithCollision(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
  }

  // Attack cycle state machine
  if (e.bossAttackState === 'basic_wait') {
    e.bossBasicTimer -= dt;
    if (e.bossBasicTimer <= 0) {
      _bossDoBasicAttack(e, dx, dy, d, cfg);
      e.bossBasicCount++;
      if (e.bossBasicCount >= e.bossBasicsPerCycle) {
        e.bossBasicCount = 0;
        _bossBeginSpecial(e, dx, dy, d, cfg);
      } else {
        e.bossBasicTimer = cfg.basicGap;
      }
    }
  } else {
    _bossupdateSpecialState(e, dt, dx, dy, d, cfg);
  }
}

function _bossCheckPhase(e) {
  const hp = e.hp / e.maxHp;
  if (hp < 0.65 && e.bossPhase === 1) {
    e.bossPhase = 2;
    e.speed     = e.bossBaseSpeed * 1.2;
    e.bossInvulnTimer = Math.max(e.bossInvulnTimer || 0, 1.35);
    e.bossAttackState = 'special_recovery';
    e.bossSpecialTimer = Math.max(e.bossSpecialTimer || 0, 0.7);
    spawnFloatingText(e.x, e.y - 60, 'PHASE 2', '#ff8800');
    spawnParticles(e.x, e.y, '#ff8800', 40);
  }
  if (hp < 0.30 && e.bossPhase === 2) {
    e.bossPhase    = 3;
    e.speed        = e.bossBaseSpeed * 1.5;
    e.bossEnraged  = true;
    e.bossBasicsPerCycle = randInt(1, 2);
    e.bossInvulnTimer = Math.max(e.bossInvulnTimer || 0, 1.75);
    e.bossAttackState = 'special_recovery';
    e.bossSpecialTimer = Math.max(e.bossSpecialTimer || 0, 0.9);
    spawnFloatingText(e.x, e.y - 60, 'ENRAGED!', '#ff0000');
    spawnParticles(e.x, e.y, '#ff0000', 60);
    spawnParticles(e.x, e.y, '#ff8800', 30);
  }
}

function _bossDoBasicAttack(e, dx, dy, d, cfg) {
  const pattern = e.bossCurrentPattern;
  e.bossCurrentPattern = (e.bossCurrentPattern + 1) % 4;
  const spd = cfg.projSpeed;
  const dm  = cfg.dmgMult;

  switch (pattern) {
    case 0:   // Direct spike at player
      fireEnemySpikeAt(e.x, e.y, e.angle, spd, 3 * dm);
      break;

    case 1:   // 360-degree spike ring
      for (let i = 0; i < cfg.ringCount; i++) {
        fireEnemySpikeAt(e.x, e.y, (Math.PI * 2 / cfg.ringCount) * i, spd, 3 * dm);
      }
      break;

    case 2:   // Random floor spikes
      _spawnRandomFloorSpikes(e, cfg.floorCount, 4 * dm);
      break;

    case 3:   // Line of floor spikes toward player
      _spawnLineFloorSpikes(e, dx, dy, d, 4 * dm);
      break;
  }
}

function _bossBeginSpecial(e, _dx, _dy, _d, cfg) {
  const specials = ['slices', 'roll', 'stomp'];
  e.bossCurrentSpecial = choice(specials);
  e.bossAttackState    = 'special_windup';
  e.bossSpecialTimer   = 0.9 / cfg.specialSpeedMult;
  e.bossSpecialData    = {};
  spawnFloatingText(e.x, e.y - 50, '!!', '#ff4400');
}

function _bossupdateSpecialState(e, dt, dx, dy, d, cfg) {
  const player = state.player;

  if (e.bossAttackState === 'special_windup') {
    e.bossSpecialTimer -= dt;
    if (e.bossSpecialTimer <= 0) {
      e.bossAttackState = 'special_active';
      _bossActivateSpecial(e, dx, dy, d, cfg);
    }
    return;
  }

  if (e.bossAttackState === 'special_active') {
    const data = e.bossSpecialData;
    const dm   = cfg.dmgMult;

    if (e.bossCurrentSpecial === 'roll') {
      moveWithCollision(e, data.vx * dt, data.vy * dt);
      data.timer -= dt;
      // Deal contact damage during roll (once per entry via invincibility frames)
      if (Math.hypot(player.x - e.x, player.y - e.y) < (e.w + player.w) / 2 + 8) {
        damagePlayer(5 * dm);
      }
      if (data.timer <= 0) {
        e.bossAttackState  = 'special_recovery';
        e.bossSpecialTimer = 0.5;
      }

    } else if (e.bossCurrentSpecial === 'stomp') {
      if (data.phase === 'warning') {
        data.warnTimer -= dt;
        if (data.warnTimer <= 0) {
          // Impact
          spawnParticles(data.targetX, data.targetY, '#f5c842', 25);
          spawnParticles(data.targetX, data.targetY, '#ff8800', 15);
          if (Math.hypot(player.x - data.targetX, player.y - data.targetY) < 72) {
            damagePlayer(5 * dm);
          }
          data.stompCount++;
          if (data.stompCount >= data.maxStomps) {
            e.bossAttackState  = 'special_recovery';
            e.bossSpecialTimer = 0.5;
          } else {
            data.phase     = 'pause';
            data.warnTimer = 0.3 / cfg.specialSpeedMult;
          }
        }
      } else if (data.phase === 'pause') {
        data.warnTimer -= dt;
        if (data.warnTimer <= 0) {
          data.targetX   = player.x;
          data.targetY   = player.y;
          data.phase     = 'warning';
          data.warnTimer = 0.6 / cfg.specialSpeedMult;
        }
      }
    }
    // 'slices' special activates instantly; state transitions handled in activate
    return;
  }

  if (e.bossAttackState === 'special_recovery') {
    e.bossSpecialTimer -= dt;
    if (e.bossSpecialTimer <= 0) {
      e.bossAttackState    = 'basic_wait';
      e.bossCurrentSpecial = null;
      e.bossSpecialData    = {};
      const cfg2 = BOSS_PHASE_CONFIG[e.bossPhase];
      e.bossBasicTimer = cfg2.basicGap;
      // Re-randomise cycle length in phase 3
      if (e.bossPhase === 3) e.bossBasicsPerCycle = randInt(1, 2);
    }
  }
}

function _bossActivateSpecial(e, dx, dy, d, cfg) {
  const player = state.player;
  const room   = state.rooms[state.currentRoom];

  if (e.bossCurrentSpecial === 'slices') {
    // Spawn 3 pineapple slices around the boss
    for (let i = 0; i < 3; i++) {
      const a  = (Math.PI * 2 / 3) * i + Math.random();
      const sx = clamp(e.x + Math.cos(a) * 90, room.tx * TILE + 60, (room.tx + room.w) * TILE - 60);
      const sy = clamp(e.y + Math.sin(a) * 90, room.ty * TILE + 60, (room.ty + room.h) * TILE - 60);
      _spawnBossSlice(room, sx, sy);
    }
    e.bossInvulnTimer = Math.max(e.bossInvulnTimer || 0, 1.2);
    e.bossAttackState  = 'special_recovery';
    e.bossSpecialTimer = 0.4;

  } else if (e.bossCurrentSpecial === 'roll') {
    const spMult = cfg.specialSpeedMult;
    e.bossSpecialData = {
      vx: dx / d * e.bossBaseSpeed * 4.5 * spMult,
      vy: dy / d * e.bossBaseSpeed * 4.5 * spMult,
      timer: 1.4 / spMult,
    };

  } else if (e.bossCurrentSpecial === 'stomp') {
    e.bossSpecialData = {
      stompCount: 0,
      maxStomps:  3,
      phase:      'warning',
      warnTimer:  0.6 / cfg.specialSpeedMult,
      targetX:    player.x,
      targetY:    player.y,
    };
  }
}

// ── Boss helper spawners ───────────────────────────────────────────────────────

function _spawnBossSlice(room, x, y) {
  const def = ENEMY_TYPES['pineapple_slice'];
  const sl  = {
    x, y, w: def.w, h: def.h,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed, damage: def.damage,
    color: def.color, xp: 0, name: def.name,
    fireRate:0, fireCooldown:0, bulletSpeed:0, bulletDamage:0, chargeSpeed:0,
    ai: def.ai, angle:0, alive:true, spawning:false,
    orbitAngle: Math.random() * Math.PI * 2,
    type:'pineapple_slice', phase:1, bossTimer:0, charging:0,
    mbState:'idle', chargeCooldown:rand(1.5,3.0),
    chargeTimer:0, windupTimer:0, chargeDir:{x:0,y:0}, windingUp:false,
    role: 'aggressor', utilityAction: 'chase',
  };
  room.enemies.push(sl);
  state.enemies.push(sl);
}

function _spawnRandomFloorSpikes(_e, count, damage) {
  const room   = state.rooms[state.currentRoom];
  const margin = 80;
  for (let i = 0; i < count; i++) {
    const sx = room.tx * TILE + margin + Math.random() * (room.w * TILE - margin * 2);
    const sy = room.ty * TILE + margin + Math.random() * (room.h * TILE - margin * 2);
    state.floorSpikes.push({ x:sx, y:sy, damage, growTimer:0.55, growTimerMax:0.55, activeTimer:1.3, alive:true, phase:'growing' });
  }
}

function _spawnLineFloorSpikes(e, dx, dy, d, damage) {
  const count  = 6;
  const nx     = dx / d, ny = dy / d;
  for (let i = 0; i < count; i++) {
    const dist = 90 + i * 65;
    // stagger grow timers so they erupt in sequence
    state.floorSpikes.push({
      x: e.x + nx * dist, y: e.y + ny * dist,
      damage, growTimer: 0.2 + i * 0.08, growTimerMax: 0.2 + i * 0.08,
      activeTimer: 1.3, alive: true, phase: 'growing',
    });
  }
}

function fireEnemySpikeAt(x, y, angle, speed, damage) {
  state.enemyBullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, alive:true, w:12, h:12,
    range:720, distTraveled:0,
    fireball:false, spike:true,
  });
}

function updateFloorSpikes(dt) {
  const player = state.player;
  if (!player || !player.alive) { state.floorSpikes = []; return; }
  state.floorSpikes.forEach(s => {
    if (!s.alive) return;
    if (s.phase === 'growing') {
      s.growTimer -= dt;
      if (s.growTimer <= 0) s.phase = 'active';
    } else {
      s.activeTimer -= dt;
      if (s.activeTimer <= 0) { s.alive = false; return; }
      if (Math.hypot(player.x - s.x, player.y - s.y) < 22) {
        damagePlayer(s.damage);
      }
    }
  });
  state.floorSpikes = state.floorSpikes.filter(s => s.alive);
}

// ── Individual AI handlers ────────────────────────────────────────────────────
// These receive the utility action and role from the global systems and
// adjust their movement / attack decisions accordingly.

function aiPineapple(e, dt, dx, dy, d) {
  // Aggressive melee behavior: always pressure the player.
  if (d > e.w * 0.7) {
    moveWithCollision(e, (dx / d) * e.speed * 1.06 * dt, (dy / d) * e.speed * 1.06 * dt);
  }
}

function aiMeatball(e, dt, dx, dy, d) {
  const player = state.player;
  e.windingUp  = false;

  // The meatball runs its own state machine — utility only trims the charge range
  // If flanker, bias its idle approach toward the flank point
  const useFlank = e.role === 'flanker' && e.flankTarget && e.mbState === 'idle';

  if (e.mbState === 'idle') {
    if (useFlank) {
      const fdx = e.flankTarget.x - e.x, fdy = e.flankTarget.y - e.y;
      const fd  = Math.hypot(fdx, fdy) || 1;
      if (fd > 20) moveWithCollision(e, (fdx / fd) * e.speed * dt, (fdy / fd) * e.speed * dt);
    } else if (d > e.w + 4) {
      moveWithCollision(e, (dx / d) * e.speed * dt, (dy / d) * e.speed * dt);
    }

    e.chargeCooldown -= dt;
    // Aggressors charge slightly more often; flankers wait until positioned
    const chargeRange = e.role === 'flanker' ? 320 : 420;
    if (e.chargeCooldown <= 0 && d < chargeRange) {
      const travelTime = d / e.chargeSpeed;
      const predX = player.x + (player.vx || 0) * travelTime;
      const predY = player.y + (player.vy || 0) * travelTime;
      const pdx = predX - e.x, pdy = predY - e.y;
      const pd  = Math.hypot(pdx, pdy) || 1;
      e.chargeDir   = { x: pdx / pd, y: pdy / pd };
      e.mbState     = 'windup';
      e.windupTimer = 0.55;
    }

  } else if (e.mbState === 'windup') {
    e.windingUp   = true;
    e.windupTimer -= dt;
    if (e.windupTimer <= 0) { e.mbState = 'charging'; e.chargeTimer = 0.75; }

  } else if (e.mbState === 'charging') {
    moveWithCollision(e, e.chargeDir.x * e.chargeSpeed * dt, e.chargeDir.y * e.chargeSpeed * dt);
    e.chargeTimer -= dt;
    if (e.chargeTimer <= 0) { e.mbState = 'idle'; e.chargeCooldown = rand(2.0, 3.5); }
  }
}

function aiFish(e, dt, dx, dy, d) {
  const PREF = 190;

  if (e.role === 'flanker' && e.flankTarget) {
    const fdx = e.flankTarget.x - e.x, fdy = e.flankTarget.y - e.y;
    const fd  = Math.hypot(fdx, fdy) || 1;
    if (fd > 20) moveWithCollision(e, (fdx / fd) * e.speed * dt, (fdy / fd) * e.speed * dt);

  } else if (d > PREF) {
    moveWithCollision(e, (dx / d) * e.speed * 1.05 * dt, (dy / d) * e.speed * 1.05 * dt);

  } else {
    // Keep pressure with close strafing instead of backing off.
    moveWithCollision(e, Math.cos(e.orbitAngle) * e.speed * 0.85 * dt,
                         Math.sin(e.orbitAngle) * e.speed * 0.85 * dt);
    e.orbitAngle += dt * (e.role === 'harasser' ? 1.3 : 0.9);
  }

  // Shoot at current player position — no prediction
  e.fireCooldown -= dt * 1000 * (e.slowAttackMult || 1);
  if (e.fireCooldown <= 0 && d < 500) {
    e.fireCooldown = e.fireRate;
    fireEnemyBullet(e.x, e.y, e.angle, e.bulletSpeed, e.bulletDamage);
  }
}

function aiMiniOven(e, dt, dx, dy, d) {
  const PREF = 250;

  if (e.role === 'flanker' && e.flankTarget) {
    const fdx = e.flankTarget.x - e.x, fdy = e.flankTarget.y - e.y;
    const fd  = Math.hypot(fdx, fdy) || 1;
    if (fd > 20) moveWithCollision(e, (fdx / fd) * e.speed * dt, (fdy / fd) * e.speed * dt);

  } else if (d > PREF) {
    moveWithCollision(e, (dx / d) * e.speed * 1.04 * dt, (dy / d) * e.speed * 1.04 * dt);
  } else {
    moveWithCollision(e, (dx / d) * e.speed * 0.45 * dt, (dy / d) * e.speed * 0.45 * dt);
  }
  // If action === 'attack' and in preferred range: stand still and lob

  // Shoot predicted fireball
  e.fireCooldown -= dt * 1000 * (e.slowAttackMult || 1);
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

  // Timed status effects.
  if ((e.burnTimer || 0) > 0) {
    e.burnTimer -= dt;
    const bossInvuln = e.type === 'boss' && (e.bossInvulnTimer || 0) > 0;
    if (!bossInvuln) e.hp -= (e.burnDps || 0) * dt;
    if (e.hp <= 0) {
      defeatEnemy(e);
      return;
    }
  }
  if ((e.slowTimer || 0) > 0) {
    e.slowTimer -= dt;
    if (e.slowTimer <= 0) {
      e.slowTimer = 0;
      e.slowMoveMult = 1;
      e.slowAttackMult = 1;
    }
  }

  const player = state.player;
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const d  = Math.hypot(dx, dy) || 1;
  e.angle  = Math.atan2(dy, dx);

  // ── 1. Utility AI: score actions, pick the best one ────────────────────────
  computeUtility(e);

  // ── 2. Behavior tree: dodge interrupt + flocking ───────────────────────────
  //    Returns true if an interrupt (dodge / flee) fully handled movement.
  const btHandled = runBehaviorTree(e, dt);

  // ── 3. Type-specific AI (skipped only when BT issued an interrupt) ─────────
  if (!btHandled) {
    const baseSpeed = e.speed;
    e.speed = baseSpeed * (e.slowMoveMult || 1);
    switch (e.ai) {
      case 'pineapple': aiPineapple(e, dt, dx, dy, d); break;
      case 'meatball':  aiMeatball (e, dt, dx, dy, d); break;
      case 'fish':      aiFish     (e, dt, dx, dy, d); break;
      case 'mini_oven': aiMiniOven (e, dt, dx, dy, d); break;
      case 'boss':      updateBoss (e, dt, dx, dy, d); break;
    }
    e.speed = baseSpeed;
  }

  // Anti-stuck nudge: if an enemy barely moves for too long, push it sideways.
  const moved = Math.hypot(e.x - (e.lastX ?? e.x), e.y - (e.lastY ?? e.y));
  if (moved < 1.0) {
    e.stuckTimer = (e.stuckTimer || 0) + dt;
  } else {
    e.stuckTimer = 0;
  }

  if ((e.stuckTimer || 0) > 1.1) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const nx = Math.cos(e.angle + side * Math.PI / 2);
    const ny = Math.sin(e.angle + side * Math.PI / 2);
    moveWithCollision(e, nx * e.speed * 0.35 * dt, ny * e.speed * 0.35 * dt);
    e.stuckTimer = 0;
  }

  e.lastX = e.x;
  e.lastY = e.y;

}

function coinDrop(e) {
  const base = { pineapple_slice:1, fish:1, meatball:2, mini_oven:2, boss:20 };
  const amount = (base[e.type] || 1)
    + (Math.random() < (state.player?.luck || 0) * 0.08 ? 1 : 0)
    + (state.player?.coinBonusPerKill || 0);
  state.runCoins = (state.runCoins || 0) + amount;
  spawnFloatingText(e.x, e.y - 16, `+${amount}🪙`, '#f5c842');
}

function defeatEnemy(e) {
  if (!e.alive) return;
  e.alive = false;
  coinDrop(e);
  if (typeof audioPlayEnemyDown === 'function') {
    audioPlayEnemyDown();
  }
  spawnXpOrb(e.x, e.y, e.xp);
  spawnParticles(e.x, e.y, e.color, 16);
}

function applyBulletDebuffs(enemy) {
  const p = state.player;
  if (!p) return;

  if (p.onHitSlowMove > 0) {
    enemy.slowMoveMult = Math.min(enemy.slowMoveMult || 1, p.onHitSlowMove);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2.25);
  }

  if (p.onHitSlowAttack > 0) {
    enemy.slowAttackMult = Math.min(enemy.slowAttackMult || 1, p.onHitSlowAttack);
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 2.25);
  }

  if (p.onHitBurnChance > 0 && Math.random() < p.onHitBurnChance) {
    enemy.burnTimer = Math.max(enemy.burnTimer || 0, 4);
    enemy.burnDps = Math.max(enemy.burnDps || 0, p.onHitBurnDps || 1);
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
      // Use movement collision so separation cannot shove actors into walls.
      moveWithCollision(player,  nx * push,  ny * push);
      moveWithCollision(e,      -nx * push, -ny * push);
    } else if (d === 0) {
      const a = Math.random() * Math.PI * 2;
      const nudge = Math.max(1, minDist * 0.2);
      moveWithCollision(player, Math.cos(a) * nudge, Math.sin(a) * nudge);
      moveWithCollision(e, -Math.cos(a) * nudge, -Math.sin(a) * nudge);
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
        moveWithCollision(a,  nx * push,  ny * push);
        moveWithCollision(b, -nx * push, -ny * push);
      } else if (d === 0) {
        const ang = Math.random() * Math.PI * 2;
        const nudge = Math.max(1, minDist * 0.2);
        moveWithCollision(a,  Math.cos(ang) * nudge,  Math.sin(ang) * nudge);
        moveWithCollision(b, -Math.cos(ang) * nudge, -Math.sin(ang) * nudge);
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
      damagePlayer(e.damage * (e.slowAttackMult || 1) * dt * 3);
    }
  });
}
