// ── Tile access ───────────────────────────────────────────────────────────────
function setTile(tx, ty, v) {
  if (ty >= 0 && ty < state.worldH && tx >= 0 && tx < state.worldW)
    state.worldMap[ty][tx] = v;
}

function getTile(tx, ty) {
  if (ty < 0 || ty >= state.worldH || tx < 0 || tx >= state.worldW) return 2;
  return state.worldMap[ty][tx];
}

function tileAt(wx, wy) {
  return getTile(Math.floor(wx / TILE), Math.floor(wy / TILE));
}

function solidAt(wx, wy) {
  const t = tileAt(wx, wy);
  return t === 0 || t === 2;
}

// ── Movement with tile collision ──────────────────────────────────────────────
function moveWithCollision(obj, dx, dy) {
  const hw = obj.w / 2, hh = obj.h / 2;

  obj.x += dx;
  if (solidAt(obj.x - hw + 2, obj.y)       || solidAt(obj.x + hw - 2, obj.y)       ||
      solidAt(obj.x - hw + 2, obj.y - hh + 2) || solidAt(obj.x + hw - 2, obj.y - hh + 2) ||
      solidAt(obj.x - hw + 2, obj.y + hh - 2) || solidAt(obj.x + hw - 2, obj.y + hh - 2)) {
    obj.x -= dx;
  }

  obj.y += dy;
  if (solidAt(obj.x, obj.y - hh + 2)          || solidAt(obj.x, obj.y + hh - 2)          ||
      solidAt(obj.x - hw + 2, obj.y - hh + 2) || solidAt(obj.x + hw - 2, obj.y - hh + 2) ||
      solidAt(obj.x - hw + 2, obj.y + hh - 2) || solidAt(obj.x + hw - 2, obj.y + hh - 2)) {
    obj.y -= dy;
  }
}

// ── Room lookup ───────────────────────────────────────────────────────────────
function getRoomAt(wx, wy) {
  for (let i = 0; i < state.rooms.length; i++) {
    const r = state.rooms[i];
    if (wx >= r.tx * TILE && wx < (r.tx + r.w) * TILE &&
        wy >= r.ty * TILE && wy < (r.ty + r.h) * TILE) return i;
  }
  return -1;
}

function updateCurrentRoom() {
  const idx = getRoomAt(state.player.x, state.player.y);
  if (idx >= 0 && idx !== state.currentRoom) {
    state.currentRoom = idx;
    const room = state.rooms[idx];
    room.visited = true;
    if (!room.cleared) {
      state.lockPending = true;
      state.lockRoomIdx = idx;
    } else {
      state.enemies = room.enemies.filter(e => e.alive || e.spawning);
    }
  }
}

function checkRoomClear() {
  const room = state.rooms[state.currentRoom];
  if (room.cleared) return;
  // Room is clear only when no enemies are alive or still spawning
  if (room.spawnQueue.length === 0 && room.enemies.filter(e => e.alive || e.spawning).length === 0) {
    room.cleared = true;
    unlockRoom(room);
    spawnParticles(room.cx, room.cy, '#ffd700', 30);
    if (room.type === 'boss') {
      endGame(true);
    } else if (state.bossLocked && state.rooms.every(r => r.type === 'boss' || r.cleared)) {
      unlockBossRoom();
    }
  }
}

// ── Dungeon generation ────────────────────────────────────────────────────────
function carveHallway(roomA, roomB, dir) {
  const ax = roomA.tx, ay = roomA.ty;
  const bx = roomB.tx, by = roomB.ty;

  if (dir === 'E') {
    const midY   = ay + Math.floor(roomA.h / 2);
    const startX = ax + roomA.w;
    const endX   = bx - 1;
    for (let x = startX; x <= endX; x++)
      for (let w = -1; w <= 1; w++) setTile(x, midY + w, 1);
    for (let x = startX; x <= endX; x++) {
      setTile(x, midY - 2, 2);
      setTile(x, midY + 2, 2);
    }
  } else if (dir === 'S') {
    const midX   = ax + Math.floor(roomA.w / 2);
    const startY = ay + roomA.h;
    const endY   = by - 1;
    for (let y = startY; y <= endY; y++)
      for (let w = -1; w <= 1; w++) setTile(midX + w, y, 1);
    for (let y = startY; y <= endY; y++) {
      setTile(midX - 2, y, 2);
      setTile(midX + 2, y, 2);
    }
  }
  // N and W are handled by the symmetric reverse call
}

