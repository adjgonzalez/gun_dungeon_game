// ── Persistent Upgrade System ─────────────────────────────────────────────────

const CHAR_UPGRADE_DEFS = [
  { id:'hp',         name:'Vitality',        icon:'❤️',
    desc: n => `+${n * 2} max HP`,
    stat: 'Max HP',           maxLevel:5, costPerLevel:15 },
  { id:'speed',      name:'Swiftness',       icon:'👟',
    desc: n => `+${n * 10}% move speed`,
    stat: 'Move Speed',       maxLevel:5, costPerLevel:20 },
  { id:'dodge',      name:'Evasion',         icon:'💨',
    desc: n => `${n * 2}% dodge chance`,
    stat: 'Dodge Chance',     maxLevel:5, costPerLevel:20 },
  { id:'luck',       name:'Fortune',         icon:'🍀',
    desc: n => `${n * 5}% luck bonus`,
    stat: 'Luck',             maxLevel:5, costPerLevel:20 },
  { id:'shieldCd',   name:'Shield Recharge', icon:'⏱️',
    desc: n => `-${n}s recharge time`,
    stat: 'Shield Cooldown',  maxLevel:5, costPerLevel:30 },
  { id:'shieldHp',   name:'Shield Strength', icon:'🛡️',
    desc: n => `${n} hit${n > 1 ? 's' : ''} of shield`,
    stat: 'Shield HP',        maxLevel:3, costPerLevel:35 },
  { id:'critChance', name:'Critical Eye',    icon:'🎯',
    desc: n => `${5 + n * 5}% crit chance`,
    stat: 'Crit Chance',      maxLevel:5, costPerLevel:25 },
  { id:'critDamage', name:'Lethal Strike',   icon:'⚔️',
    desc: n => `${(1.5 + n * 0.10).toFixed(1)}x crit damage`,
    stat: 'Crit Damage',      maxLevel:5, costPerLevel:25 },
  { id:'xpGain',     name:'Scholar',         icon:'📚',
    desc: n => `+${n * 5}% XP gain`,
    stat: 'XP Gain',          maxLevel:5, costPerLevel:20 },
];

const WEAPON_UPGRADE_DEFS = [
  { id:'wpnHandgun',  name:'Handgun Mastery',  icon:'🔫',
    desc: n => `+${n} dmg/shot  •  +${n * 8}% fire rate`,
    stat: 'Handgun',          maxLevel:3, costPerLevel:50 },
  { id:'wpnShotgun',  name:'Shotgun Mastery',  icon:'💥',
    desc: n => `+${n} dmg/pellet  •  +${n * 8}% fire rate`,
    stat: 'Shotgun',          maxLevel:3, costPerLevel:60 },
  { id:'wpnRocket',   name:'Rocket Mastery',   icon:'🚀',
    desc: n => `+${n * 2} dmg  •  +${n * 8}% fire rate`,
    stat: 'Rocket Launcher',  maxLevel:3, costPerLevel:75 },
];

// Combined array used by purchaseUpgrade lookup
const UPGRADE_DEFS = [...CHAR_UPGRADE_DEFS, ...WEAPON_UPGRADE_DEFS];

// Loaded from DB on login, written back on purchase or game end
let playerUpgrades = {
  hp:0, speed:0, dodge:0, luck:0, shieldCd:0, shieldHp:0,
  critChance:0, critDamage:0, xpGain:0,
  wpnHandgun:0, wpnShotgun:0, wpnRocket:0,
};
let playerCoins = 0;

function upgradeCost(id, currentLevel) {
  const def = UPGRADE_DEFS.find(d => d.id === id);
  return def ? (currentLevel + 1) * def.costPerLevel : Infinity;
}

