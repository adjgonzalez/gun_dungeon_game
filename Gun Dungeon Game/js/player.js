function createPlayer(x, y) {
  return {
    x, y,
    w: 22, h: 22,
    hp: 100, maxHp: 100,
    speed: 180,
    vx: 0, vy: 0,          // velocity for enemy prediction
    angle: 0,
    weaponIdx:    0,        // 0=Handgun, 1=Shotgun, 2=Rocket Launcher
    fireCooldown: 0,
    // legacy fields kept for buff compatibility
    fireRate:     220,
    bulletDamage: 15,
    bulletSpeed:  540,
    bulletRange:  450,
    pierce:       0,
    extraBullets: 0,
    regen:        0,
    regenAccum:   0,
    xp:      0,
    xpNext:  80,
    level:   1,
    alive:       true,
    invincible:  0,
    dodgeChance:    0,
    luck:           0,
    shieldCooldown: 0,
    shieldMaxHp:    0,
    shieldHp:       0,
    shieldTimer:    0,
    critChance:     0.05,
    critDamage:     1.5,
    xpMultiplier:   1.0,
    weaponDmgBonus:  [0, 0, 0],   // per-weapon flat damage bonus from upgrades
    weaponRateBonus: [0, 0, 0],   // per-weapon fire-rate reduction factor (0–1)
    appliedBuffs: [],
  };
}

function updatePlayer(dt) {
  const player = state.player;

  // Weapon switching — scroll wheel or keys 1/2/3
  const wCount = WEAPONS.length;
  if (mouse.scrollDelta !== 0) {
    player.weaponIdx = (player.weaponIdx + Math.sign(mouse.scrollDelta) + wCount) % wCount;
    player.fireCooldown = 0;
    mouse.scrollDelta = 0;
  }
  if (keys['Digit1']) player.weaponIdx = 0;
  if (keys['Digit2']) player.weaponIdx = 1;
  if (keys['Digit3']) player.weaponIdx = 2;

  // Movement
  let mx = 0, my = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    my -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  my += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  const ml = Math.hypot(mx, my) || 1;
  if (mx || my) {
    player.vx = (mx / ml) * player.speed;
    player.vy = (my / ml) * player.speed;
    moveWithCollision(player, player.vx * dt, player.vy * dt);
  } else {
    player.vx = 0;
    player.vy = 0;
  }

  // Face mouse
  const cam = state.cam;
  player.angle = Math.atan2((mouse.y + cam.y) - player.y, (mouse.x + cam.x) - player.x);

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

  // Invincibility cooldown
  if (player.invincible > 0) player.invincible -= dt;

  // Shield recharge
  if (player.shieldMaxHp > 0 && player.shieldHp < player.shieldMaxHp) {
    if (player.shieldTimer > 0) {
      player.shieldTimer -= dt;
    } else {
      player.shieldHp = player.shieldMaxHp;
      spawnFloatingText(player.x, player.y - 30, 'SHIELD!', '#4af');
    }
  }
}

function playerShoot(dt) {
  const player = state.player;
  player.fireCooldown -= dt * 1000;
  if (!mouse.down || player.fireCooldown > 0) return;

  const w    = WEAPONS[player.weaponIdx];
  const base = WEAPONS[0]; // handgun — the reference for buff ratios

  // Buff multipliers derived from how much the player's base stats have changed
  const damageRatio    = player.bulletDamage / base.bulletDamage;
  const fireRateRatio  = player.fireRate      / base.fireRate;
  const speedRatio     = player.bulletSpeed   / base.bulletSpeed;
  const rangeRatio     = player.bulletRange   / base.bulletRange;

  // Weapon-specific upgrade bonuses
  const wIdx      = player.weaponIdx;
  const dmgBonus  = player.weaponDmgBonus[wIdx]  || 0;  // flat damage per pellet
  const rateBonus = player.weaponRateBonus[wIdx]  || 0;  // fire-rate reduction factor

  player.fireCooldown = w.fireRate * fireRateRatio * (1 - rateBonus);
  if (typeof audioPlayShoot === 'function') {
    audioPlayShoot(player.weaponIdx);
  }

  const cam       = state.cam;
  const baseAngle = Math.atan2((mouse.y + cam.y) - player.y, (mouse.x + cam.x) - player.x);
  const pellets   = w.pellets + (w.rocket ? 0 : player.extraBullets);

  for (let i = 0; i < pellets; i++) {
    const offset = pellets > 1 ? (i / (pellets - 1) - 0.5) * 2 * w.spread : 0;
    const isCrit   = Math.random() < player.critChance;
    const dmgMult  = isCrit ? player.critDamage * damageRatio : damageRatio;
    if (isCrit) spawnFloatingText(player.x, player.y - 20, 'CRIT!', '#ffd700');
    fireBullet(
      player.x, player.y,
      baseAngle + offset,
      w.bulletSpeed * speedRatio,
      (w.bulletDamage + dmgBonus) * dmgMult,
      w.bulletRange  * rangeRatio,
      w.rocket ? 0 : player.pierce,
      w.rocket,
    );
  }
}

// Unified damage handler — checks dodge, shield, invincibility, then applies HP damage
function damagePlayer(amount) {
  const p = state.player;
  if (!p || !p.alive || p.invincible > 0) return false;

  // Dodge roll
  if (p.dodgeChance > 0 && Math.random() < p.dodgeChance) {
    spawnFloatingText(p.x, p.y - 24, 'DODGE!', '#0ff');
    p.invincible = 0.35;
    return false;
  }

  let dmg = amount;

  // Shield absorption
  if (p.shieldHp > 0) {
    p.shieldHp = Math.max(0, p.shieldHp - 1);
    dmg = 0;
    if (typeof audioPlayShieldHit === 'function') {
      audioPlayShieldHit();
    }
    if (p.shieldHp <= 0 && p.shieldCooldown > 0) {
      p.shieldTimer = p.shieldCooldown;
      spawnFloatingText(p.x, p.y - 24, 'SHIELD BREAK', '#f80');
      if (typeof audioPlayShieldBreak === 'function') {
        audioPlayShieldBreak();
      }
    }
    spawnParticles(p.x, p.y, '#4af', 5);
    if (dmg <= 0) { p.invincible = 0.2; return false; }
  }

  p.hp        -= dmg;
  p.invincible = 0.4;
  if (typeof audioPlayPlayerHit === 'function') {
    audioPlayPlayerHit();
  }
  spawnParticles(p.x, p.y, '#f44', 8);
  if (p.hp <= 0) { p.alive = false; endGame(false); }
  return true;
}
