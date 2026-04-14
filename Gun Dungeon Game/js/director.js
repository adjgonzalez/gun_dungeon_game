// ── Swarm Director ────────────────────────────────────────────────────────────
// Singleton "dungeon master" brain that reads global state every tick and
// assigns roles to enemy groups, throttles direct chasers, tracks player
// comfort, and triggers pressure waves when the player is too safe.

const director = {
  // Role-assignment interval
  assignTimer:    0,
  ASSIGN_INTERVAL: 0.30,

  // Player movement pattern sampling
  sampleTimer:    0,
  SAMPLE_INTERVAL: 0.25,
  posHistory:     [],   // [{x, y}] last ~3 s of positions
  dominantAngle:  0,    // player's most common movement direction

  // Comfort / pressure
  comfortTimer:   0,
  _lastPlayerHp:  100,
  PRESSURE_THRESHOLD: 8.0,  // seconds without taking damage → pressure
  pressureActive: false,
  pressureTimer:  0,
  PRESSURE_DURATION:  5.0,

  // Role caps (raised during pressure)
  maxAggressors:  2,
};

// ── Public entry — call once per frame ────────────────────────────────────────
function updateDirector(dt) {
  if (!state.player || !state.player.alive) return;

  // ── Detect damage taken (self-contained — no external hook needed) ──────────
  const hp = state.player.hp;
  if (hp < director._lastPlayerHp) {
    director.comfortTimer = 0;
    // If pressure achieved its goal, wind it down early
    if (director.pressureActive) {
      director.pressureActive = false;
      director.pressureTimer  = 0;
      director.maxAggressors  = 2;
    }
  }
  director._lastPlayerHp = hp;

  // ── Comfort / pressure timer ─────────────────────────────────────────────────
  director.comfortTimer += dt;
  if (director.pressureActive) {
    director.pressureTimer -= dt;
    if (director.pressureTimer <= 0) _endPressure();
  } else if (director.comfortTimer >= director.PRESSURE_THRESHOLD) {
    _triggerPressure();
  }

  // ── Sample player position for pattern detection ──────────────────────────────
  director.sampleTimer += dt;
  if (director.sampleTimer >= director.SAMPLE_INTERVAL) {
    director.sampleTimer = 0;
    director.posHistory.push({ x: state.player.x, y: state.player.y });
    if (director.posHistory.length > 14) director.posHistory.shift();
    _detectPlayerPattern();
  }

  // ── Periodic role assignment ──────────────────────────────────────────────────
  director.assignTimer += dt;
  if (director.assignTimer >= director.ASSIGN_INTERVAL) {
    director.assignTimer = 0;
    _assignRoles();
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _detectPlayerPattern() {
  const h = director.posHistory;
  if (h.length < 4) return;
  // Circular mean of movement vectors over the history window
  let sx = 0, sy = 0;
  for (let i = 1; i < h.length; i++) {
    sx += h[i].x - h[i - 1].x;
    sy += h[i].y - h[i - 1].y;
  }
  const len = Math.hypot(sx, sy);
  if (len > 8) director.dominantAngle = Math.atan2(sy, sx);
}

function _assignRoles() {
  const alive = state.enemies.filter(e => e.alive);
  if (alive.length === 0) return;

  const maxAgg = director.maxAggressors;
  let   aggCount = 0;

  // Perpendicular flanking angles — split enemies to opposite sides
  const perpA = director.dominantAngle + Math.PI / 2;
  const perpB = director.dominantAngle - Math.PI / 2;

  alive.forEach((e, i) => {
    if (e.type === 'boss') { e.role = 'aggressor'; return; }

    // Ranged enemies become harassers (they shoot from range, not brawl)
    if (e.type === 'fish' || e.type === 'mini_oven') {
      e.role = 'harasser';
      return;
    }

    if (aggCount < maxAgg) {
      e.role = 'aggressor';
      aggCount++;
    } else {
      // Flanker: approach from the side that cuts off the player's movement
      const side = i % 2 === 0 ? perpA : perpB;
      e.role       = 'flanker';
      // Store a world-space flank approach point (updated each assign tick)
      e.flankTarget = {
        x: state.player.x + Math.cos(side) * 140,
        y: state.player.y + Math.sin(side) * 140,
      };
    }
  });
}

function _triggerPressure() {
  director.pressureActive = true;
  director.pressureTimer  = director.PRESSURE_DURATION;
  director.comfortTimer   = 0;
  director.maxAggressors  = Math.min(4, state.enemies.filter(e => e.alive).length);
  state.pressureNotif     = 3.5; // triggers on-screen banner in renderer
  // Temporarily boost all melee enemies
  state.enemies.forEach(e => {
    if (!e.alive || e.type === 'boss' || e.pressureBoosted) return;
    if (e.type === 'pineapple_slice' || e.type === 'meatball') {
      e.speed          *= 1.22;
      e.pressureBoosted = true;
    }
  });
}

function _endPressure() {
  director.pressureActive = false;
  director.pressureTimer  = 0;
  director.maxAggressors  = 2;
  // Revert speed boosts
  state.enemies.forEach(e => {
    if (e.pressureBoosted) {
      e.speed          /= 1.22;
      e.pressureBoosted = false;
    }
  });
}
