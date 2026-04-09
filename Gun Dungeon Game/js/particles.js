function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(40, 140);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color, life: 1, r: rand(2, 5),
    });
  }
}

function spawnXpOrb(x, y, amount) {
  state.xpOrbs.push({ x, y, amount, alive: true, age: 0 });
}

function updateParticles(dt) {
  state.particles.forEach(p => {
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.vy += 60 * dt;
    p.life -= dt * 1.8;
  });
  state.particles = state.particles.filter(p => p.life > 0);
}

function updateXpOrbs(dt) {
  const player = state.player;
  state.xpOrbs.forEach(o => {
    if (!o.alive) return;
    o.age += dt;
    const d = dist(o, player);
    if (d < 80 || o.age > 8) {
      const dx = player.x - o.x, dy = player.y - o.y;
      const dd = Math.hypot(dx, dy) || 1;
      const spd = 220 + (80 - Math.min(d, 80));
      o.x += dx / dd * spd * dt;
      o.y += dy / dd * spd * dt;
    }
    if (dist(o, player) < 18) {
      o.alive = false;
      gainXp(o.amount);
    }
  });
  state.xpOrbs = state.xpOrbs.filter(o => o.alive);
}
