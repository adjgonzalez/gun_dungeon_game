function rollInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hasBuff(id) {
  return state.player.appliedBuffs.includes(id);
}

const BUFFS_DEF = [
  // Character commons
  {
    id:'char_hp', rarity:'common', icon:'❤️',
    name:'Sturdy Frame', desc:'+1 Max HP',
    apply: p => { p.maxHp += 1; p.hp = Math.min(p.hp + 1, p.maxHp); },
  },
  {
    id:'char_speed', rarity:'common', icon:'👟',
    name:'Swift Step', desc:'Speed Increase',
    apply: p => { p.speed *= 1.08; },
  },
  {
    id:'char_luck', rarity:'common', icon:'🍀',
    name:'Lucky Streak', desc:'+1% to +5% luck',
    apply: p => { p.luck += rollInt(1, 5) / 100; },
  },

  // Weapon commons
  {
    id:'hg_dmg', rarity:'common', icon:'🔫',
    name:'Handgun Rounds', desc:'+3% to +6% Handgun damage',
    apply: p => { p.weaponDamageMult[0] *= 1 + rollInt(3, 6) / 100; },
  },
  {
    id:'hg_rate', rarity:'common', icon:'⚡',
    name:'Handgun Trigger', desc:'+1% to +5% Handgun attack speed',
    apply: p => { p.weaponRateBonus[0] += rollInt(1, 5) / 100; },
  },
  {
    id:'sg_pellets', rarity:'common', icon:'💥',
    name:'Shotgun Buckshot', desc:'Shotgun fires 5 pellets',
    apply: p => { p.weaponExtraPellets[1] = Math.max(p.weaponExtraPellets[1], 2); },
  },
  {
    id:'sg_spread', rarity:'common', icon:'🎯',
    name:'Tighter Spread', desc:'Reduce Shotgun cone spread by 5% to 10%',
    apply: p => { p.weaponSpreadMult[1] *= 1 - rollInt(5, 10) / 100; },
  },
  {
    id:'sg_rate', rarity:'common', icon:'⚡',
    name:'Shotgun Reload Drill', desc:'+1% to +5% Shotgun attack speed',
    apply: p => { p.weaponRateBonus[1] += rollInt(1, 5) / 100; },
  },
  {
    id:'rl_dmg', rarity:'common', icon:'🚀',
    name:'Rocket Payload', desc:'+1% to +5% Rocket damage',
    apply: p => { p.weaponDamageMult[2] *= 1 + rollInt(1, 5) / 100; },
  },
  {
    id:'rl_rate', rarity:'common', icon:'⏱️',
    name:'Rocket Reload Drill', desc:'+1% to +3% Rocket attack speed',
    apply: p => { p.weaponRateBonus[2] += rollInt(1, 3) / 100; },
  },

  // Character rares
  {
    id:'rare_dodge', rarity:'rare', icon:'💨',
    name:'Evasive Instinct', desc:'+5% dodge chance',
    apply: p => { p.dodgeChance += 0.05; },
  },
  {
    id:'rare_shield_cd', rarity:'rare', icon:'🛡️',
    name:'Shield Capacitor', desc:'Reduce shield cooldown',
    apply: p => { p.shieldCooldown = Math.max(5, p.shieldCooldown - 2); },
  },
  {
    id:'rare_coin_kill', rarity:'rare', icon:'🪙',
    name:'Bounty Hunter', desc:'+1 coin per enemy killed',
    apply: p => { p.coinBonusPerKill += 1; },
  },
  {
    id:'rare_xp_kill', rarity:'rare', icon:'📘',
    name:'Battle Scholar', desc:'+1 XP per enemy killed',
    apply: p => { p.xpBonusPerKill += 1; },
  },
  {
    id:'rare_all_dmg', rarity:'rare', icon:'🔥',
    name:'Powder Boost', desc:'+1% to +5% all weapon damage',
    apply: p => { p.globalWeaponDamageMult *= 1 + rollInt(1, 5) / 100; },
  },
  {
    id:'rare_slow_move', rarity:'rare', icon:'❄️',
    name:'Cryo Ammo', desc:'Bullets slow enemies down',
    apply: p => { p.onHitSlowMove = Math.max(p.onHitSlowMove, 0.78); },
  },
  {
    id:'rare_slow_atk', rarity:'rare', icon:'🕒',
    name:'Disruptor Ammo', desc:'Bullets slow enemy attack speed',
    apply: p => { p.onHitSlowAttack = Math.max(p.onHitSlowAttack, 0.72); },
  },
  {
    id:'rare_burn', rarity:'rare', icon:'🔥',
    name:'Incendiary Rounds', desc:'Bullets can burn enemies (1 dmg/s)',
    apply: p => {
      p.onHitBurnChance = Math.max(p.onHitBurnChance, 0.2);
      p.onHitBurnDps = Math.max(p.onHitBurnDps, 1);
    },
  },
  {
    id:'rare_proj_speed', rarity:'rare', icon:'🚀',
    name:'Overpressure Rounds', desc:'Increase projectile speed',
    apply: p => { p.bulletSpeed *= 1.18; },
  },

  // Character / weapon legendaries
  {
    id:'leg_revive', rarity:'legendary', icon:'🪽',
    name:'Last Stand', desc:'1 free revive when HP reaches 0',
    isAvailable: () => !hasBuff('leg_revive'),
    apply: p => { p.reviveCharges += 1; },
  },
  {
    id:'leg_guard', rarity:'legendary', icon:'✨',
    name:'Aegis Pulse', desc:'1 free invulnerability hit every 30 sec',
    isAvailable: () => !hasBuff('leg_guard'),
    apply: p => {
      p.freeGuardInterval = 30;
      p.freeGuardReady = true;
      p.freeGuardCooldown = 0;
    },
  },
  {
    id:'leg_lifesteal', rarity:'legendary', icon:'🩸',
    name:'Lifesteal', desc:'Heal from damage dealt',
    isAvailable: () => !hasBuff('leg_lifesteal'),
    apply: p => { p.lifesteal = 0.06; },
  },
  {
    id:'leg_bounce', rarity:'legendary', icon:'↩️',
    name:'Ricochet', desc:'Bullets bounce off walls once',
    isAvailable: () => !hasBuff('leg_bounce'),
    apply: p => { p.bounceOnce = true; },
  },
  {
    id:'leg_pierce_all', rarity:'legendary', icon:'🗡️',
    name:'Phase Rounds', desc:'Bullets go through enemies',
    isAvailable: () => !hasBuff('leg_pierce_all'),
    apply: p => { p.pierceAll = true; },
  },
  {
    id:'leg_all_dmg', rarity:'legendary', icon:'💣',
    name:'Overkill Core', desc:'+10% weapon damage',
    apply: p => { p.globalWeaponDamageMult *= 1.10; },
  },
  {
    id:'leg_all_speed', rarity:'legendary', icon:'⚡',
    name:'Time Dilation', desc:'+15% attack speed',
    apply: p => { p.globalAttackSpeedBonus += 0.15; },
  },
];

