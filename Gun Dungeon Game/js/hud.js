function updateHUD() {
  const { player } = state;
  document.getElementById('health-fill').style.width =
    clamp(player.hp / player.maxHp * 100, 0, 100) + '%';
  document.getElementById('health-text').textContent =
    `${Math.ceil(player.hp)}/${player.maxHp}`;
  document.getElementById('xp-fill').style.width =
    clamp(player.xp / player.xpNext * 100, 0, 100) + '%';
  const coinEl = document.getElementById('run-coins');
  if (coinEl) coinEl.textContent = `🪙 ${state.runCoins || 0}`;
}
