function createPlayer(x, y) {
  return {
    x, y,
    w: 22, h: 22,
    hp: 100, maxHp: 100,
    speed: 180,
    angle: 0,
    fireRate:     280,
    fireCooldown: 0,
    bulletDamage: 18,
    bulletSpeed:  520,
    bulletRange:  420,
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

  // Movement
  let mx = 0, my = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    my -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  my += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  mx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
  const ml = Math.hypot(mx, my) || 1;
  if (mx || my) moveWithCollision(player, mx / ml * player.speed * dt, my / ml * player.speed * dt);

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
  player.fireCooldown = player.fireRate;

  const cam       = state.cam;
  const baseAngle = Math.atan2((mouse.y + cam.y) - player.y, (mouse.x + cam.x) - player.x);
  const count     = 1 + player.extraBullets;
  const spread    = 0.12;

  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spread;
    fireBullet(player.x, player.y, baseAngle + offset,
      player.bulletSpeed, player.bulletDamage, player.bulletRange, player.pierce);
  }
}
