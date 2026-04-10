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

  player.fireCooldown = w.fireRate * fireRateRatio;

  const cam       = state.cam;
  const baseAngle = Math.atan2((mouse.y + cam.y) - player.y, (mouse.x + cam.x) - player.x);
  const pellets   = w.pellets + (w.rocket ? 0 : player.extraBullets);

  for (let i = 0; i < pellets; i++) {
    const offset = pellets > 1 ? (i / (pellets - 1) - 0.5) * 2 * w.spread : 0;
    fireBullet(
      player.x, player.y,
      baseAngle + offset,
      w.bulletSpeed  * speedRatio,
      w.bulletDamage * damageRatio,
      w.bulletRange  * rangeRatio,
      w.rocket ? 0 : player.pierce,
      w.rocket,
    );
  }
}
