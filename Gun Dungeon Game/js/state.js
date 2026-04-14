// Shared mutable game state — all modules read/write this object
const state = {
  // Canvas / rendering (set by renderer.js initRenderer)
  canvas:  null,
  ctx:     null,
  minimap: null,
  mctx:    null,
  cam: { x: 0, y: 0 },

  // World
  worldMap: [],
  worldW: 0,
  worldH: 0,
  rooms: [],
  currentRoom: 0,
  spawnRoomIdx: 0,
  bossRoomIdx:  0,

  // Entities
  player:       null,
  enemies:      [],
  bullets:      [],
  enemyBullets: [],
  particles:    [],
  xpOrbs:       [],
  runCoins:     0,
  floatingTexts:[],
  floorSpikes:  [],

  // Boss door
  bossDoorTiles:    [],
  bossLocked:       true,
  bossUnlockNotif:  0,   // countdown seconds for "boss room unlocked" banner
  pressureNotif:    0,   // countdown seconds for "pressure wave" banner

  // Delayed room lock
  lockPending:  false,
  lockRoomIdx:  -1,

  // Game flow
  paused:   false,
  lastTime: 0,

  // Damage intake (resolved once per frame)
  pendingPlayerDamage: {
    amount: 0,
    invincible: 0.25,
    knockbackX: 0,
    knockbackY: 0,
  },
};

function queuePlayerDamage(amount, options = {}) {
  const player = state.player;
  if (!player || !player.alive || player.invincible > 0) return false;

  const pending = state.pendingPlayerDamage;
  if (amount > pending.amount) {
    pending.amount = amount;
    pending.invincible = options.invincible ?? 0.25;
    pending.knockbackX = options.knockbackX ?? 0;
    pending.knockbackY = options.knockbackY ?? 0;
    return true;
  }
  return false;
}

function applyQueuedPlayerDamage() {
  const player = state.player;
  const pending = state.pendingPlayerDamage;
  if (!player || !player.alive || pending.amount <= 0) return;

  player.hp -= pending.amount;
  player.invincible = pending.invincible;

  if ((pending.knockbackX !== 0 || pending.knockbackY !== 0) && typeof moveWithCollision === 'function') {
    moveWithCollision(player, pending.knockbackX, pending.knockbackY);
  }

  spawnParticles(player.x, player.y, '#f44', 8);
  if (player.hp <= 0) {
    player.alive = false;
    endGame(false);
  }

  pending.amount = 0;
  pending.invincible = 0.25;
  pending.knockbackX = 0;
  pending.knockbackY = 0;
}

function spawnFloatingText(x, y, text, color = '#fff') {
  state.floatingTexts.push({ x, y, text, color, life: 1.2, vy: -55 });
}
