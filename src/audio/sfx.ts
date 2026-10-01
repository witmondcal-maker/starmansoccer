/**
 * Short SNES-style effects made with Web Audio. No files.
 * Every public function swallows errors: a locked or missing context stays silent
 * and must never throw into the match update.
 */

type Kind = 'menu' | 'whistle' | 'pass' | 'shot' | 'bounce' | 'goal' | 'card' | 'sendOff';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let pending: (() => void) | null = null;
let noise: AudioBuffer | null = null;
let nextBounce = 0;
let lastKind: Kind | '' = '';
let lastShotHz = 0;
const played: Record<Kind, number> = {
  menu: 0,
  whistle: 0,
  pass: 0,
  shot: 0,
  bounce: 0,
  goal: 0,
  card: 0,
  sendOff: 0,
};
const voices = new Map<string, () => void>();

function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    /* Sound never stops the match. */
  }
}

function audioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const legacy = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = audioCtor();
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  return ctx;
}

function dropVoice(name: string): void {
  const stop = voices.get(name);
  voices.delete(name);
  if (!stop) return;
  try {
    stop();
  } catch {
    /* Already finished. */
  }
}

/** First keydown unlocks audio. Later calls are free. */
export function installAudioUnlock(): void {
  const onKey = () => {
    window.removeEventListener('keydown', onKey, true);
    unlock();
  };
  window.addEventListener('keydown', onKey, true);
}

export function unlock(): void {
  safe(() => {
    const c = ensure();
    if (!c || c.state !== 'suspended') return;
    void c.resume().then(() => {
      if (!ctx || ctx.state !== 'running' || muted || !pending) {
        pending = null;
        return;
      }
      const run = pending;
      pending = null;
      safe(run);
    }).catch(() => {
      pending = null;
    });
  });
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  if (muted) {
    pending = null;
    for (const name of [...voices.keys()]) dropVoice(name);
  }
  return muted;
}

function whenRunning(fn: () => void): void {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  if (c.state === 'running') {
    fn();
    return;
  }
  pending = fn;
  if (c.state === 'suspended') {
    void c.resume().then(() => {
      if (!ctx || ctx.state !== 'running' || muted || !pending) {
        pending = null;
        return;
      }
      const run = pending;
      pending = null;
      safe(run);
    }).catch(() => {
      pending = null;
    });
  }
}

function tone(
  voice: string,
  notes: { freq: number; dur: number; at: number; type?: OscillatorType; peak?: number; slide?: number }[],
): void {
  const c = ctx;
  if (!c || !master) return;
  dropVoice(voice);
  const started: OscillatorNode[] = [];
  const now = c.currentTime;
  for (const note of notes) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const t = now + note.at;
    const dur = Math.max(0.05, note.dur);
    osc.type = note.type ?? 'square';
    osc.frequency.setValueAtTime(Math.max(40, note.freq), t);
    if (note.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, note.slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(note.peak ?? 0.08, t + Math.min(0.02, dur * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    started.push(osc);
  }
  voices.set(voice, () => {
    for (const osc of started) osc.stop();
  });
}

function mark(kind: Kind): void {
  lastKind = kind;
  played[kind] += 1;
}

export function menu(): void {
  safe(() => whenRunning(() => {
    mark('menu');
    tone('menu', [
      { freq: 660, dur: 0.07, at: 0, peak: 0.07 },
      { freq: 880, dur: 0.1, at: 0.08, peak: 0.07 },
    ]);
  }));
}

/** Kickoff and foul. Full time holds the whistle a little longer. */
export function whistle(long = false): void {
  safe(() => whenRunning(() => {
    mark('whistle');
    tone('whistle', long
      ? [
          { freq: 1480, dur: 0.22, at: 0, type: 'sine', peak: 0.1, slide: 1760 },
          { freq: 1320, dur: 0.2, at: 0.26, type: 'sine', peak: 0.09 },
          { freq: 1760, dur: 0.34, at: 0.48, type: 'sine', peak: 0.1, slide: 1540 },
        ]
      : [
          { freq: 1560, dur: 0.28, at: 0, type: 'sine', peak: 0.1, slide: 1880 },
        ]);
  }));
}

export function pass(): void {
  safe(() => whenRunning(() => {
    mark('pass');
    tone('pass', [{ freq: 280, dur: 0.07, at: 0, peak: 0.06, slide: 180 }]);
  }));
}

/** Replaces any shot still playing. Pitch rises with the power bar. */
export function shot(power: number): void {
  safe(() => {
    const p = Math.min(1, Math.max(0, power));
    const freq = 170 + p * 520;
    lastShotHz = freq;
    whenRunning(() => {
      mark('shot');
      tone('shot', [{ freq, dur: 0.12, at: 0, peak: 0.08, slide: freq * 0.72 }]);
    });
  });
}

export function bounce(): void {
  safe(() => whenRunning(() => {
    const c = ctx;
    if (!c || !master) return;
    if (c.currentTime < nextBounce) return;
    nextBounce = c.currentTime + 0.09;
    mark('bounce');
    dropVoice('bounce');
    if (!noise || noise.sampleRate !== c.sampleRate) {
      const length = Math.max(1, Math.floor(c.sampleRate * 0.08));
      noise = c.createBuffer(1, length, c.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();
    src.buffer = noise;
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const t = c.currentTime;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + 0.09);
    voices.set('bounce', () => src.stop());
  }));
}

export function goal(): void {
  safe(() => whenRunning(() => {
    mark('goal');
    const notes = [523, 659, 784, 1046];
    tone('goal', notes.map((freq, i) => ({ freq, dur: 0.2, at: i * 0.16, peak: 0.07 })));
  }));
}

export function yellowCard(): void {
  safe(() => whenRunning(() => {
    mark('card');
    tone('card', [
      { freq: 740, dur: 0.1, at: 0, peak: 0.07 },
      { freq: 520, dur: 0.16, at: 0.12, peak: 0.07 },
    ]);
  }));
}

/** The card sting, then a short low tone. */
export function sendOff(): void {
  safe(() => whenRunning(() => {
    mark('sendOff');
    tone('card', [
      { freq: 740, dur: 0.1, at: 0, peak: 0.07 },
      { freq: 520, dur: 0.14, at: 0.12, peak: 0.07 },
      { freq: 110, dur: 0.28, at: 0.3, type: 'sine', peak: 0.1 },
    ]);
  }));
}

export function audioDebug(): { state: string; muted: boolean; last: string; shotHz: number; played: Record<Kind, number> } {
  return {
    state: ctx ? ctx.state : 'none',
    muted,
    last: lastKind,
    shotHz: lastShotHz,
    played: { ...played },
  };
}
