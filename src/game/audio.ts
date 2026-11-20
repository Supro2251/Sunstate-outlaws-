import { RadioStationId, WeaponId } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private screechSource: AudioBufferSourceNode | null = null;
  private screechGain: GainNode | null = null;

  private muted = false;
  private radioStation: RadioStationId = 'off';
  private radioInterval: number | null = null;
  private radioStep = 0;

  public unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.45;
      this.masterGain.connect(this.ctx.destination);

      // Noise buffer for shots, tire screech, and crashes
      const length = this.ctx.sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      // Warm soft engine oscillator (strictly silent at idle / on foot — zero background buzz!)
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.value = 64;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 140;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();

      // Continuous police siren oscillator (muted until siren active)
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 660;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);
      this.sirenOsc.start();

      // Tire screech loop (muted unless actively drifting fast)
      this.screechSource = this.ctx.createBufferSource();
      this.screechSource.buffer = this.noiseBuffer;
      this.screechSource.loop = true;
      const screechFilter = this.ctx.createBiquadFilter();
      screechFilter.type = 'bandpass';
      screechFilter.frequency.value = 1350;
      screechFilter.Q.value = 6.5;
      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.value = 0;
      this.screechSource.connect(screechFilter);
      screechFilter.connect(this.screechGain);
      this.screechGain.connect(this.masterGain);
      this.screechSource.start();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.45, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateVehicleAudio(
    inVehicle: boolean,
    speedNorm: number,
    drifting: boolean,
    sirenStrength: number,
    elapsed: number,
  ) {
    if (!this.ctx || !this.engineGain || !this.engineOsc || !this.engineFilter || !this.screechGain || !this.sirenGain || !this.sirenOsc) {
      return;
    }
    const now = this.ctx.currentTime;
    const moving = inVehicle && !this.muted && speedNorm > 0.035;
    if (moving) {
      const targetFreq = 62 + speedNorm * 115;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.09);
      this.engineFilter.frequency.setTargetAtTime(140 + speedNorm * 320, now, 0.09);
      this.engineGain.gain.setTargetAtTime(Math.min(0.085, 0.018 + speedNorm * 0.065), now, 0.09);
      this.screechGain.gain.setTargetAtTime(drifting && speedNorm > 0.25 ? 0.11 : 0, now, 0.06);
    } else {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
      this.screechGain.gain.setTargetAtTime(0, now, 0.05);
    }

    if (!this.muted && sirenStrength > 0.05) {
      const wail = 620 + Math.sin(elapsed * 5.4) * 220;
      this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.04);
      this.sirenGain.gain.setTargetAtTime(0.045 * sirenStrength, now, 0.08);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.06);
    }
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
    if (station === 'off') return;
    this.unlock();

    const stepMs = station === 'pulse' ? 125 : station === 'synthwave' ? 140 : 162;
    this.radioStep = 0;

    this.radioInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
      this.triggerRadioStep(station, this.radioStep++);
    }, stepMs);
  }

  private triggerRadioStep(station: RadioStationId, step: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const barStep = step % 16;

    // Kick on 0, 4, 8, 12 (or syncopated for bassline)
    const isKick =
      station === 'bassline'
        ? barStep === 0 || barStep === 6 || barStep === 10
        : barStep % 4 === 0;
    if (isKick) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(station === 'bassline' ? 110 : 135, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.17);
    }

    // Hi-hat on offbeats
    if (barStep % 2 === 1 && this.noiseBuffer) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6500;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.035, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      n.connect(hp);
      hp.connect(g);
      g.connect(this.masterGain);
      n.start(now);
      n.stop(now + 0.05);
    }

    // Melodic Bass / Synth Arp
    const pulseScale = [220, 261.63, 293.66, 329.63, 392, 440, 392, 329.63];
    const synthScale = [164.81, 196.0, 246.94, 293.66, 329.63, 293.66, 246.94, 196.0];
    const bassScale = [73.42, 73.42, 87.31, 98.0, 65.41, 65.41, 82.41, 98.0];

    if (barStep % 2 === 0) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      const notes =
        station === 'pulse' ? pulseScale : station === 'synthwave' ? synthScale : bassScale;
      const freq = notes[(step >> 1) % notes.length];

      osc.type = station === 'bassline' ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.value = station === 'synthwave' ? 950 : station === 'pulse' ? 1400 : 420;

      g.gain.setValueAtTime(station === 'bassline' ? 0.14 : 0.075, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
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
