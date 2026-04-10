function update(ts) {
  const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
  state.lastTime = ts;

  if (state.paused || !state.player || !state.player.alive) {
    requestAnimationFrame(update);
    return;
  }

  updatePlayer(dt);
  updateCurrentRoom();

  // Lock doors once the player has walked far enough from any room edge
  if (state.lockPending) {
    const r = state.rooms[state.lockRoomIdx];
    if (!r || r.cleared || state.currentRoom !== state.lockRoomIdx) {
      state.lockPending = false;
    } else {
      const p = state.player;
      const distFromEdge = Math.min(
        p.x  - r.tx * TILE,
        (r.tx + r.w) * TILE - p.x,
        p.y  - r.ty * TILE,
        (r.ty + r.h) * TILE - p.y
      );
      if (distFromEdge >= 80) {
        state.lockPending = false;
        lockRoom(r);
        triggerRoomSpawn(r);
      }
    }
  }

  // Refresh active enemy list from current room (includes still-spawning enemies)
  const room = state.rooms[state.currentRoom];
  state.enemies = room.enemies.filter(e => e.alive || e.spawning);
  state.enemies.forEach(e => updateEnemy(e, dt));
  separateEntities();
  updateEnemyContact(dt);

  updatePlayerBullets(dt);
  updateEnemyBullets(dt);
  applyQueuedPlayerDamage();
  updateXpOrbs(dt);
  updateParticles(dt);

  checkRoomClear();
  if (state.bossUnlockNotif > 0) state.bossUnlockNotif -= dt;
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
  drawBossUnlockBanner();
  drawWeaponSelector();
  drawRoomClearFlash();
  drawMinimap();

  requestAnimationFrame(update);
}

function startGame() {
  // Check if user is authenticated
  if (!authToken || !currentUser) {
    showLoginScreen();
    return;
  }
  
  document.getElementById('screen-start').classList.add('hidden');
  document.getElementById('screen-gameover').classList.add('hidden');
  document.getElementById('screen-pause').classList.add('hidden');

  state.bullets      = [];
  state.enemyBullets = [];
  state.enemies      = [];
  state.particles    = [];
  state.xpOrbs       = [];
  state.paused       = false;
  state.lockPending  = false;
  state.lockRoomIdx  = -1;

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

function togglePause() {
  if (!state.player || !state.player.alive) return;
  const levelUpVisible = !document.getElementById('screen-levelup').classList.contains('hidden');
  const gameOverVisible = !document.getElementById('screen-gameover').classList.contains('hidden');
  if (levelUpVisible || gameOverVisible) return;

  state.paused = !state.paused;
  const pauseScreen = document.getElementById('screen-pause');
  if (state.paused) {
    pauseScreen.classList.remove('hidden');
  } else {
    pauseScreen.classList.add('hidden');
    state.lastTime = performance.now();
  }
}

function goToMainMenu() {
  state.paused = true;
  state.player = null;
  mouse.down = false;

  document.getElementById('screen-pause').classList.add('hidden');
  document.getElementById('screen-levelup').classList.add('hidden');
  document.getElementById('screen-gameover').classList.add('hidden');

  if (typeof showStartScreen === 'function') {
    showStartScreen();
  } else {
    document.getElementById('screen-start').classList.remove('hidden');
  }
}

function quitGame() {
  window.location.reload();
}

function endGame(won) {
  state.paused = true;
  const title = document.getElementById('gameover-title');
  const msg   = document.getElementById('gameover-msg');
  
  // Save player progress to database
  const finalScore = Math.floor(state.player.x / 32 * 10 + state.player.level * 100);
  updateUserProgress(finalScore, state.player.level);
  
  if (won) {
    title.textContent = 'YOU WIN!';
    msg.textContent   = `You defeated the Giant Pineapple and escaped the oven! Level ${state.player.level}`;
  } else {
    title.textContent = 'GAME OVER';
    msg.textContent   = `You fell in the dungeon at level ${state.player.level}.`;
  }
  setTimeout(() => document.getElementById('screen-gameover').classList.remove('hidden'), 800);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
initRenderer();
initInput(state.canvas);

window.addEventListener('keydown', e => {
  if (e.code === 'Escape' && !e.repeat) {
    togglePause();
  }
});

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-gameover-menu').addEventListener('click', goToMainMenu);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-main-menu').addEventListener('click', goToMainMenu);
document.getElementById('btn-quit-game').addEventListener('click', quitGame);
