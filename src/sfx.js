// Tiny WebAudio chiptune kit: effects + a looping spooky arpeggio. No audio files.
let ctx, masterGain, sfxOn = true, musicOn = true, isMuted = false, timer = null, step = 0, nextT = 0, musicActive = false;

export const resumeAudio = () => ac();

export const configure = ({ sfx = true, music = true, muted = false } = {}) => {
  const prevMuted = isMuted;
  const prevMusicOn = musicOn;

  isMuted = Boolean(muted);
  sfxOn = Boolean(sfx);
  musicOn = Boolean(music);

  if (ctx && masterGain) {
    masterGain.gain.setValueAtTime(isMuted ? 0 : 1, ctx.currentTime);
  }

  const effectiveMusic = !isMuted && musicOn;
  const wasEffectiveMusic = !prevMuted && prevMusicOn;

  if (effectiveMusic !== wasEffectiveMusic) {
    if (effectiveMusic) {
      if (musicActive) startMusic();
    } else {
      stopMusic();
    }
  }
};

const ac = () => {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 1, ctx.currentTime);
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

function tone(f, d = .08, type = 'square', vol = .04, slide = 0, when = 0, force = false) {
  if (isMuted || (!sfxOn && !force)) return;
  const c = ac();
  if (!c || !masterGain) return;
  const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(masterGain);
  o.start(t);
  o.stop(t + d + .02);
}

function noise(d = .3, vol = .08) {
  if (isMuted || !sfxOn) return;
  const c = ac();
  if (!c || !masterGain) return;
  const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = b;
  g.gain.value = vol;
  s.connect(g).connect(masterGain);
  s.start();
}

export const sfx = {
  click: () => tone(520, .05, 'square', .03),
  good: () => { tone(660, .08); tone(990, .12, 'square', .04, 0, .08); },
  bad: () => tone(200, .3, 'sawtooth', .05, -120),
  flap: () => tone(340, .13, 'square', .035, 420),
  empty: () => tone(120, .08, 'square', .03),
  gate: () => tone(880, .06, 'triangle', .04),
  coin: () => { tone(988, .07, 'square', .04); tone(1319, .14, 'square', .04, 0, .07); },
  crash: () => { noise(.35, .09); tone(220, .4, 'sawtooth', .06, -170); },
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .18, 'square', .045, 0, i * .11)),
};

const BASS = [110, 110, 87.3, 98], ARP = [220, 261.6, 329.6, 440, 329.6, 261.6, 392, 329.6];

function sched() {
  const c = ctx;
  if (!c || !musicOn || isMuted) return;
  while (nextT < c.currentTime + .25) {
    const t = nextT - c.currentTime, bar = Math.floor(step / 8) % 4;
    if (step % 2 === 0) tone(BASS[bar], .22, 'triangle', .05, 0, Math.max(0, t), true);
    tone(ARP[step % 8] * (bar === 2 ? .8 : 1), .12, 'square', .012, 0, Math.max(0, t), true);
    step++;
    nextT += .19;
  }
}

export function startMusic() {
  musicActive = true;
  if (!musicOn || isMuted || timer) return;
  const c = ac();
  if (!c) return;
  nextT = c.currentTime + .05;
  timer = setInterval(sched, 90);
}

export function stopMusic() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export const vibrate = p => {
  try {
    if (!isMuted) navigator.vibrate?.(p);
  } catch {}
};