function generateDungeon() {
  const GRID   = 5;
  const grid   = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  const placed = [];

  grid[2][2] = { type: 'start' };
  placed.push({ gx: 2, gy: 2 });

  const TARGET = 10;
  let attempts = 0;
  while (placed.length < TARGET && attempts < 1000) {
    attempts++;
    const src = choice(placed);
    const dir = choice(['N', 'S', 'E', 'W']);
    const [dx, dy] = DIRS[dir];
    const nx = src.gx + dx, ny = src.gy + dy;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
    if (grid[ny][nx]) continue;
    const type = placed.length === TARGET - 1 ? 'boss' : 'normal';
    grid[ny][nx] = { type, from: OPP[dir], fromGx: src.gx, fromGy: src.gy };
    placed.push({ gx: nx, gy: ny });
  }

  const PW = Math.max(ROOM_W, BOSS_ROOM_W) + HALL_LEN * 2 + 2;
  const PH = Math.max(ROOM_H, BOSS_ROOM_H) + HALL_LEN * 2 + 2;
  state.worldW   = GRID * PW + 4;
  state.worldH   = GRID * PH + 4;
  state.worldMap = Array.from({ length: state.worldH }, () => Array(state.worldW).fill(0));
  state.rooms    = [];

  const roomsByGrid = {};

  placed.forEach(({ gx, gy }) => {
    const info = grid[gy][gx];
    const rx   = gx * PW + 2 + HALL_LEN;
    const ry   = gy * PH + 2 + HALL_LEN;

    const rw = info.type === 'boss' ? BOSS_ROOM_W : ROOM_W;
    const rh = info.type === 'boss' ? BOSS_ROOM_H : ROOM_H;

    for (let row = 0; row < rh; row++)
      for (let col = 0; col < rw; col++)
        setTile(rx + col, ry + row, 1);

    for (let col = -1; col <= rw; col++) {
      setTile(rx + col, ry - 1, 2);
      setTile(rx + col, ry + rh, 2);
    }
    for (let row = -1; row <= rh; row++) {
      setTile(rx - 1, ry + row, 2);
      setTile(rx + rw, ry + row, 2);
    }

    const room = {
      tx: rx, ty: ry, gx, gy,
      w: rw, h: rh,
      cx: (rx + rw / 2) * TILE,
      cy: (ry + rh / 2) * TILE,
      type: info.type,
      cleared: info.type === 'start',
      visited: info.type === 'start',
      enemies: [],
      doors:   {},
    };
    state.rooms.push(room);
    roomsByGrid[`${gx},${gy}`] = room;
  });

  placed.forEach(({ gx, gy }) => {
    const room = roomsByGrid[`${gx},${gy}`];
    [['N', 0, -1], ['S', 0, 1], ['E', 1, 0], ['W', -1, 0]].forEach(([dir, dx, dy]) => {
      const nb = roomsByGrid[`${gx + dx},${gy + dy}`];
      if (!nb) return;
      carveHallway(room, nb, dir);
      room.doors[dir] = true;
    });
  });

  state.spawnRoomIdx = state.rooms.findIndex(r => r.type === 'start');
  state.bossRoomIdx  = state.rooms.findIndex(r => r.type === 'boss');
  state.bossLocked   = true;
  blockBossHallways();
  computeRoomDoorTiles();
}

