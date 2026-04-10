function fireBullet(x, y, angle, speed, damage, range, pierce, rocket = false) {
  state.bullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, range, distTraveled: 0,
    pierce, pierceLeft: pierce,
    alive: true,
    w: rocket ? 12 : 7,
    h: rocket ? 12 : 7,
    rocket,
  });
}

function rocketExplode(x, y) {
  const w = WEAPONS[2];  // rocket launcher definition
  spawnParticles(x, y, '#ff8800', 30);
  spawnParticles(x, y, '#ffee00', 20);
  state.enemies.forEach(e => {
    if (!e.alive) return;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < w.splashRadius) {
      const falloff = 1 - d / w.splashRadius;
      e.hp -= w.splashDamage * falloff;
      spawnParticles(e.x, e.y, e.color, 8);
      if (e.hp <= 0) {
        e.alive = false;
        spawnXpOrb(e.x, e.y, e.xp);
        spawnParticles(e.x, e.y, e.color, 16);
      }
    }
  });
}

function fireEnemyBullet(x, y, angle, speed, damage) {
  state.enemyBullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, alive: true, w: 6, h: 6, range: 600, distTraveled: 0,
    fireball: false,
  });
}

function fireEnemyFireball(x, y, targetX, targetY, speed, damage) {
  const dx   = targetX - x, dy = targetY - y;
  const dist = Math.hypot(dx, dy) || 1;
  state.enemyBullets.push({
    x, y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    damage, alive: true, w: 14, h: 14,
    range: 900, distTraveled: 0,
    fireball: true,
    targetX, targetY,
    startDist: dist,
  });
}

function updatePlayerBullets(dt) {
  state.bullets.forEach(b => {
    if (!b.alive) return;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.distTraveled += Math.hypot(b.vx, b.vy) * dt;

    if (b.distTraveled > b.range || solidAt(b.x, b.y)) {
      if (b.rocket) rocketExplode(b.x, b.y);
      else spawnParticles(b.x, b.y, '#ffe066', 4);
      b.alive = false;
      return;
    }

    state.enemies.forEach(e => {
      if (!e.alive || !b.alive) return;
      if (rectOverlap(b, e)) {
        if (b.rocket) {
          rocketExplode(b.x, b.y);
          b.alive = false;
          return;
        }
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
  state.bullets = state.bullets.filter(b => b.alive);
}

function updateEnemyBullets(dt) {
  const player = state.player;
  state.enemyBullets.forEach(b => {
    if (!b.alive) return;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.distTraveled += Math.hypot(b.vx, b.vy) * dt;

    if (b.distTraveled > b.range || solidAt(b.x, b.y)) {
      if (b.fireball) fireballExplode(b);
      b.alive = false;
      return;
    }

    // Fireball explodes when close to target
    if (b.fireball) {
      const dtx = Math.hypot(b.targetX - b.x, b.targetY - b.y);
      if (dtx < 18) { fireballExplode(b); b.alive = false; return; }
    }

    if (player.invincible <= 0 && rectOverlap(b, player)) {
      player.hp        -= b.damage;
      player.invincible = 0.5;
      b.alive           = false;
      spawnParticles(player.x, player.y, '#f44', 8);
      if (player.hp <= 0) { player.alive = false; endGame(false); }
    }
  });
  state.enemyBullets = state.enemyBullets.filter(b => b.alive);
}

function fireballExplode(b) {
  spawnParticles(b.x, b.y, '#ff6600', 20);
  spawnParticles(b.x, b.y, '#ffdd00', 12);
  const player = state.player;
  const splashR = 70;
  if (Math.hypot(player.x - b.x, player.y - b.y) < splashR && player.invincible <= 0) {
    player.hp        -= b.damage;
    player.invincible = 0.5;
    spawnParticles(player.x, player.y, '#f44', 8);
    if (player.hp <= 0) { player.alive = false; endGame(false); }
  }
}
