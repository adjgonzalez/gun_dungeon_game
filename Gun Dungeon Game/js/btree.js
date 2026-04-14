// ── Behavior Tree ─────────────────────────────────────────────────────────────
// Lightweight BT implementation used for per-enemy execution.
// The tree handles real-time interrupts (bullet dodge, low-HP flee) and
// flocking before delegating to type-specific AI for normal movement.
//
// Node status
const BT_SUCCESS = 'success';
const BT_FAILURE = 'failure';

// Node constructors
function btSeq(...c)  { return { t: 'seq', c }; }   // ALL children must succeed
function btSel(...c)  { return { t: 'sel', c }; }   // FIRST succeeding child wins
function btCond(fn)   { return { t: 'cond', fn }; } // succeeds if fn(e,dt) truthy
function btAct(fn)    { return { t: 'act',  fn }; } // always succeeds, runs fn

// Execute a node — returns BT_SUCCESS or BT_FAILURE
function btRun(node, e, dt) {
  switch (node.t) {
    case 'cond': return node.fn(e, dt) ? BT_SUCCESS : BT_FAILURE;
    case 'act':  node.fn(e, dt); return BT_SUCCESS;
    case 'seq':
      for (const child of node.c) {
        if (btRun(child, e, dt) === BT_FAILURE) return BT_FAILURE;
      }
      return BT_SUCCESS;
    case 'sel':
      for (const child of node.c) {
        if (btRun(child, e, dt) === BT_SUCCESS) return BT_SUCCESS;
      }
      return BT_FAILURE;
    default: return BT_FAILURE;
  }
}

// ── Interrupt: Bullet Dodge ───────────────────────────────────────────────────
// Finds the most threatening incoming player bullet and sidesteps it.

function _hasBulletThreat(e) {
  const THREAT_R = 88;
  return state.bullets.some(b => {
    if (!b.alive) return false;
    // Only react to bullets heading toward this enemy
    const toEx = e.x - b.x, toEy = e.y - b.y;
    const dot  = toEx * b.vx + toEy * b.vy;
    if (dot <= 0) return false;
    return Math.hypot(toEx, toEy) < THREAT_R;
  });
}

function _executeDodge(e, dt) {
  // Find closest threatening bullet
  let closest = null, closestD = Infinity;
  state.bullets.forEach(b => {
    if (!b.alive) return;
    const toEx = e.x - b.x, toEy = e.y - b.y;
    if (toEx * b.vx + toEy * b.vy <= 0) return;
    const d = Math.hypot(toEx, toEy);
    if (d < 88 && d < closestD) { closest = b; closestD = d; }
  });
  if (!closest) return;

  const bLen  = Math.hypot(closest.vx, closest.vy) || 1;
  // Two perpendicular dodge directions — pick the one that moves away from player
  const px1 = -closest.vy / bLen, py1 =  closest.vx / bLen;
  const px2 =  closest.vy / bLen, py2 = -closest.vx / bLen;
  const pl  = state.player;
  const d1  = Math.hypot(pl.x - (e.x + px1 * 60), pl.y - (e.y + py1 * 60));
  const d2  = Math.hypot(pl.x - (e.x + px2 * 60), pl.y - (e.y + py2 * 60));
  const nx  = d1 >= d2 ? px1 : px2;
  const ny  = d1 >= d2 ? py1 : py2;
  moveWithCollision(e, nx * e.speed * 1.9 * dt, ny * e.speed * 1.9 * dt);
}

// ── Interrupt: Low-HP Flee ────────────────────────────────────────────────────

function _isLowHp(e) {
  // Aggression-first behavior: disable flee interrupt.
  return false;
}

function _executeFlee(e, dt) {
  const pl = state.player;
  const dx = e.x - pl.x, dy = e.y - pl.y;
  const d  = Math.hypot(dx, dy) || 1;
  moveWithCollision(e, (dx / d) * e.speed * 1.35 * dt, (dy / d) * e.speed * 1.35 * dt);
}

// ── Flocking (separation + cohesion) ─────────────────────────────────────────
// Runs every frame as a movement modifier — keeps enemies spread out while
// maintaining loose group cohesion.

function _applyFlocking(e, dt) {
  const SEP_R     = e.w * 2.5;   // hard separation radius
  const COH_R     = e.w * 7;     // soft cohesion radius
  const SEP_FORCE = 110;
  const COH_FORCE = 16;

  let sepX = 0, sepY = 0;
  let cohX = 0, cohY = 0, cohN = 0;

  state.enemies.forEach(o => {
    if (o === e || !o.alive) return;
    const dx = e.x - o.x, dy = e.y - o.y;
    const d  = Math.hypot(dx, dy) || 1;
    if (d < SEP_R) {
      const str = (1 - d / SEP_R) * SEP_FORCE;
      sepX += (dx / d) * str;
      sepY += (dy / d) * str;
    } else if (d < COH_R) {
      cohX += o.x; cohY += o.y; cohN++;
    }
  });

  if (sepX !== 0 || sepY !== 0) {
    const sl = Math.hypot(sepX, sepY) || 1;
    moveWithCollision(e, (sepX / sl) * Math.min(sl, SEP_FORCE) * dt,
                         (sepY / sl) * Math.min(sl, SEP_FORCE) * dt);
  }
  if (cohN > 0) {
    const cx = cohX / cohN - e.x, cy = cohY / cohN - e.y;
    const cl = Math.hypot(cx, cy) || 1;
    moveWithCollision(e, (cx / cl) * COH_FORCE * dt, (cy / cl) * COH_FORCE * dt);
  }
}

// ── Per-enemy tree ────────────────────────────────────────────────────────────
// Priority selector — first succeeding branch wins.
//
//  Selector
//  ├─ Seq: DodgeInterrupt  (condition: bullet threat → dodge)
//  ├─ Seq: LowHpFlee       (condition: critical HP + melee → flee)
//  ├─ Act: Flocking        (always runs as modifier)
//  └─ FAILURE              (type-specific AI handles normal movement)

const _btDodge = btSeq(
  btCond((e) => {
    // Skip dodging while the meatball is mid-charge — momentum is part of its identity
    if (e.type === 'meatball' && e.mbState === 'charging') return false;
    // Enemies only react ~55% of the time — imperfect reflexes feel more natural
    return Math.random() < 0.55 && _hasBulletThreat(e);
  }),
  btAct(_executeDodge),
);

const _btFlee = btSeq(
  btCond(_isLowHp),
  btAct(_executeFlee),
);

const _btFlock = btAct(_applyFlocking);

// Returns true if the tree fully handled this enemy's movement this frame
// (i.e. dodge or flee fired), false otherwise (type-specific AI must run).
function runBehaviorTree(e, dt) {
  // Flocking always runs — it's additive so it never "handles" movement alone
  _applyFlocking(e, dt);

  // Check priority interrupts — if one fires, skip the type-specific AI
  if (btRun(_btDodge, e, dt) === BT_SUCCESS) return true;
  if (btRun(_btFlee,  e, dt) === BT_SUCCESS) return true;

  return false;  // delegate to type-specific AI
}
