// Every sound in GLOOMGARDEN is synthesised with WebAudio — no audio files.
// Short oscillator-and-noise blips for actions, a slow detuned pad for the
// night air. The context is created lazily on the first user gesture, as
// browsers require, and M toggles a master mute.

export class SoundGarden {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.padNodes = null;
    this.pickupStep = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.ctx = new AudioCtor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startPad();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone({ freq = 440, end = null, type = 'sine', dur = 0.15, vol = 0.2, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.12, vol = 0.15, delay = 0, low = 400, high = 2400 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(high, t0);
    filter.frequency.exponentialRampToValueAtTime(low, t0 + dur);
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t0);
  }

  startPad() {
    // Two slow detuned triangles under a lowpass: the garden breathing.
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const oscA = this.ctx.createOscillator();
    oscA.type = 'triangle';
    oscA.frequency.value = 110;
    const oscB = this.ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = 110 * 1.5 + 0.7;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain).connect(filter.frequency);
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain).connect(this.master);
    oscA.start();
    oscB.start();
    lfo.start();
    this.padNodes = { oscA, oscB, lfo };
  }

  dart() {
    this.tone({ freq: 880, end: 320, type: 'square', dur: 0.07, vol: 0.05 });
  }

  hit() {
    this.noise({ dur: 0.05, vol: 0.06, high: 3000, low: 900 });
  }

  pop() {
    this.tone({ freq: 240, end: 60, type: 'sine', dur: 0.14, vol: 0.16 });
    this.noise({ dur: 0.08, vol: 0.08, high: 1600, low: 300 });
  }

  pickup() {
    // Pitch climbs as motes chain, so a good vacuum run sings.
    this.pickupStep = Math.min(this.pickupStep + 1, 12);
    const base = 620 * Math.pow(1.059, this.pickupStep);
    this.tone({ freq: base, end: base * 1.5, type: 'sine', dur: 0.09, vol: 0.07 });
  }

  pickupIdle() {
    this.pickupStep = 0;
  }

  nova() {
    this.noise({ dur: 0.28, vol: 0.14, high: 2600, low: 240 });
    this.tone({ freq: 180, end: 520, type: 'sawtooth', dur: 0.22, vol: 0.05 });
  }

  lance() {
    this.tone({ freq: 1400, end: 180, type: 'sawtooth', dur: 0.3, vol: 0.12 });
    this.noise({ dur: 0.3, vol: 0.1, high: 4000, low: 500 });
  }

  hurt() {
    this.tone({ freq: 160, end: 55, type: 'sawtooth', dur: 0.22, vol: 0.22 });
    this.noise({ dur: 0.16, vol: 0.14, high: 900, low: 150 });
  }

  levelUp() {
    [523, 659, 784, 1047].forEach((freq, i) =>
      this.tone({ freq, type: 'triangle', dur: 0.22, vol: 0.14, delay: i * 0.07 }),
    );
  }

  choose() {
    this.tone({ freq: 740, end: 990, type: 'triangle', dur: 0.12, vol: 0.12 });
  }

  victory() {
    [392, 523, 659, 784, 1047, 1319].forEach((freq, i) =>
      this.tone({ freq, type: 'triangle', dur: 0.34, vol: 0.13, delay: i * 0.11 }),
    );
  }

  defeat() {
    [330, 262, 196, 131].forEach((freq, i) =>
      this.tone({ freq, type: 'triangle', dur: 0.4, vol: 0.14, delay: i * 0.16 }),
    );
  }
}
