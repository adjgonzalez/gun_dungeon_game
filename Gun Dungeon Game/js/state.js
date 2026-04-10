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

  // Boss door
  bossDoorTiles:    [],
  bossLocked:       true,
  bossUnlockNotif:  0,   // countdown seconds for "boss room unlocked" banner

  // Delayed room lock
  lockPending:  false,
  lockRoomIdx:  -1,

  // Game flow
  paused:   false,
  lastTime: 0,
};
