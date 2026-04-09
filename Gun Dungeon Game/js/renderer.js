function initRenderer() {
  state.canvas  = document.getElementById('game-canvas');
  state.ctx     = state.canvas.getContext('2d');
  state.minimap = document.getElementById('minimap');
  state.mctx    = state.minimap.getContext('2d');
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

      if      (t === 0) ctx.fillStyle = '#050508';
      else if (t === 1) ctx.fillStyle = (col + row) % 2 === 0 ? '#1a1a2e' : '#16213e';
      else              ctx.fillStyle = '#4a3f55';

      ctx.fillRect(sx, sy, TILE, TILE);

      if (t === 2) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(sx, sy, TILE, 4);
      }
    }
  }
}

// ── Entity rendering ──────────────────────────────────────────────────────────
function drawEntity(e) {
  const { ctx, cam, player } = state;
  const sx = e.x - cam.x;
  const sy = e.y - cam.y;
  const hw = e.w / 2, hh = e.h / 2;

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + hh - 2, hw * 0.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(e.angle);

  if (e.type === 'boss') {
    ctx.shadowBlur = 20; ctx.shadowColor = e.color;
    ctx.fillStyle  = e.color;
    ctx.beginPath();
    ctx.moveTo(0, -hh); ctx.lineTo(hw, 0);
    ctx.lineTo(0, hh);  ctx.lineTo(-hw, 0);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

  } else if (e === player) {
    ctx.fillStyle = '#7ec8e3';
    ctx.fillRect(-hw, -hh, e.w, e.h);
    ctx.fillStyle = '#ccc';
    ctx.fillRect(0, -4, hw + 8, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-6, -8, 5, 5);
    ctx.fillRect( 2, -8, 5, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(-5, -7, 3, 3);
    ctx.fillRect( 3, -7, 3, 3);

  } else {
    ctx.fillStyle = e.color;
    ctx.fillRect(-hw, -hh, e.w, e.h);
    ctx.fillStyle = '#888';
    ctx.fillRect(2, -3, hw + 4, 6);
  }

  ctx.restore();

  // HP bar (enemies only)
  if (e !== player) {
    const barW = e.w + 8;
    const bx   = sx - barW / 2;
    const by   = sy - hh - 10;
    ctx.fillStyle = '#400';
    ctx.fillRect(bx, by, barW, 5);
    ctx.fillStyle = e.type === 'boss' ? '#0f0' : '#f33';
    ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), 5);
  }
}

// ── Bullet rendering ──────────────────────────────────────────────────────────
function drawBullets() {
  const { ctx, cam } = state;

  state.bullets.forEach(b => {
    if (!b.alive) return;
    ctx.fillStyle = '#ffe066';
    ctx.shadowBlur = 8; ctx.shadowColor = '#ff0';
    ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });

  state.enemyBullets.forEach(b => {
    if (!b.alive) return;
    ctx.fillStyle = '#f44';
    ctx.shadowBlur = 6; ctx.shadowColor = '#f00';
    ctx.beginPath(); ctx.arc(b.x - cam.x, b.y - cam.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
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
    ctx.fillStyle = '#4f4';
    ctx.shadowBlur = 8; ctx.shadowColor = '#0f0';
    ctx.beginPath(); ctx.arc(o.x - cam.x, o.y - cam.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  });
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
    ctx.fillStyle = 'rgba(100,255,100,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
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
