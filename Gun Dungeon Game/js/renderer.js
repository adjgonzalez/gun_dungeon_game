function initRenderer() {
  state.canvas  = document.getElementById('game-canvas');
  state.ctx     = state.canvas.getContext('2d');
  state.ctx.imageSmoothingEnabled = false;
  state.minimap = document.getElementById('minimap');
  state.mctx    = state.minimap.getContext('2d');
  state.mctx.imageSmoothingEnabled = false;
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

function resizeCanvas() {
  state.canvas.width  = window.innerWidth;
  state.canvas.height = window.innerHeight;
}

function updateCamera(player) {
  const cam = state.cam;
  cam.x += ((player.x - state.canvas.width  / 2) - cam.x) * 0.12;
  cam.y += ((player.y - state.canvas.height / 2) - cam.y) * 0.12;
}

// ── Tile rendering ────────────────────────────────────────────────────────────
function drawTiles() {
  const { ctx, cam, canvas } = state;
  const startCol = Math.floor(cam.x / TILE);
  const startRow = Math.floor(cam.y / TILE);
  const endCol   = startCol + Math.ceil(canvas.width  / TILE) + 2;
  const endRow   = startRow + Math.ceil(canvas.height / TILE) + 2;

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const t  = getTile(col, row);
      const sx = col * TILE - cam.x;
      const sy = row * TILE - cam.y;

      if      (t === 0) ctx.fillStyle = '#1a0e00';
      else if (t === 1) ctx.fillStyle = (col + row) % 2 === 0 ? '#c8a96e' : '#b8995e';
      else              ctx.fillStyle = '#5a3e2b';

      ctx.fillRect(sx, sy, TILE, TILE);

      if (t === 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(sx, sy, TILE, 4);
      }
    }
  }
}

// ── Pixel-art food sprite helpers ─────────────────────────────────────────────
// Each helper draws at origin (0,0) inside a save/translate/rotate block.
// p(ctx, x, y, w, h, color) is a shorthand pixel rect in "sprite pixels".

function p(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawPizzaSlice(ctx, hw, hh) {
  // Crust (tan/brown base triangle)
  ctx.fillStyle = '#c8813a';
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo( hw, hh);
  ctx.lineTo(-hw, hh);
  ctx.closePath();
  ctx.fill();
  // Cheese (yellow fill inside crust)
  ctx.fillStyle = '#f5d44a';
  ctx.beginPath();
  ctx.moveTo(0, -hh + 4);
  ctx.lineTo( hw - 4, hh - 3);
  ctx.lineTo(-hw + 4, hh - 3);
  ctx.closePath();
  ctx.fill();
  // Tomato sauce patches
  p(ctx, -4, -4,  5, 4, '#d63a2a');
  p(ctx,  2,  2,  4, 3, '#d63a2a');
  // Pepperoni dots
  ctx.fillStyle = '#8b1a0a';
  ctx.beginPath(); ctx.arc(-3,  0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 3, -5, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 1,  4, 2,   0, Math.PI * 2); ctx.fill();
  // Eyes
  p(ctx, -3, -hh + 6, 2, 2, '#000');
  p(ctx,  1, -hh + 6, 2, 2, '#000');
  // Gun barrel stub
  p(ctx, hw - 2, -2, 6, 4, '#aaa');
}

function drawPineappleSlice(ctx, hw, hh) {
  // Wedge/triangle shape — rind outer edge at bottom, tip at top
  // Rind (green outer skin)
  ctx.fillStyle = '#4a9a1a';
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo( hw, hh);
  ctx.lineTo(-hw, hh);
  ctx.closePath();
  ctx.fill();
  // Yellow flesh (inset triangle)
  ctx.fillStyle = '#f5c842';
  ctx.beginPath();
  ctx.moveTo(0, -hh + 4);
  ctx.lineTo( hw - 3, hh - 2);
  ctx.lineTo(-hw + 3, hh - 2);
  ctx.closePath();
  ctx.fill();
  // Diamond texture lines on flesh
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, -hh + 4);
  ctx.lineTo( hw - 3, hh - 2);
  ctx.lineTo(-hw + 3, hh - 2);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = '#b88a00';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      ctx.strokeRect(i * 5 - 2, j * 5, 4, 4);
    }
  }
  ctx.restore();
  // Eyes near the tip
  p(ctx, -3, -hh + 7, 2, 2, '#000');
  p(ctx,  2, -hh + 7, 2, 2, '#000');
  // Gun barrel on side
  p(ctx, hw - 1, -2, 5, 3, '#aaa');
}

