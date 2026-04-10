// Tile and room sizing
const TILE        = 48;
const ROOM_W      = 17;
const ROOM_H      = 13;
const BOSS_ROOM_W = 25;
const BOSS_ROOM_H = 19;
const HALL_LEN    = 4;

const DIRS = { N:[0,-1], S:[0,1], E:[1,0], W:[-1,0] };
const OPP  = { N:'S', S:'N', E:'W', W:'E' };

// ── Weapon definitions ────────────────────────────────────────────────────────
const WEAPONS = [
  {
    name:         'Handgun',
    fireRate:     220,    // ms between shots — fast
    bulletDamage: 15,
    bulletSpeed:  540,
    bulletRange:  450,
    pellets:      1,
    spread:       0.05,
    rocket:       false,
  },
  {
    name:         'Shotgun',
    fireRate:     950,    // slow
    bulletDamage: 22,
    bulletSpeed:  380,
    bulletRange:  260,
    pellets:      3,
    spread:       0.30,   // cone half-angle in radians
    rocket:       false,
  },
  {
    name:         'Rocket Launcher',
    fireRate:     1800,   // very slow
    bulletDamage: 80,
    bulletSpeed:  260,
    bulletRange:  800,
    pellets:      1,
    spread:       0.01,
    rocket:       true,
    splashRadius: 100,
    splashDamage: 45,
  },
];
