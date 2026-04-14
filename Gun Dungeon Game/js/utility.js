// ── Utility AI ────────────────────────────────────────────────────────────────
// Each enemy scores a set of candidate actions every frame. The highest-scoring
// action is written to e.utilityAction and read by the behavior tree and the
// type-specific AI functions.
//
// Action vocabulary:
//   'chase'   — close in on the player directly
//   'flank'   — approach from the director-assigned flank point
//   'strafe'  — orbit / strafe perpendicular to the player
//   'retreat' — back away from the player
//   'attack'  — commit to attacking (for ranged enemies: hold position + shoot)

// Count player bullets within a radius of the enemy
function _nearbyBulletCount(e, radius) {
  let n = 0;
  state.bullets.forEach(b => {
    if (b.alive && Math.hypot(b.x - e.x, b.y - e.y) < radius) n++;
  });
  return n;
}

function computeUtility(e) {
  const player   = state.player;
  const dx       = player.x - e.x, dy = player.y - e.y;
  const dist     = Math.hypot(dx, dy) || 1;

  // ── Normalised inputs (0–1) ───────────────────────────────────────────────
  const distN    = clamp(dist / 580, 0, 1);          // 0 = touching, 1 = very far
  const hpRatio  = clamp(e.hp / e.maxHp, 0, 1);      // 0 = dying, 1 = full
  const threatN  = clamp(_nearbyBulletCount(e, 100) / 3, 0, 1); // bullet density
  const role     = e.role || 'aggressor';

  // ── Score table ───────────────────────────────────────────────────────────
  const s = { chase: 0, flank: 0, strafe: 0, retreat: 0, attack: 0 };

  // Distance: far → chase to close gap; close → prefer strafe/attack
  s.chase   += distN * 2.2;
  s.strafe  += (1 - distN) * 1.4;
  s.attack  += (1 - distN) * 2.0;

  // Health: low HP → strongly prefer retreat over engagement
  s.retreat += (1 - hpRatio) * 3.8;
  s.chase   -= (1 - hpRatio) * 1.2;
  s.attack  -= (1 - hpRatio) * 0.8;

  // Bullet threat: nearby bullets → boost retreat and strafe
  s.retreat += threatN * 2.8;
  s.strafe  += threatN * 1.6;
  s.chase   -= threatN * 0.9;

  // Role biases from the Swarm Director
  if (role === 'aggressor') {
    s.chase  += 3.0;
    s.flank  -= 2.0;
  } else if (role === 'flanker') {
    s.flank  += 4.0;
    s.chase  -= 1.5;
  } else if (role === 'harasser') {
    s.strafe += 2.5;
    s.attack += 2.0;
    s.chase  -= 1.5;
  }

  // Type-specific biases
  if (e.type === 'pineapple_slice' || e.type === 'meatball') {
    // Melee — can't meaningfully 'attack' at range
    s.attack = 0;
    // Meatball has its own charge logic; don't override with retreat unless critical
    if (e.type === 'meatball') s.retreat *= 0.4;
  }
  if (e.type === 'fish' || e.type === 'mini_oven') {
    // Ranged — dislike direct melee
    s.chase  -= 1.2;
    s.strafe += 0.6;
    s.attack += 0.5;
    // Ranged enemies retreat more readily (they have no melee)
    s.retreat += (1 - hpRatio) * 1.5;
  }

  // Pick action with highest score
  e.utilityAction = Object.keys(s).reduce((best, k) => s[k] > s[best] ? k : best, 'chase');
}