function drawMeatball(ctx, hw, hh) {
  // Main brown sphere
  ctx.fillStyle = '#8b3a1a';
  ctx.beginPath();
  ctx.arc(0, 0, hw, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = '#b05a30';
  ctx.beginPath();
  ctx.arc(-hw * 0.3, -hh * 0.4, hw * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // Herb flecks
  p(ctx, -4,  2, 2, 1, '#3a7a1a');
  p(ctx,  3, -2, 2, 1, '#3a7a1a');
  p(ctx, -1,  5, 2, 1, '#3a7a1a');
  // Eyes
  p(ctx, -4, -3, 3, 3, '#1a0800');
  p(ctx,  2, -3, 3, 3, '#1a0800');
  // White pupils
  p(ctx, -3, -3, 1, 1, '#fff');
  p(ctx,  3, -3, 1, 1, '#fff');
  // Gun barrel
  p(ctx, hw, -2, 6, 4, '#aaa');
}

function drawFish(ctx, hw, hh) {
  // Body (blue oval)
  ctx.fillStyle = '#5bc8f5';
  ctx.beginPath();
  ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
  ctx.fill();
  // Scales highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(-2, -1, 4, 0, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc( 3,  2, 3, 0, Math.PI); ctx.stroke();
  // Tail fin
  ctx.fillStyle = '#3a9abf';
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.lineTo(-hw - 7,  hh);
  ctx.lineTo(-hw - 7, -hh);
  ctx.closePath();
  ctx.fill();
  // Eye
  p(ctx, 4, -3, 4, 4, '#fff');
  p(ctx, 5, -2, 2, 2, '#000');
  // Gun barrel
  p(ctx, hw, -2, 5, 3, '#aaa');
}

function drawMiniOven(ctx, hw, hh) {
  // Oven body
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
  // Door window
  ctx.fillStyle = '#222';
  ctx.fillRect(-hw + 3, -hh + 3, hw * 2 - 6, hh * 2 - 9);
  // Window glow (heating)
  ctx.fillStyle = 'rgba(255,120,0,0.5)';
  ctx.fillRect(-hw + 4, -hh + 4, hw * 2 - 8, hh * 2 - 11);
  // Knobs
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.arc(-hw + 4, hh - 3, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hw - 4,  hh - 3, 2, 0, Math.PI * 2); ctx.fill();
  // Heat glow eyes
  ctx.fillStyle = '#ff6600';
  ctx.beginPath(); ctx.arc(-3, -hh + 7, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 3, -hh + 7, 2, 0, Math.PI * 2); ctx.fill();
  // Gun barrel (smoke pipe on side)
  p(ctx, hw, -3, 5, 4, '#888');
}

function drawGiantPineapple(ctx, hw, hh) {
  // Body — large yellow oval
  ctx.fillStyle = '#f5c842';
  ctx.beginPath();
  ctx.ellipse(0, 4, hw, hh - 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Diamond grid pattern — clipped to body ellipse
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 4, hw, hh - 8, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = '#b88a00';
  ctx.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      ctx.strokeRect(i * 9 - 4, j * 9 - 4 + 4, 8, 8);
    }
  }
  ctx.restore();
  // Crown of leaves
  ctx.fillStyle = '#2d7a0a';
  const leaves = [
    [-12, -hh + 4, 5, 16],
    [-6,  -hh,     5, 20],
    [ 0,  -hh - 4, 6, 22],
    [ 6,  -hh,     5, 20],
    [ 12, -hh + 4, 5, 16],
  ];
  leaves.forEach(([lx, ly, lw, lh]) => {
    ctx.fillStyle = lx === 0 ? '#3a9a1a' : '#2d7a0a';
    ctx.beginPath();
    ctx.moveTo(lx + lw / 2, ly);
    ctx.lineTo(lx + lw, ly + lh);
    ctx.lineTo(lx, ly + lh);
    ctx.closePath();
    ctx.fill();
  });
  // Angry eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(-16, -4, 10, 10);
  ctx.fillRect(  6, -4, 10, 10);
  ctx.fillStyle = '#000';
  ctx.fillRect(-14, -2,  6,  6);
  ctx.fillRect(   8, -2,  6,  6);
  // Red pupils
  ctx.fillStyle = '#f00';
  ctx.fillRect(-13, -1, 3, 3);
  ctx.fillRect(   9, -1, 3, 3);
  // Angry brows
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-17, -6); ctx.lineTo(-6, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 17, -6); ctx.lineTo( 6, -8); ctx.stroke();
  // Spiky mouth
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(-12, 10);
  ctx.lineTo(-8,  16); ctx.lineTo(-4, 11);
  ctx.lineTo( 0,  16); ctx.lineTo( 4, 11);
  ctx.lineTo( 8,  16); ctx.lineTo(12, 10);
  ctx.closePath();
  ctx.fill();
  // Glow aura
  ctx.shadowBlur  = 24;
  ctx.shadowColor = '#f5c842';
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.ellipse(0, 4, hw + 3, hh - 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ── Entity rendering ──────────────────────────────────────────────────────────
function drawEntity(e) {
  const { ctx, cam, player } = state;
  const sx = e.x - cam.x;
  const sy = e.y - cam.y;
  const hw = e.w / 2, hh = e.h / 2;

  // Spawn marker — draw pulsing X, skip normal rendering
  if (e.spawning) {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.005));
    const s = e.w * 0.7;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = e.type === 'boss' ? '#f5c842' : e.color;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(sx - s, sy - s); ctx.lineTo(sx + s, sy + s);
    ctx.moveTo(sx + s, sy - s); ctx.lineTo(sx - s, sy + s);
    ctx.stroke();
    // Timer ring
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.3 * pulse;
    ctx.beginPath();
    ctx.arc(sx, sy, s * 1.2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.99);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + hh - 2, hw * 0.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(e.angle);

  if (e.type === 'boss') {
    drawGiantPineapple(ctx, hw, hh);

  } else if (e === player) {
    drawPizzaSlice(ctx, hw, hh);

  } else if (e.type === 'pineapple_slice') {
    drawPineappleSlice(ctx, hw, hh);

  } else if (e.type === 'meatball') {
    drawMeatball(ctx, hw, hh);

  } else if (e.type === 'fish') {
    drawFish(ctx, hw, hh);

  } else if (e.type === 'mini_oven') {
    drawMiniOven(ctx, hw, hh);

  } else {
    // fallback
    ctx.fillStyle = e.color;
    ctx.fillRect(-hw, -hh, e.w, e.h);
  }

  ctx.restore();

  // Shield ring (player only)
  if (e === state.player && e.shieldHp > 0 && e.shieldMaxHp > 0) {
    const shieldAlpha = 0.4 + 0.3 * Math.sin(Date.now() * 0.004);
    ctx.save();
    ctx.globalAlpha  = shieldAlpha;
    ctx.strokeStyle  = '#4af';
    ctx.lineWidth    = 3;
    ctx.shadowBlur   = 12;
    ctx.shadowColor  = '#4af';
    ctx.beginPath();
    ctx.arc(sx, sy, e.w * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // HP bar (enemies only)
  if (e !== player) {
    const barW = e.w + 8;
    const bx   = sx - barW / 2;
    const by   = sy - hh - 10;
    ctx.fillStyle = '#400';
    ctx.fillRect(bx, by, barW, 5);
    ctx.fillStyle = e.type === 'boss' ? '#f5c842' : '#f33';
    ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), 5);
  }

  // Meatball windup warning — pulsing red ring
  if (e.windingUp) {
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(Date.now() * 0.012));
    ctx.save();
    ctx.globalAlpha  = pulse;
    ctx.strokeStyle  = '#ff2200';
    ctx.lineWidth    = 3;
    ctx.shadowBlur   = 10;
    ctx.shadowColor  = '#ff2200';
    ctx.beginPath();
    ctx.arc(sx, sy, e.w * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Floor spike rendering ─────────────────────────────────────────────────────
function drawFloorSpikes() {
  const { ctx, cam } = state;
  const now = Date.now();
  state.floorSpikes.forEach(s => {
    if (!s.alive) return;
    const sx = s.x - cam.x;
    const sy = s.y - cam.y;

    if (s.phase === 'growing') {
      // Warning glow — pulsing circle crack
      const pulse = 0.35 + 0.65 * Math.abs(Math.sin(now * 0.014));
      ctx.save();
      ctx.globalAlpha  = pulse;
      ctx.shadowBlur   = 14;
      ctx.shadowColor  = '#f5c842';
      ctx.strokeStyle  = '#f5c842';
      ctx.lineWidth    = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.stroke();
      // Small inner dot
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Active spike cluster — 3 triangular points
      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#f5c842';
      for (let i = 0; i < 3; i++) {
        const a    = (Math.PI * 2 / 3) * i - Math.PI / 2;
        const tipX = sx + Math.cos(a) * 16;
        const tipY = sy + Math.sin(a) * 16;
        const l1X  = sx + Math.cos(a + 0.45) * 7;
        const l1Y  = sy + Math.sin(a + 0.45) * 7;
        const l2X  = sx + Math.cos(a - 0.45) * 7;
        const l2Y  = sy + Math.sin(a - 0.45) * 7;
        ctx.fillStyle = i === 0 ? '#f5c842' : '#b88a00';
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(l1X, l1Y);
        ctx.lineTo(l2X, l2Y);
        ctx.closePath();
        ctx.fill();
      }
      // Centre nub
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

// ── Boss special FX ───────────────────────────────────────────────────────────
function drawBossSpecialFX() {
  const { ctx, cam } = state;
  const room = state.rooms[state.currentRoom];
  if (!room || room.type !== 'boss') return;
  const boss = state.enemies.find(e => e.type === 'boss' && e.alive);
  if (!boss) return;
  const bsx = boss.x - cam.x;
  const bsy = boss.y - cam.y;
  const now = Date.now();

  if ((boss.bossInvulnTimer || 0) > 0) {
    const pulse = 0.35 + 0.25 * Math.abs(Math.sin(now * 0.012));
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#66ccff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#66ccff';
    ctx.beginPath();
    ctx.ellipse(bsx, bsy + 4, boss.w / 2 + 14, boss.h / 2 + 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Enraged pulsing red aura
  if (boss.bossEnraged) {
    const pulse = 0.25 + 0.25 * Math.sin(now * 0.008);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowBlur  = 28;
    ctx.shadowColor = '#ff0000';
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.ellipse(bsx, bsy + 4, boss.w / 2 + 10, boss.h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Special windup / active indicators on the boss
  if (boss.bossAttackState === 'special_windup') {
    const pulse = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.015));
    const colour = boss.bossCurrentSpecial === 'slices' ? '#00ff88' :
                   boss.bossCurrentSpecial === 'roll'   ? '#ff2200' : '#ff8800';
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = colour;
    ctx.lineWidth   = 3;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = colour;
    ctx.beginPath();
    ctx.arc(bsx, bsy, boss.w * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Stomp warning circles
  if (boss.bossCurrentSpecial === 'stomp' && boss.bossAttackState === 'special_active') {
    const data = boss.bossSpecialData;
    if (data.phase === 'warning') {
      const progress = 1 - data.warnTimer / 0.6;
      const pulse    = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.018));
      const tx       = data.targetX - cam.x;
      const ty       = data.targetY - cam.y;
      // Expanding warning ring
      ctx.save();
      ctx.globalAlpha = (1 - progress) * pulse;
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 16;
      ctx.shadowColor = '#ff4400';
      ctx.beginPath();
      ctx.arc(tx, ty, 20 + progress * 55, 0, Math.PI * 2);
      ctx.stroke();
      // Inner X marker
      ctx.globalAlpha = 0.7 * pulse;
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth   = 2;
      ctx.shadowBlur  = 0;
      const s = 14;
      ctx.beginPath();
      ctx.moveTo(tx - s, ty - s); ctx.lineTo(tx + s, ty + s);
      ctx.moveTo(tx + s, ty - s); ctx.lineTo(tx - s, ty + s);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Roll trail glow
  if (boss.bossCurrentSpecial === 'roll' && boss.bossAttackState === 'special_active') {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.shadowBlur  = 22;
    ctx.shadowColor = '#ff2200';
    ctx.fillStyle   = '#ff4400';
    ctx.beginPath();
    ctx.arc(bsx, bsy, boss.w / 2 + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Bullet rendering ──────────────────────────────────────────────────────────
function drawBullets() {
  const { ctx, cam } = state;

  state.bullets.forEach(b => {
    if (!b.alive) return;
    if (b.rocket) {
      ctx.fillStyle  = '#ff6600';
      ctx.shadowBlur = 14; ctx.shadowColor = '#ff3300';
      ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle  = '#fff176';
      ctx.shadowBlur = 8; ctx.shadowColor = '#f5c842';
      ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
  });

  state.enemyBullets.forEach(b => {
    if (!b.alive) return;
    if (b.fireball) {
      // Ground shadow — grows as fireball approaches its target
      const distToTarget = Math.hypot(b.targetX - b.x, b.targetY - b.y);
      const progress     = clamp(1 - distToTarget / b.startDist, 0, 1);
      const shadowR      = 10 + progress * 50;
      ctx.fillStyle = `rgba(0,0,0,${0.15 + progress * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(b.targetX - cam.x, b.targetY - cam.y, shadowR, shadowR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fireball itself
      ctx.fillStyle  = '#ff4400';
      ctx.shadowBlur = 18; ctx.shadowColor = '#ff8800';
      ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (b.spike) {
      // Boss spike — small yellow-brown triangle oriented along travel direction
      const angle = Math.atan2(b.vy, b.vx);
      const bx = b.x - cam.x, by = b.y - cam.y;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angle);
      ctx.fillStyle  = '#f5c842';
      ctx.shadowBlur = 8; ctx.shadowColor = '#b88a00';
      ctx.beginPath();
      ctx.moveTo( 8,  0);
      ctx.lineTo(-5,  4);
      ctx.lineTo(-5, -4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b88a00';
      ctx.beginPath();
      ctx.moveTo(8, 0); ctx.lineTo(-5, 4); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#5bc8f5';
      ctx.shadowBlur = 6; ctx.shadowColor = '#3a9abf';
      ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
}

// ── Particle rendering ────────────────────────────────────────────────────────
function drawParticles() {
  const { ctx, cam } = state;
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── XP orb rendering ──────────────────────────────────────────────────────────
function drawXpOrbs() {
  const { ctx, cam } = state;
  state.xpOrbs.forEach(o => {
    if (!o.alive) return;
    const ox = o.x - cam.x, oy = o.y - cam.y;
    // Coin shape
    ctx.fillStyle = '#f5c842';
    ctx.shadowBlur = 8; ctx.shadowColor = '#f5c842';
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#c8a000';
    ctx.beginPath(); ctx.arc(ox - 1, oy - 1, 2, 0, Math.PI * 2); ctx.fill();
  });
}

function drawFloatingTexts() {
  const { ctx, cam } = state;
  state.floatingTexts.forEach(t => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.font        = 'bold 14px Courier New';
    ctx.fillStyle   = t.color;
    ctx.textAlign   = 'center';
    ctx.fillText(t.text, t.x - cam.x, t.y - cam.y);
    ctx.restore();
  });
  ctx.textAlign = 'left';
}

// ── Weapon selector HUD ───────────────────────────────────────────────────────
function drawWeaponSelector() {
  const { ctx, canvas, player } = state;
  const slotW = 90, slotH = 44, gap = 8;
  const totalW = WEAPONS.length * slotW + (WEAPONS.length - 1) * gap;
  const startX = canvas.width / 2 - totalW / 2;
  const y      = canvas.height - slotH - 12;

  WEAPONS.forEach((w, i) => {
    const x       = startX + i * (slotW + gap);
    const active  = i === player.weaponIdx;

    // Slot background
    ctx.fillStyle = active ? 'rgba(245,200,66,0.25)' : 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x, y, slotW, slotH, 5);
    ctx.fill();

    // Border
    ctx.strokeStyle = active ? '#f5c842' : '#555';
    ctx.lineWidth   = active ? 2 : 1;
    ctx.stroke();

    // Key hint
    ctx.fillStyle = active ? '#f5c842' : '#777';
    ctx.font      = '10px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(`[${i + 1}]`, x + 5, y + 12);

    // Weapon name
    ctx.fillStyle = active ? '#fff' : '#aaa';
    ctx.font      = active ? 'bold 11px Courier New' : '11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(w.name, x + slotW / 2, y + 28);

    // Fire rate dots (visual indicator)
    const dotCount = 3;
    const speed    = i === 0 ? 3 : i === 1 ? 1 : 0;  // filled dots = relative speed
    for (let d = 0; d < dotCount; d++) {
      ctx.beginPath();
      ctx.arc(x + slotW / 2 - (dotCount - 1) * 5 + d * 10, y + 39, 3, 0, Math.PI * 2);
      ctx.fillStyle = d < speed + 1 ? (active ? '#f5c842' : '#888') : 'rgba(255,255,255,0.15)';
      ctx.fill();
    }
  });

  ctx.textAlign = 'left';
}

// ── Overlay effects ───────────────────────────────────────────────────────────
function drawLowHPFlash(ts) {
  const { ctx, canvas, player } = state;
  if (player.hp < player.maxHp * 0.3) {
    ctx.fillStyle = `rgba(200,0,0,${0.15 + 0.1 * Math.sin(ts * 0.005)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawRoomClearFlash() {
  const { ctx, canvas } = state;
  const room = state.rooms[state.currentRoom];
  if (room.cleared && room.type !== 'boss') {
    ctx.fillStyle = 'rgba(245,200,66,0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawBossUnlockBanner() {
  if (state.bossUnlockNotif <= 0) return;
  const { ctx, canvas } = state;
  // Fade out over the last second
  const alpha = Math.min(1, state.bossUnlockNotif);
  const cy = canvas.height / 2 - 40;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Dark background pill
  const text1 = 'ALL ROOMS CLEARED!';
  const text2 = 'THE BOSS ROOM IS UNLOCKED';
  ctx.font = 'bold 28px Courier New';
  const w1 = ctx.measureText(text1).width;
  ctx.font = 'bold 18px Courier New';
  const w2 = ctx.measureText(text2).width;
  const boxW = Math.max(w1, w2) + 48;
  const boxH = 80;
  const bx = canvas.width / 2 - boxW / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.roundRect(bx, cy, boxW, boxH, 8);
  ctx.fill();

  // Gold border
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top line
  ctx.fillStyle = '#f5c842';
  ctx.font = 'bold 24px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(text1, canvas.width / 2, cy + 30);

  // Bottom line
  ctx.fillStyle = '#fff';
  ctx.font = '15px Courier New';
  ctx.fillText(text2, canvas.width / 2, cy + 56);

  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPressureBanner() {
  if (state.pressureNotif <= 0) return;
  const { ctx, canvas } = state;
  const alpha = Math.min(1, state.pressureNotif);
  const margin = 18;
  const boxW = 300;
  const boxH = 56;
  const bx   = canvas.width - boxW - margin;
  const by   = canvas.height - boxH - margin;

  ctx.save();
  ctx.globalAlpha = alpha * 0.85;

  const text1 = '⚠  PRESSURE WAVE  ⚠';
  const text2 = 'The enemies grow restless!';

  ctx.fillStyle = 'rgba(115,0,0,0.62)';
  ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 8); ctx.fill();

  ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#ff6666';
  ctx.font = 'bold 15px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(text1, bx + boxW / 2, by + 22);

  ctx.fillStyle = '#ffbbbb';
  ctx.font = '12px Courier New';
  ctx.fillText(text2, bx + boxW / 2, by + 40);

  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBossHPBar() {
  const { ctx, canvas } = state;
  const room = state.rooms[state.currentRoom];
  if (room.type !== 'boss' || state.enemies.length === 0) return;
  const boss = state.enemies[0];
  ctx.fillStyle = '#222';
  ctx.fillRect(canvas.width / 2 - 200, 14, 400, 20);
  ctx.fillStyle = '#0f0';
  ctx.fillRect(canvas.width / 2 - 200, 14, 400 * (boss.hp / boss.maxHp), 20);
  ctx.fillStyle = '#fff';
  ctx.font = '13px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(`${boss.name}  ${Math.ceil(boss.hp)} / ${boss.maxHp}`, canvas.width / 2, 29);
  ctx.textAlign = 'left';
}

// ── Minimap ───────────────────────────────────────────────────────────────────
function drawMinimap() {
  const { mctx, minimap, rooms, player } = state;
  const mw = minimap.width, mh = minimap.height;
  mctx.clearRect(0, 0, mw, mh);
  mctx.fillStyle = '#111';
  mctx.fillRect(0, 0, mw, mh);

  const wx0 = rooms.reduce((m, r) => Math.min(m, r.tx), Infinity) * TILE;
  const wy0 = rooms.reduce((m, r) => Math.min(m, r.ty), Infinity) * TILE;
  const wx1 = rooms.reduce((m, r) => Math.max(m, r.tx + r.w), 0) * TILE;
  const wy1 = rooms.reduce((m, r) => Math.max(m, r.ty + r.h), 0) * TILE;
  const sc  = Math.min(mw / (wx1 - wx0), mh / (wy1 - wy0)) * TILE;

  rooms.forEach((r, idx) => {
    // Only show visited rooms; hide boss room until unlocked
    if (!r.visited) return;
    if (r.type === 'boss' && state.bossLocked) return;

    const rx = (r.tx * TILE - wx0) * sc / TILE;
    const ry = (r.ty * TILE - wy0) * sc / TILE;
    const rw = r.w * sc, rh = r.h * sc;

    if      (r.type === 'boss')  mctx.fillStyle = '#c00';   // boss: red
    else if (r.type === 'start') mctx.fillStyle = '#0a0';   // start: green
    else if (r.cleared)          mctx.fillStyle = '#226';   // cleared: blue
    else                         mctx.fillStyle = '#773';   // visited, not cleared: orange
    mctx.fillRect(rx, ry, rw, rh);

    if (idx === state.currentRoom) {
      mctx.strokeStyle = '#ff0'; mctx.lineWidth = 1.5;
      mctx.strokeRect(rx, ry, rw, rh);
    }
  });

  const px = (player.x - wx0) * sc / TILE;
  const py = (player.y - wy0) * sc / TILE;
  mctx.fillStyle = '#fff';
  mctx.beginPath(); mctx.arc(px, py, 3, 0, Math.PI * 2); mctx.fill();
}
