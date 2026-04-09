const BUFFS_DEF = [
  { id:'speed',        icon:'👟', name:'Fleet Foot',    desc:'+25% move speed',    apply: p => { p.speed *= 1.25; } },
  { id:'damage',       icon:'🔥', name:'Hot Lead',      desc:'+30% bullet damage', apply: p => { p.bulletDamage *= 1.30; } },
  { id:'firerate',     icon:'⚡', name:'Trigger Happy', desc:'+30% fire rate',     apply: p => { p.fireRate *= 0.70; } },
  { id:'health',       icon:'❤️', name:'Iron Skin',     desc:'+40 max HP',         apply: p => { p.maxHp += 40; p.hp = Math.min(p.hp + 40, p.maxHp); } },
  { id:'pierce',       icon:'🗡️', name:'Piercing Shot', desc:'Bullets pierce +1',  apply: p => { p.pierce++; } },
  { id:'multishot',    icon:'💥', name:'Spread Shot',   desc:'+1 extra bullet',    apply: p => { p.extraBullets++; } },
  { id:'regen',        icon:'💊', name:'Medkit',        desc:'Regen 1 HP/sec',     apply: p => { p.regen += 1; } },
  { id:'range',        icon:'🎯', name:'Long Barrel',   desc:'+40% bullet range',  apply: p => { p.bulletRange *= 1.40; } },
  { id:'bullet_speed', icon:'🚀', name:'Hypervelocity', desc:'+30% bullet speed',  apply: p => { p.bulletSpeed *= 1.30; } },
];

function triggerLevelUp() {
  state.paused = true;
  state.player.level++;
  document.getElementById('level-text').textContent = `Lv ${state.player.level}`;

  const shuffled  = [...BUFFS_DEF].sort(() => Math.random() - 0.5).slice(0, 3);
  const container = document.getElementById('buff-choices');
  container.innerHTML = '';
  document.getElementById('screen-levelup').classList.remove('hidden');

  shuffled.forEach(buff => {
    const card = document.createElement('div');
    card.className = 'buff-card';
    card.innerHTML = `<div class="buff-icon">${buff.icon}</div>
      <div class="buff-name">${buff.name}</div>
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
  state.player.xp += amount;
  while (state.player.xp >= state.player.xpNext) {
    state.player.xp     -= state.player.xpNext;
    state.player.xpNext  = Math.floor(state.player.xpNext * 1.35);
    triggerLevelUp();
    return; // pause until buff is chosen; next level-up triggers after
  }
}
