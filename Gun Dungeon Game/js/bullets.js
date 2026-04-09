function fireBullet(x, y, angle, speed, damage, range, pierce) {
  state.bullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, range, distTraveled: 0,
    pierce, pierceLeft: pierce,
    alive: true, w: 7, h: 7,
  });
}

function fireEnemyBullet(x, y, angle, speed, damage) {
  state.enemyBullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage, alive: true, w: 6, h: 6, range: 600, distTraveled: 0,
  });
}

function updatePlayerBullets(dt) {
  state.bullets.forEach(b => {
    if (!b.alive) return;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.distTraveled += Math.hypot(b.vx, b.vy) * dt;

    if (b.distTraveled > b.range || solidAt(b.x, b.y)) {
      spawnParticles(b.x, b.y, '#ffe066', 4);
      b.alive = false;
      return;
    }

    state.enemies.forEach(e => {
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
  state.bullets = state.bullets.filter(b => b.alive);
}

function updateEnemyBullets(dt) {
  const player = state.player;
  state.enemyBullets.forEach(b => {
    if (!b.alive) return;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.distTraveled += Math.hypot(b.vx, b.vy) * dt;

    if (b.distTraveled > b.range || solidAt(b.x, b.y)) { b.alive = false; return; }

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