// Apply all purchased upgrades to a freshly created player object
function applyUpgradesToPlayer(player) {
  const u = playerUpgrades;

  // ── Character upgrades ────────────────────────────────────────────────────
  player.maxHp       += u.hp         * 2;
  player.hp           = player.maxHp;
  player.speed        = Math.round(player.speed * (1 + u.speed * 0.10));
  player.dodgeChance  = u.dodge      * 0.02;
  player.luck         = u.luck       * 0.05;
  player.critChance   = 0.05 + u.critChance * 0.05;
  player.critDamage   = 1.5  + u.critDamage * 0.10;
  player.xpMultiplier = 1.0  + u.xpGain     * 0.05;

  // Shield activates as soon as any shieldHp is purchased
  if (u.shieldHp > 0) {
    player.shieldCooldown = Math.max(5, 20 - u.shieldCd);  // base 20s, -1s per level, min 5s
    player.shieldMaxHp    = u.shieldHp * 30;               // 30 HP per "hit" level
    player.shieldHp       = player.shieldMaxHp;
  }

  // ── Weapon upgrades ───────────────────────────────────────────────────────
  // Index order matches WEAPONS[]: 0=Handgun, 1=Shotgun, 2=Rocket Launcher
  player.weaponDmgBonus  = [
    u.wpnHandgun * 1,
    u.wpnShotgun * 1,
    u.wpnRocket  * 2,
  ];
  player.weaponRateBonus = [
    u.wpnHandgun * 0.08,
    u.wpnShotgun * 0.08,
    u.wpnRocket  * 0.08,
  ];
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function loadUpgradesFromServer() {
  if (!authToken) return;
  try {
    const res  = await fetch(`${API_URL}/upgrades`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      playerCoins    = data.coins    ?? 0;
      playerUpgrades = { ...playerUpgrades, ...(data.upgrades ?? {}) };
      const menuCoins = document.getElementById('menu-coins');
      if (menuCoins) menuCoins.textContent = playerCoins + ' coins';
    }
  } catch (e) { console.warn('Could not load upgrades:', e); }
}

async function saveUpgradesToServer() {
  if (!authToken) return;
  try {
    await fetch(`${API_URL}/upgrades`, {
      method: 'PUT',
      headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ coins: playerCoins, upgrades: playerUpgrades })
    });
  } catch (e) { console.warn('Could not save upgrades:', e); }
}

// Call at end of each run to bank earned coins
async function bankRunCoins(runCoins) {
  playerCoins += runCoins;
  await saveUpgradesToServer();
}

// ── Upgrade screen UI ─────────────────────────────────────────────────────────

function showUpgradeScreen() {
  renderUpgradeGrid();
  document.getElementById('upgrade-coins-count').textContent = playerCoins;
  document.getElementById('screen-start').classList.add('hidden');
  document.getElementById('screen-upgrade').classList.remove('hidden');
}

function hideUpgradeScreen() {
  document.getElementById('screen-upgrade').classList.add('hidden');
  document.getElementById('screen-start').classList.remove('hidden');
}

function renderUpgradeGrid() {
  const grid = document.getElementById('upgrade-grid');
  grid.innerHTML = '';

  // ── Character section ─────────────────────────────────────────────────────
  const charHeader = document.createElement('div');
  charHeader.className = 'upg-section-header';
  charHeader.textContent = 'CHARACTER UPGRADES';
  grid.appendChild(charHeader);

  CHAR_UPGRADE_DEFS.forEach(def => _appendUpgradeCard(grid, def));

  // ── Weapon section ────────────────────────────────────────────────────────
  const wpnHeader = document.createElement('div');
  wpnHeader.className = 'upg-section-header upg-section-weapon';
  wpnHeader.textContent = 'WEAPON UPGRADES';
  grid.appendChild(wpnHeader);

  WEAPON_UPGRADE_DEFS.forEach(def => _appendUpgradeCard(grid, def, true));
}

function _appendUpgradeCard(grid, def, isWeapon = false) {
  const lvl    = playerUpgrades[def.id] || 0;
  const maxed  = lvl >= def.maxLevel;
  const cost   = maxed ? '—' : upgradeCost(def.id, lvl) + ' 🪙';
  const canBuy = !maxed && playerCoins >= upgradeCost(def.id, lvl);

  const card = document.createElement('div');
  card.className = 'upgrade-card' + (maxed ? ' maxed' : '') + (isWeapon ? ' weapon-card' : '');
  card.innerHTML = `
    <div class="upg-icon">${def.icon}</div>
    <div class="upg-name">${def.name}</div>
    <div class="upg-stat">${def.stat}</div>
    <div class="upg-level">Lv ${lvl} / ${def.maxLevel}</div>
    <div class="upg-progress"><div class="upg-fill" style="width:${lvl / def.maxLevel * 100}%"></div></div>
    <div class="upg-desc">${maxed ? 'MAXED' : def.desc(lvl + 1)}</div>
    <div class="upg-cost">${cost}</div>
    ${maxed ? '' : `<button class="upg-btn" ${canBuy ? '' : 'disabled'} onclick="purchaseUpgrade('${def.id}')">UPGRADE</button>`}
  `;
  grid.appendChild(card);
}

async function purchaseUpgrade(id) {
  const lvl  = playerUpgrades[id] || 0;
  const def  = UPGRADE_DEFS.find(d => d.id === id);
  if (!def || lvl >= def.maxLevel) return;
  const cost = upgradeCost(id, lvl);
  if (playerCoins < cost) return;

  playerCoins        -= cost;
  playerUpgrades[id]  = lvl + 1;

  document.getElementById('upgrade-coins-count').textContent = playerCoins;
  renderUpgradeGrid();
  await saveUpgradesToServer();
}
