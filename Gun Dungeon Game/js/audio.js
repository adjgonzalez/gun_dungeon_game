// Lightweight synth audio: no external assets required.
const gameAudio = {
  ctx: null,
  master: null,
  sfx: null,
  music: null,
  musicTimer: null,
  musicStep: 0,
};

function ensureAudioStarted() {
  if (!gameAudio.ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    gameAudio.ctx = new AudioCtx();
    gameAudio.master = gameAudio.ctx.createGain();
    gameAudio.sfx = gameAudio.ctx.createGain();
    gameAudio.music = gameAudio.ctx.createGain();

    gameAudio.master.gain.value = 0.6;
    gameAudio.sfx.gain.value = 0.9;
    gameAudio.music.gain.value = 0.23;

    gameAudio.sfx.connect(gameAudio.master);
    gameAudio.music.connect(gameAudio.master);
    gameAudio.master.connect(gameAudio.ctx.destination);
  }

  if (gameAudio.ctx.state === 'suspended') {
    gameAudio.ctx.resume();
  }

  return true;
}

function playTone(freq, duration, opts = {}) {
  if (!ensureAudioStarted()) return;
  const ctx = gameAudio.ctx;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = opts.type || 'square';
  osc.frequency.value = freq;
  if (opts.detune) osc.detune.value = opts.detune;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(opts.volume || 0.09, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(opts.music ? gameAudio.music : gameAudio.sfx);

  osc.start(now);
  osc.stop(now + duration + 0.03);
}

function playNoiseBurst(duration, volume) {
  if (!ensureAudioStarted()) return;
  const ctx = gameAudio.ctx;
  const now = ctx.currentTime;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(gain);
  gain.connect(gameAudio.sfx);
  source.start(now);
}

function audioPlayShoot(weaponIdx) {
  if (weaponIdx === 2) {
    playTone(90, 0.16, { type: 'sawtooth', volume: 0.13 });
    playNoiseBurst(0.08, 0.07);
    return;
  }
  if (weaponIdx === 1) {
    playTone(140, 0.08, { type: 'square', volume: 0.11 });
    playNoiseBurst(0.05, 0.05);
    return;
  }
  playTone(280, 0.05, { type: 'triangle', volume: 0.07 });
}

function audioPlayEnemyHit() {
  playTone(220, 0.04, { type: 'triangle', volume: 0.05, detune: -200 });
}

function audioPlayEnemyDown() {
  playTone(220, 0.07, { type: 'square', volume: 0.08 });
  playTone(164, 0.1, { type: 'square', volume: 0.07 });
}

function audioPlayPlayerHit() {
  playTone(120, 0.09, { type: 'sawtooth', volume: 0.1 });
  playNoiseBurst(0.05, 0.04);
}

function audioPlayShieldHit() {
  playTone(620, 0.05, { type: 'triangle', volume: 0.06 });
}

function audioPlayShieldBreak() {
  playTone(420, 0.06, { type: 'triangle', volume: 0.08 });
  playTone(260, 0.1, { type: 'triangle', volume: 0.08 });
}

function audioPlayUiConfirm() {
  playTone(440, 0.06, { type: 'triangle', volume: 0.06 });
  playTone(660, 0.06, { type: 'triangle', volume: 0.05 });
}

function audioPlayGameOver() {
  playTone(196, 0.2, { type: 'sine', volume: 0.08 });
  playTone(146, 0.28, { type: 'sine', volume: 0.08 });
}

function audioPlayWin() {
  playTone(392, 0.11, { type: 'triangle', volume: 0.09 });
  playTone(523, 0.12, { type: 'triangle', volume: 0.09 });
  playTone(659, 0.14, { type: 'triangle', volume: 0.08 });
}

function audioStartMusic() {
  if (!ensureAudioStarted()) return;
  if (gameAudio.musicTimer) return;

  // Fast 8th-note rock groove with power-chord riff and simple kick/snare accents.
  const riff = [110, 110, 147, 110, 165, 147, 123, 98];
  const bass = [55, 55, 73, 55, 82, 73, 61, 49];
  const kickPattern = [1, 0, 1, 0, 1, 0, 1, 0];
  const snarePattern = [0, 0, 1, 0, 0, 0, 1, 0];

  gameAudio.musicStep = 0;
  gameAudio.musicTimer = setInterval(() => {
    const step = gameAudio.musicStep++;
    const idx = step % riff.length;
    const root = riff[idx];
    const b = bass[step % bass.length];

    // Power chord (root + fifth) for guitar-like drive.
    playTone(root, 0.16, { type: 'sawtooth', volume: 0.035, music: true });
    playTone(root * 1.5, 0.14, { type: 'square', volume: 0.022, music: true });
    playTone(b, 0.2, { type: 'triangle', volume: 0.03, music: true });

    if (kickPattern[idx]) {
      playNoiseBurst(0.04, 0.03);
      playTone(60, 0.05, { type: 'sine', volume: 0.018, music: true });
    }
    if (snarePattern[idx]) {
      playNoiseBurst(0.055, 0.045);
    }
  }, 170);
}

function audioStopMusic() {
  if (gameAudio.musicTimer) {
    clearInterval(gameAudio.musicTimer);
    gameAudio.musicTimer = null;
  }
}
