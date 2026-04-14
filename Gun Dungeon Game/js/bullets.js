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
  const w         = WEAPONS[2];  // rocket launcher definition
  const dmgBonus  = state.player?.weaponDmgBonus?.[2] ?? 0;
  const splashDmg = w.splashDamage + dmgBonus;
  spawnParticles(x, y, '#ff8800', 30);
  spawnParticles(x, y, '#ffee00', 20);
  if (typeof audioPlayEnemyHit === 'function') {
    audioPlayEnemyHit();
  }
  state.enemies.forEach(e => {
    if (!e.alive) return;
    const bossInvuln = e.type === 'boss' && (e.bossInvulnTimer || 0) > 0;
    if (bossInvuln) return;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < w.splashRadius) {
      const falloff = 1 - d / w.splashRadius;
      const dealt = Math.min(e.hp, splashDmg * falloff);
      e.hp -= dealt;
      if ((state.player?.lifesteal || 0) > 0 && dealt > 0) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + dealt * state.player.lifesteal);
      }
      if (typeof applyBulletDebuffs === 'function') {
        applyBulletDebuffs(e);
      }
      spawnParticles(e.x, e.y, e.color, 8);
      if (e.hp <= 0) {
        if (typeof defeatEnemy === 'function') {
          defeatEnemy(e);
        } else {
          e.alive = false;
        }
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
    const prevX = b.x;
    const prevY = b.y;
    const nextX = b.x + b.vx * dt;
    const nextY = b.y + b.vy * dt;
    b.distTraveled += Math.hypot(b.vx, b.vy) * dt;

    const hitWall = solidAt(nextX, nextY);
    if (hitWall) {
      if (!b.rocket && state.player?.bounceOnce && !b.bounced) {
        b.bounced = true;
        const hitX = solidAt(nextX, prevY);
        const hitY = solidAt(prevX, nextY);
        if (hitX && !hitY) b.vx *= -1;
        else if (hitY && !hitX) b.vy *= -1;
        else { b.vx *= -1; b.vy *= -1; }
        b.x = prevX + b.vx * dt * 0.25;
        b.y = prevY + b.vy * dt * 0.25;
        return;
      }
      b.x = nextX;
      b.y = nextY;
      if (b.rocket) rocketExplode(b.x, b.y);
      else spawnParticles(b.x, b.y, '#ffe066', 4);
      b.alive = false;
      return;
    }

    b.x = nextX;
    b.y = nextY;

    state.enemies.forEach(e => {
      if (!e.alive || !b.alive) return;
      if (rectOverlap(b, e)) {
        if (e.type === 'boss' && (e.bossInvulnTimer || 0) > 0) {
          spawnParticles(e.x, e.y, '#66ccff', 4);
          b.alive = false;
          return;
        }
        if (b.rocket) {
          rocketExplode(b.x, b.y);
          b.alive = false;
          return;
        }
        const dealt = Math.min(e.hp, b.damage);
        e.hp -= dealt;
        if ((state.player?.lifesteal || 0) > 0 && dealt > 0) {
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + dealt * state.player.lifesteal);
        }
        if (typeof applyBulletDebuffs === 'function') {
          applyBulletDebuffs(e);
        }
        if (typeof audioPlayEnemyHit === 'function') {
          audioPlayEnemyHit();
        }
        spawnParticles(e.x, e.y, e.color, 6);
        if (b.pierceLeft <= 0 && !(state.player?.pierceAll)) b.alive = false;
        else b.pierceLeft--;
        if (e.hp <= 0) {
          if (typeof defeatEnemy === 'function') {
            defeatEnemy(e);
          } else {
            e.alive = false;
          }
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

    if (solidAt(b.x, b.y)) {
      if (b.fireball) fireballExplode(b);
      b.alive = false;
      return;
    }

    // Fireball explodes when close to target
    if (b.fireball) {
      const dtx = Math.hypot(b.targetX - b.x, b.targetY - b.y);
      if (dtx < 18) { fireballExplode(b); b.alive = false; return; }
    }

    if (rectOverlap(b, player)) {
      if (damagePlayer(b.damage)) b.alive = false;
    }
  });
  state.enemyBullets = state.enemyBullets.filter(b => b.alive);
}

function fireballExplode(b) {
  if (typeof audioPlayEnemyHit === 'function') {
    audioPlayEnemyHit();
  }
  spawnParticles(b.x, b.y, '#ff6600', 20);
  spawnParticles(b.x, b.y, '#ffdd00', 12);
  const player = state.player;
  const splashR = 70;
  if (Math.hypot(player.x - b.x, player.y - b.y) < splashR) {
    damagePlayer(b.damage);
  }
}
