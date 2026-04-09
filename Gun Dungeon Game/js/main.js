function update(ts) {
  const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
  state.lastTime = ts;

  if (state.paused || !state.player || !state.player.alive) {
    requestAnimationFrame(update);
    return;
  }

  updatePlayer(dt);
  updateCurrentRoom();

  // Refresh active enemy list from current room
  const room = state.rooms[state.currentRoom];
  state.enemies = room.enemies.filter(e => e.alive);
  state.enemies.forEach(e => updateEnemy(e, dt));
  updateEnemyContact(dt);

  updatePlayerBullets(dt);
  updateEnemyBullets(dt);
  updateXpOrbs(dt);
  updateParticles(dt);

  checkRoomClear();
  updateCamera(state.player);
  updateHUD();

  // ── Render ──────────────────────────────────────────────────────────────────
  const { ctx, canvas } = state;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTiles();
  drawXpOrbs();
  drawParticles();
  drawBullets();
  state.enemies.forEach(drawEntity);
  drawEntity(state.player);
  drawLowHPFlash(ts);
  drawBossHPBar();
  drawRoomClearFlash();
  drawMinimap();

  requestAnimationFrame(update);
}

function startGame() {
  document.getElementById('screen-start').classList.add('hidden');
  document.getElementById('screen-gameover').classList.add('hidden');

  state.bullets      = [];
  state.enemyBullets = [];
  state.enemies      = [];
  state.particles    = [];
  state.xpOrbs       = [];
  state.paused       = false;

  generateDungeon();
  populateRooms();

  const spawn    = state.rooms[state.spawnRoomIdx];
  state.player   = createPlayer(spawn.cx, spawn.cy);
  state.cam.x    = state.player.x - state.canvas.width  / 2;
  state.cam.y    = state.player.y - state.canvas.height / 2;
  state.currentRoom = state.spawnRoomIdx;
  state.enemies     = state.rooms[state.currentRoom].enemies.filter(e => e.alive);

  document.getElementById('level-text').textContent = 'Lv 1';
  state.lastTime = performance.now();
  requestAnimationFrame(update);
}

function endGame(won) {
  state.paused = true;
  const title = document.getElementById('gameover-title');
  const msg   = document.getElementById('gameover-msg');
  if (won) {
    title.textContent = 'YOU WIN!';
    msg.textContent   = `You defeated the Lich and escaped the dungeon! Level ${state.player.level}`;
  } else {
    title.textContent = 'GAME OVER';
    msg.textContent   = `You fell in the dungeon at level ${state.player.level}.`;
  }
  setTimeout(() => document.getElementById('screen-gameover').classList.remove('hidden'), 800);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
initRenderer();
initInput(state.canvas);

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
