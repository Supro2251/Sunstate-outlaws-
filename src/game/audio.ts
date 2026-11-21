import { RadioStationId, WeaponId } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private radioGain: GainNode | null = null;
  private rockDriveNode: WaveShaperNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenFilter: BiquadFilterNode | null = null;
  private sirenGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private screechSource: AudioBufferSourceNode | null = null;
  private screechGain: GainNode | null = null;

  private muted = false;
  private radioStation: RadioStationId = 'off';
  private radioInterval: number | null = null;
  private radioStep = 0;

  private makeDistortionCurve(amount = 42): Float32Array<ArrayBuffer> {
    const samples = 1024;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  public unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.48;
      this.masterGain.connect(this.ctx.destination);

      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = this.radioStation === 'off' ? 0 : 0.62;
      this.radioGain.connect(this.masterGain);

      this.rockDriveNode = this.ctx.createWaveShaper();
      this.rockDriveNode.curve = this.makeDistortionCurve(36);
      this.rockDriveNode.oversample = '2x';
      const rockTone = this.ctx.createBiquadFilter();
      rockTone.type = 'lowpass';
      rockTone.frequency.value = 2600;
      this.rockDriveNode.connect(rockTone);
      rockTone.connect(this.radioGain);

      // Noise buffer for shots, tire scrub, footsteps, radio percussion, and crashes
      const length = this.ctx.sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      // Dual-oscillator warm low-passed engine sound (strictly 0 gain unless driving — zero hum/whistle!)
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 52;
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.value = 26;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 160;
      this.engineFilter.Q.value = 0.7;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();
      this.engineSubOsc.start();

      // Low-passed police cruiser siren (zero gain when no cop nearby)
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 520;
      this.sirenFilter = this.ctx.createBiquadFilter();
      this.sirenFilter.type = 'lowpass';
      this.sirenFilter.frequency.value = 880;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenFilter);
      this.sirenFilter.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);
      this.sirenOsc.start();

      // Warm tire scrub (wide low-Q filter to avoid resonant whistling completely!)
      this.screechSource = this.ctx.createBufferSource();
      this.screechSource.buffer = this.noiseBuffer;
      this.screechSource.loop = true;
      const screechFilter = this.ctx.createBiquadFilter();
      screechFilter.type = 'bandpass';
      screechFilter.frequency.value = 720;
      screechFilter.Q.value = 1.15;
      const screechLowpass = this.ctx.createBiquadFilter();
      screechLowpass.type = 'lowpass';
      screechLowpass.frequency.value = 1350;
      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.value = 0;
      this.screechSource.connect(screechFilter);
      screechFilter.connect(screechLowpass);
      screechLowpass.connect(this.screechGain);
      this.screechGain.connect(this.masterGain);
      this.screechSource.start();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    if (this.radioStation !== 'off' && this.radioInterval === null) {
      this.startRadioSequencer(this.radioStation);
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.48, now, 0.03);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateVehicleAudio(
    inVehicle: boolean,
    speedNorm: number,
    gear: number,
    rpm: number,
    throttle: number,
    drifting: boolean,
    sirenStrength: number,
    elapsed: number,
  ) {
    if (
      !this.ctx ||
      !this.engineGain ||
      !this.engineOsc ||
      !this.engineSubOsc ||
      !this.engineFilter ||
      !this.screechGain ||
      !this.sirenGain ||
      !this.sirenOsc
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    const activeEngine = inVehicle && !this.muted && (speedNorm > 0.025 || throttle > 0.05);
    if (activeEngine) {
      // Dynamic multi-gear engine pitch: climbs with RPM within each gear, drops cleanly on upshift!
      const clampedRpm = Math.max(0.18, Math.min(1.0, rpm));
      const basePitch = 36 + clampedRpm * 92 + (gear - 1) * 4.5;
      const subPitch = basePitch * 0.5;
      const loadFactor = throttle > 0.1 ? 1.0 : 0.72;
      const filterCutoff = 115 + clampedRpm * 245 * loadFactor;
      const targetGain = Math.min(0.09, (0.02 + clampedRpm * 0.052) * (throttle > 0.1 ? 1.05 : 0.76));

      this.engineOsc.frequency.setTargetAtTime(basePitch, now, 0.055);
      this.engineSubOsc.frequency.setTargetAtTime(subPitch, now, 0.055);
      this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.06);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.06);

      if (drifting && speedNorm > 0.28) {
        this.screechGain.gain.setTargetAtTime(0.065, now, 0.05);
      } else {
        this.screechGain.gain.setTargetAtTime(0, now, 0.03);
      }
    } else {
      this.engineGain.gain.setTargetAtTime(0, now, 0.035);
      this.screechGain.gain.setTargetAtTime(0, now, 0.025);
    }

    if (!this.muted && sirenStrength > 0.08) {
      const wail = 480 + Math.sin(elapsed * 5.2) * 145;
      this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.04);
      this.sirenGain.gain.setTargetAtTime(0.036 * sirenStrength, now, 0.07);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.035);
    }
  }

  public playFootstep(sprinting: boolean, isSoftGround = false) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted || this.ctx.state !== 'running') {
      return;
    }
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startFreq = isSoftGround ? 195 : 265;
    filter.frequency.setValueAtTime(startFreq + Math.random() * 45, now);
    filter.frequency.exponentialRampToValueAtTime(85, now + 0.06);
    filter.Q.value = 0.7;

    const g = this.ctx.createGain();
    const peak = sprinting ? 0.062 : 0.04;
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(now, Math.random() * 0.4, 0.07);
  }

  public playWeapon(weapon: WeaponId) {
    this.unlock();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    if (weapon === 'fists') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.14);
      return;
    }

    // Noise burst + low punch
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = weapon === 'pistol' ? 1100 : 1600;
    const gain = this.ctx.createGain();
    const dur = weapon === 'pistol' ? 0.16 : 0.09;
    gain.gain.setValueAtTime(weapon === 'pistol' ? 0.35 : 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + dur);
  }

  public playCrash(intensity: number) {
    this.unlock();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.45, Math.max(0.06, intensity * 0.35));

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.28);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.31);
  }

  public playCashChime() {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      g.gain.setValueAtTime(0.16, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.24);
    });
  }

  public playPhoneBeep(freq = 740) {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playExplosion() {
    this.unlock();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.exponentialRampToValueAtTime(45, now + 0.85);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.48, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.92);
  }

  public playThunder() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted || this.ctx.state !== 'running') {
      return;
    }
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(175, now);
    filter.frequency.exponentialRampToValueAtTime(42, now + 1.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.24, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 1.48);
  }

  public setRadioStation(station: RadioStationId) {
    this.radioStation = station;
    if (this.radioInterval !== null) {
      window.clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    this.unlock();

    if (this.radioGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.radioGain.gain.cancelScheduledValues(now);
      this.radioGain.gain.setTargetAtTime(station === 'off' ? 0 : 0.62, now, 0.025);
    }

    if (station === 'off') return;

    // Brief nostalgic FM tuning static click
    if (this.ctx && this.masterGain && this.noiseBuffer && !this.muted && this.ctx.state === 'running') {
      const now = this.ctx.currentTime;
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      n.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      n.start(now, 0.1, 0.06);
    }

    this.startRadioSequencer(station);
  }

  private startRadioSequencer(station: RadioStationId) {
    if (this.radioInterval !== null) {
      window.clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    if (station === 'off') return;

    const bpmMap: Record<Exclude<RadioStationId, 'off'>, number> = {
      pulse: 122,
      synthwave: 110,
      rock: 132,
      hiphop: 92,
      latin: 104,
      techno: 136,
      jazz: 80,
    };
    const bpm = bpmMap[station];
    const stepMs = Math.round(60000 / bpm / 4); // 16th-note step duration
    this.radioStep = 0;

    if (this.ctx && !this.muted && this.ctx.state === 'running') {
      this.triggerRadioStep(station, this.radioStep++);
    }
    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || !this.radioGain || this.muted || this.ctx.state !== 'running') return;
      this.triggerRadioStep(station, this.radioStep++);
    }, stepMs);
  }

  private playTone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    cutoff = 2400,
    q = 0.8,
    useRockDrive = false,
    glideToFreq?: number,
  ) {
    if (!this.ctx || !this.radioGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (glideToFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideToFreq), now + dur * 0.75);
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.value = q;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(useRockDrive && this.rockDriveNode ? this.rockDriveNode : this.radioGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private playRadioNoise(
    filterType: BiquadFilterType,
    freq: number,
    dur: number,
    vol: number,
    q = 1.0,
  ) {
    if (!this.ctx || !this.radioGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const flt = this.ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.value = freq;
    flt.Q.value = q;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    n.connect(flt);
    flt.connect(g);
    g.connect(this.radioGain);
    n.start(now, Math.random() * 0.5, dur + 0.01);
  }

  private triggerRadioStep(station: Exclude<RadioStationId, 'off'>, step: number) {
    const s = step % 16;
    const bar = Math.floor(step / 16) % 4;

    if (station === 'pulse') {
      // Electro-Pop / Dance 122 BPM (Am - F - C - G)
      const roots = [110.0, 87.31, 130.81, 98.0];
      const leads = [
        [440, 523.25, 659.25, 523.25],
        [349.23, 440, 523.25, 440],
        [523.25, 659.25, 783.99, 659.25],
        [392.0, 493.88, 587.33, 493.88],
      ];
      if (s % 4 === 0) this.playTone(135, 0.14, 'sine', 0.28, 800, 1, false, 40);
      if (s === 4 || s === 12) this.playRadioNoise('bandpass', 1800, 0.09, 0.13, 0.9);
      if (s % 2 === 1) this.playRadioNoise('highpass', 7200, 0.04, 0.045);
      // Offbeat dance bass
      if (s % 2 === 1 || s === 0) {
        this.playTone(roots[bar], 0.16, 'sawtooth', 0.14, 520, 1.4);
      }
      // Bright chord pad on beat 0 & 6
      if (s === 0 || s === 6) {
        const ch = leads[bar];
        this.playTone(ch[0], 0.34, 'triangle', 0.09, 2200);
        this.playTone(ch[1], 0.34, 'triangle', 0.07, 2200);
        this.playTone(ch[2], 0.34, 'triangle', 0.07, 2200);
      }
      // Sparkly pluck melody
      if (s === 0 || s === 3 || s === 6 || s === 8 || s === 11 || s === 14) {
        const note = leads[bar][(step + bar) % 4];
        this.playTone(note, 0.15, 'square', 0.055, 1900);
      }
    } else if (station === 'synthwave') {
      // 80s Retrowave 110 BPM (Em - C - D - Bm)
      const roots = [82.41, 65.41, 73.42, 61.74];
      const arpNotes = [
        [164.81, 196.0, 246.94, 329.63],
        [130.81, 164.81, 196.0, 261.63],
        [146.83, 185.0, 220.0, 293.66],
        [123.47, 146.83, 185.0, 246.94],
      ];
      if (s === 0 || s === 8) this.playTone(120, 0.18, 'sine', 0.27, 650, 1, false, 38);
      if (s === 4 || s === 12) this.playRadioNoise('lowpass', 2400, 0.16, 0.14, 0.7); // Gated 80s snare
      if (s % 2 === 1) this.playRadioNoise('highpass', 6200, 0.035, 0.035);
      // Driving 16th-note analog bass
      const oct = s % 4 === 2 ? 2 : 1;
      this.playTone(roots[bar] * oct, 0.12, 'sawtooth', 0.12, 460, 1.8);
      // Lush retro arp
      if (s % 2 === 0) {
        const n = arpNotes[bar][(s >> 1) % 4] * (s >= 8 ? 2 : 1);
        this.playTone(n, 0.2, 'sawtooth', 0.065, 1350, 1.1);
      }
    } else if (station === 'rock') {
      // Hard & Classic Rock 132 BPM (E5 - G5 - A5 - D5 power chords!)
      const riffs = [82.41, 98.0, 110.0, 73.42];
      const kickSteps = [0, 3, 6, 8, 10, 14];
      if (kickSteps.includes(s)) this.playTone(118, 0.12, 'sine', 0.26, 650, 1, false, 42);
      if (s === 4 || s === 12) {
        this.playRadioNoise('bandpass', 1500, 0.11, 0.16, 0.8);
        this.playTone(195, 0.06, 'triangle', 0.1, 900, 1, false, 110);
      }
      if (s % 2 === 0) this.playRadioNoise('highpass', 5800, 0.05, 0.045); // Crash/ride feel
      // Electric bass
      if (s % 2 === 0) {
        this.playTone(riffs[bar], 0.13, 'triangle', 0.16, 620);
      }
      // Crunchy distorted power chord (root + fifth)
      if (s === 0 || s === 3 || s === 6 || s === 8 || s === 12 || s === 14) {
        const root = riffs[bar] * 2;
        this.playTone(root, 0.19, 'sawtooth', 0.085, 2100, 1.2, true);
        this.playTone(root * 1.498, 0.19, 'sawtooth', 0.07, 2100, 1.2, true);
      }
      // Guitar lick solo accent on bar 3
      if (bar === 3 && (s === 2 || s === 6 || s === 10 || s === 13)) {
        const solo = [329.63, 392.0, 440.0, 493.88];
        this.playTone(solo[s % 4], 0.16, 'sawtooth', 0.065, 2500, 1.4, true);
      }
    } else if (station === 'hiphop') {
      // Westside Boom-Bap / Trap 92 BPM (Cm - Ab - Fm - G)
      const subs = [65.41, 51.91, 43.65, 49.0];
      const epChords = [
        [261.63, 311.13, 392.0],
        [207.65, 261.63, 311.13],
        [174.61, 207.65, 261.63],
        [196.0, 246.94, 293.66],
      ];
      if (s === 0 || s === 3 || s === 10) {
        this.playTone(95, 0.24, 'sine', 0.3, 420, 1, false, subs[bar]); // Deep 808 kick
      }
      if (s === 4 || s === 12) this.playRadioNoise('bandpass', 2100, 0.085, 0.15, 1.1); // Crisp clap/snare
      // Trap rolling hi-hats
      if (s % 2 === 1 || (bar % 2 === 1 && s >= 12)) {
        this.playRadioNoise('highpass', 7800, 0.032, 0.04);
      }
      // Mellow West Coast Rhodes / EP chords
      if (s === 0 || s === 7) {
        epChords[bar].forEach((n) => this.playTone(n, 0.38, 'sine', 0.075, 1600));
      }
      // High whistle synth lead (G-Funk nod)
      if (bar % 2 === 0 && (s === 8 || s === 11 || s === 14)) {
        const gfunk = [622.25, 587.33, 523.25];
        this.playTone(gfunk[s % 3], 0.22, 'sine', 0.055, 2200);
      }
    } else if (station === 'latin') {
      // Sol Tropico Reggaeton / Salsa 104 BPM (Dembow rhythm!)
      const bass = [73.42, 65.41, 55.0, 61.74]; // Dm - C - Am - Bb/B
      const marimba = [
        [293.66, 349.23, 440.0],
        [261.63, 329.63, 392.0],
        [220.0, 261.63, 329.63],
        [246.94, 293.66, 392.0],
      ];
      // Classic Dembow kick + syncopated snare
      if (s % 4 === 0) this.playTone(128, 0.14, 'sine', 0.27, 680, 1, false, 44);
      if (s === 3 || s === 6 || s === 11 || s === 14) {
        this.playRadioNoise('bandpass', 1650, 0.075, 0.13, 1.2);
      }
      // Tropical clave woodblock
      if (s === 0 || s === 3 || s === 6 || s === 10 || s === 12) {
        this.playTone(1180, 0.045, 'sine', 0.05, 2800);
      }
      // Syncopated Latin bass
      if (s === 0 || s === 6 || s === 8 || s === 14) {
        this.playTone(bass[bar], 0.2, 'triangle', 0.16, 480);
      }
      // Bright tropical marimba riff
      if (s % 2 === 0) {
        const note = marimba[bar][(s / 2 + bar) % 3];
        this.playTone(note, 0.14, 'triangle', 0.085, 2600);
      }
    } else if (station === 'techno') {
      // Underground Acid Techno / Rave 136 BPM
      const acidNotes = [55.0, 55.0, 65.41, 73.42, 55.0, 82.41, 61.74, 65.41];
      if (s % 4 === 0) this.playTone(148, 0.13, 'sine', 0.3, 950, 1.2, false, 36);
      if (s % 4 === 2) this.playRadioNoise('highpass', 6400, 0.07, 0.065); // Open off-hat
      if (s === 4 || s === 12) this.playRadioNoise('bandpass', 1900, 0.07, 0.12, 1.0);
      // Resonant 303 acid filter sweep!
      const acidFreq = acidNotes[(s + bar * 2) % acidNotes.length] * (s % 4 === 3 ? 2 : 1);
      const sweepCutoff = 380 + ((step * 170) % 1900);
      this.playTone(acidFreq, 0.11, 'sawtooth', 0.11, sweepCutoff, 4.5);
      // Rave stab chord on bar start
      if (s === 0 || s === 10) {
        this.playTone(220, 0.15, 'sawtooth', 0.055, 2200, 1.2);
        this.playTone(261.63, 0.15, 'sawtooth', 0.05, 2200, 1.2);
      }
    } else if (station === 'jazz') {
      // Palmetto Lounge Lo-Fi Jazz / Chill 80 BPM (Dm9 - G13 - Cmaj9 - A7)
      const walkingBass = [73.42, 87.31, 98.0, 123.47, 65.41, 82.41, 55.0, 69.3];
      const jazzChords = [
        [293.66, 349.23, 440.0, 523.25],
        [246.94, 329.63, 392.0, 440.0],
        [261.63, 329.63, 392.0, 493.88],
        [220.0, 277.18, 329.63, 392.0],
      ];
      if (s === 0 || s === 10) this.playTone(88, 0.18, 'sine', 0.19, 340, 1, false, 45);
      if (s === 4 || s === 12) this.playRadioNoise('lowpass', 1600, 0.08, 0.06, 0.6); // Soft brush snare
      if (s % 3 === 0) this.playRadioNoise('highpass', 5500, 0.04, 0.025); // Swing ride brush
      // Warm upright walking bass
      if (s % 4 === 0) {
        this.playTone(walkingBass[(bar * 2 + (s >> 3)) % walkingBass.length], 0.32, 'triangle', 0.15, 390);
      }
      // Warm Rhodes jazz chord
      if (s === 0 || s === 7) {
        jazzChords[bar].forEach((n) => this.playTone(n, 0.45, 'sine', 0.055, 1300));
      }
      // Smooth lounge solo note
      if (s === 2 || s === 6 || s === 11 || s === 14) {
        const note = jazzChords[bar][(s + bar) % 4] * 1.5;
        this.playTone(note, 0.24, 'triangle', 0.048, 1250);
      }
    }
  }

  public dispose() {
    if (this.radioInterval !== null) {
      window.clearInterval(this.radioInterval);
      this.radioInterval = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