function pickBuffChoices() {
  const player = state.player;
  const milestone = player.level % 5 === 0;
  const eligible = BUFFS_DEF.filter((b) => {
    if (typeof b.isAvailable === 'function' && !b.isAvailable()) return false;
    if (milestone) return b.rarity !== 'common';
    return b.rarity === 'common';
  });

  if (!milestone) {
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  // Milestone levels: weighted rarity selection (mostly Rare, occasional Legendary).
  const pool = [...eligible];
  const picks = [];
  const target = Math.min(3, pool.length);

  while (picks.length < target && pool.length > 0) {
    const rares = pool.filter(b => b.rarity === 'rare');
    const legendaries = pool.filter(b => b.rarity === 'legendary');

    let desiredRarity = Math.random() < 0.8 ? 'rare' : 'legendary';
    if (desiredRarity === 'rare' && rares.length === 0) desiredRarity = 'legendary';
    if (desiredRarity === 'legendary' && legendaries.length === 0) desiredRarity = 'rare';

    const candidates = desiredRarity === 'rare' ? rares : legendaries;
    if (candidates.length === 0) break;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    picks.push(chosen);
    const idx = pool.findIndex(b => b.id === chosen.id);
    if (idx >= 0) pool.splice(idx, 1);
  }

  return picks;
}

function triggerLevelUp() {
  state.paused = true;
  state.player.level++;
  document.getElementById('level-text').textContent = `Lv ${state.player.level}`;

  const choices = pickBuffChoices();
  const container = document.getElementById('buff-choices');
  container.innerHTML = '';
  document.getElementById('screen-levelup').classList.remove('hidden');

  choices.forEach(buff => {
    const card = document.createElement('div');
    card.className = `buff-card buff-${buff.rarity}`;
    card.innerHTML = `<div class="buff-icon">${buff.icon}</div>
      <div class="buff-name">${buff.name}</div>
      <div class="buff-rarity">${buff.rarity.toUpperCase()}</div>
      <div class="buff-desc">${buff.desc}</div>`;
    card.addEventListener('click', () => {
      buff.apply(state.player);
      state.player.appliedBuffs.push(buff.id);
      document.getElementById('screen-levelup').classList.add('hidden');
      state.paused = false;
    });
    container.appendChild(card);
  });
}

function gainXp(amount) {
  const bonus = state.player.xpBonusPerKill || 0;
  state.player.xp += (amount + bonus) * (state.player.xpMultiplier || 1.0);
  while (state.player.xp >= state.player.xpNext) {
    state.player.xp     -= state.player.xpNext;
    state.player.xpNext  = Math.floor(state.player.xpNext * 1.35);
    triggerLevelUp();
    return; // pause until buff is chosen; next level-up triggers after
  }
}