// ── Boss door ─────────────────────────────────────────────────────────────────
function blockBossHallways() {
  const boss = state.rooms[state.bossRoomIdx];
  state.bossDoorTiles = [];

  [['N', 0, -1], ['S', 0, 1], ['E', 1, 0], ['W', -1, 0]].forEach(([dir, dx, dy]) => {
    const nb = state.rooms.find(r => r.gx === boss.gx + dx && r.gy === boss.gy + dy);
    if (!nb) return;

    if (dir === 'E') {
      // boss is left, nb is right — hallway carved east from boss
      const midY = boss.ty + Math.floor(boss.h / 2);
      const bx   = boss.tx + boss.w;
      for (let w = -1; w <= 1; w++) {
        state.bossDoorTiles.push({ tx: bx, ty: midY + w });
        setTile(bx, midY + w, 2);
      }
    } else if (dir === 'W') {
      // nb is left, boss is right — hallway carved east from nb to boss
      const midY = nb.ty + Math.floor(nb.h / 2);
      const bx   = boss.tx - 1;
      for (let w = -1; w <= 1; w++) {
        state.bossDoorTiles.push({ tx: bx, ty: midY + w });
        setTile(bx, midY + w, 2);
      }
    } else if (dir === 'S') {
      // boss is top, nb is bottom — hallway carved south from boss
      const midX = boss.tx + Math.floor(boss.w / 2);
      const by   = boss.ty + boss.h;
      for (let w = -1; w <= 1; w++) {
        state.bossDoorTiles.push({ tx: midX + w, ty: by });
        setTile(midX + w, by, 2);
      }
    } else if (dir === 'N') {
      // nb is top, boss is bottom — hallway carved south from nb to boss
      const midX = nb.tx + Math.floor(nb.w / 2);
      const by   = boss.ty - 1;
      for (let w = -1; w <= 1; w++) {
        state.bossDoorTiles.push({ tx: midX + w, ty: by });
        setTile(midX + w, by, 2);
      }
    }
  });
}

function unlockBossRoom() {
  state.bossLocked = false;
  state.bossDoorTiles.forEach(({ tx, ty }) => setTile(tx, ty, 1));
  state.bossDoorTiles = [];
}

// ── Per-room door locking ─────────────────────────────────────────────────────
function computeRoomDoorTiles() {
  state.rooms.forEach(room => {
    room.doorTiles = [];
    if (room.type === 'start') return;

    [['N', 0, -1], ['S', 0, 1], ['E', 1, 0], ['W', -1, 0]].forEach(([dir, dx, dy]) => {
      if (!room.doors[dir]) return;
      const nb = state.rooms.find(r => r.gx === room.gx + dx && r.gy === room.gy + dy);
      if (!nb) return;

      if (dir === 'E') {
        const midY = room.ty + Math.floor(room.h / 2);
        const bx   = room.tx + room.w;
        for (let w = -1; w <= 1; w++) room.doorTiles.push({ tx: bx,      ty: midY + w });
      } else if (dir === 'W') {
        const midY = nb.ty + Math.floor(nb.h / 2);
        const bx   = room.tx - 1;
        for (let w = -1; w <= 1; w++) room.doorTiles.push({ tx: bx,      ty: midY + w });
      } else if (dir === 'S') {
        const midX = room.tx + Math.floor(room.w / 2);
        const by   = room.ty + room.h;
        for (let w = -1; w <= 1; w++) room.doorTiles.push({ tx: midX + w, ty: by });
      } else if (dir === 'N') {
        const midX = nb.tx + Math.floor(nb.w / 2);
        const by   = room.ty - 1;
        for (let w = -1; w <= 1; w++) room.doorTiles.push({ tx: midX + w, ty: by });
      }
    });
  });
}

function lockRoom(room) {
  room.doorTiles.forEach(({ tx, ty }) => setTile(tx, ty, 2));
}

function unlockRoom(room) {
  room.doorTiles.forEach(({ tx, ty }) => setTile(tx, ty, 1));
}
