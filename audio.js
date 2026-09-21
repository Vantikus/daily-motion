(() => {
  let context = null;
  let mediaPrimed = false;

  const setPlaybackSession = () => {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {}
  };

  const writeString = (view, offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  // Виброотклик под разные события тренировки
  const vibratePattern = {
    tick: 40,
    warning10: 60,
    warning5: [50, 40, 50],
    endingTick: 50,
    start: [120],
    pause: [60, 40, 60],
    resume: [80],
    ready: 70,
    finish: [100, 60, 150],
    complete: [200, 100, 400],
    confirm: 50
  };

  const triggerVibrate = kind => {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      const pattern = vibratePattern[kind];
      if (pattern) navigator.vibrate(pattern);
    } catch {}
  };

  // Генератор 16-битных PCM WAV на лету с антиклиппингом
  const makeWav = parts => {
    const sampleRate = 22050;
    const samples = [];

    parts.forEach(part => {
      const duration = Math.max(0.03, Number(part.duration) || 0.1);
      const gap = Math.max(0, Number(part.gap) || 0);
      const frequency = Math.max(80, Number(part.frequency) || 392);
      const volume = Math.min(0.2, Math.max(0.005, Number(part.volume) || 0.05));
      const attackSeconds = Math.max(0.008, Number(part.attack) || 0.018);
      const releaseSeconds = Math.max(0.035, Math.min(duration * 0.95, Number(part.release) || 0.09));
      const harmonics = Array.isArray(part.harmonics) ? part.harmonics : null;

      const toneSamples = Math.max(1, Math.floor(sampleRate * duration));
      const gapSamples = Math.floor(sampleRate * gap);
      const attackSamples = Math.max(1, Math.floor(sampleRate * attackSeconds));
      const releaseSamples = Math.max(1, Math.floor(sampleRate * releaseSeconds));

      for (let i = 0; i < toneSamples; i++) {
        const attackPhase = Math.min(1, i / attackSamples);
        const releasePhase = Math.min(1, (toneSamples - i) / releaseSamples);
        const attack = Math.sin(attackPhase * Math.PI * 0.5) ** 2;
        const release = Math.sin(releasePhase * Math.PI * 0.5) ** 2;
        const envelope = Math.max(0, Math.min(attack, release));
        const t = i / sampleRate;

        let val = 0;
        if (harmonics) {
          // Обертоны для эффекта колокола/гонга
          harmonics.forEach(h => {
            const hDecay = Math.exp(-(h.decay || 2.0) * t);
            val += Math.sin(2 * Math.PI * (frequency * h.mult) * t) * (h.weight || 0.3) * hDecay;
          });
          val = Math.tanh(val); // Мягкий лимитер от перегруза
        } else {
          val = Math.sin(2 * Math.PI * frequency * t);
        }

        samples.push(val * volume * envelope);
      }

      for (let i = 0; i < gapSamples; i++) samples.push(0);
    });

    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    samples.forEach((sample, index) => {
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(44 + index * 2, clamped < 0 ? clamped * 32768 : clamped * 32767, true);
    });

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  };

  // Набор откалиброванных звуковых сигналов
  const sources = {
    prime: makeWav([{ frequency: 330, duration: 0.03, volume: 0.005, release: 0.025 }]),
    tick: makeWav([{ frequency: 440, duration: 0.07, volume: 0.045, attack: 0.01, release: 0.05 }]),
    warning10: makeWav([{ frequency: 330, duration: 0.12, volume: 0.045, attack: 0.015, release: 0.09 }]),
    warning5: makeWav([
      { frequency: 392, duration: 0.08, volume: 0.048, gap: 0.03, attack: 0.015, release: 0.06 },
      { frequency: 523.25, duration: 0.14, volume: 0.055, attack: 0.018, release: 0.10 }
    ]),
    endingTick: makeWav([{ frequency: 440, duration: 0.06, volume: 0.05, attack: 0.01, release: 0.045 }]),
    // Четкий двухтональный старт
    start: makeWav([
      { frequency: 587.33, duration: 0.09, volume: 0.055, gap: 0.03, attack: 0.015, release: 0.065 },
      { frequency: 880, duration: 0.18, volume: 0.07, attack: 0.018, release: 0.14 }
    ]),
    pause: makeWav([
      { frequency: 440, duration: 0.08, volume: 0.045, gap: 0.03, attack: 0.015, release: 0.055 },
      { frequency: 330, duration: 0.12, volume: 0.04, attack: 0.018, release: 0.09 }
    ]),
    resume: makeWav([
      { frequency: 392, duration: 0.08, volume: 0.045, gap: 0.03, attack: 0.015, release: 0.055 },
      { frequency: 523.25, duration: 0.13, volume: 0.055, attack: 0.018, release: 0.09 }
    ]),
    ready: makeWav([{ frequency: 523.25, duration: 0.14, volume: 0.055, attack: 0.018, release: 0.1 }]),
    // Завершение раунда / смена упражнения
    finish: makeWav([
      { frequency: 523.25, duration: 0.09, volume: 0.05, gap: 0.035, attack: 0.015, release: 0.065 },
      { frequency: 659.25, duration: 0.20, volume: 0.065, attack: 0.018, release: 0.15 }
    ]),
    // Финальный гонг всей тренировки с обертонами и глубоким затуханием
    complete: makeWav([
      {
        frequency: 220, // Базовая нота A3
        duration: 2.2,
        volume: 0.08,
        attack: 0.015,
        release: 1.8,
        harmonics: [
          { mult: 1.0, weight: 0.5, decay: 1.2 },
          { mult: 1.5, weight: 0.25, decay: 1.8 },
          { mult: 2.1, weight: 0.15, decay: 2.4 },
          { mult: 3.0, weight: 0.1, decay: 3.0 }
        ]
      }
    ]),
    confirm: makeWav([{ frequency: 523.25, duration: 0.11, volume: 0.045, attack: 0.015, release: 0.08 }])
  };

  const players = Object.fromEntries(
    Object.entries(sources)
      .filter(([name]) => name !== 'prime')
      .map(([name, src]) => [name, new Audio(src)])
  );

  Object.values(players).forEach(player => {
    player.preload = 'auto';
    player.volume = 0.7;
  });

  const primePlayer = new Audio(sources.prime);
  primePlayer.preload = 'auto';
  primePlayer.volume = 0.01;

  const getContext = () => {
    try {
      if (!context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        context = new AudioContextClass();
      }
      return context;
    } catch {
      return null;
    }
  };

  const unlock = async () => {
    setPlaybackSession();

    let mediaReady = mediaPrimed;
    if (!mediaPrimed) {
      try {
        primePlayer.currentTime = 0;
        await primePlayer.play();
        primePlayer.pause();
        primePlayer.currentTime = 0;
        mediaPrimed = true;
        mediaReady = true;
      } catch {}
    }

    let webReady = false;
    const ctx = getContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          const resumed = ctx.resume();
          await Promise.race([resumed, new Promise(resolve => setTimeout(resolve, 250))]);
        }
        webReady = ctx.state === 'running';
      } catch {}
    }

    return mediaReady || webReady;
  };

  const play = kind => {
    setPlaybackSession();
    triggerVibrate(kind);

    const player = players[kind];
    if (!player) return;

    try {
      player.pause();
      player.currentTime = 0;
      const result = player.play();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } catch {}
  };

  const api = { unlock };
  Object.keys(players).forEach(kind => {
    api[kind] = () => play(kind);
  });

  api.test = async () => {
    const ready = await unlock();
    if (!ready) return false;
    play('confirm');
    return true;
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setPlaybackSession();
  });

  setPlaybackSession();
  window.DailyMotionAudio = api;
})();
