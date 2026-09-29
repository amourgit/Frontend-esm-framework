// Xbox Sound System for EGEN Documents
// High-fidelity Web Audio API synthesizer for authentic Xbox UI sounds
// Zero latency, zero external downloads, 100% reliable across all browsers.

export type XboxSoundType = 
  | 'hover' 
  | 'select' 
  | 'back' 
  | 'modalOpen'
  | 'folderOpen' 
  | 'scroll' 
  | 'boundary'
  | 'notification' 
  | 'achievement' 
  | 'toastSuccess'
  | 'toastInfo'
  | 'toastWarning'
  | 'toastError'
  | 'toggle';

class XboxAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private lastPlayTimes: Record<string, number> = {};
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Load persisted mute/volume settings
    try {
      const savedMute = localStorage.getItem('egen_xbox_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('egen_xbox_sound_volume');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol) || 0.5;
      }
    } catch {
      // localStorage fallback
    }

    // Lazy init on first user gesture
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.generateNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.5; // 500ms of stereo noise
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    this.noiseBuffer = buffer;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('egen_xbox_sound_muted', String(muted));
    } catch {
      // Ignore
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.play('select');
    }
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('egen_xbox_sound_volume', String(this.volume));
    } catch {
      // Ignore
    }
  }

  /**
   * Main sound trigger method
   */
  public play(type: XboxSoundType) {
    if (this.isMuted) return;

    // Rate limiting to prevent audio clutter
    const now = performance.now();
    const minInterval: Record<XboxSoundType, number> = {
      hover: 40,        // Max ~25 hover ticks per sec
      scroll: 40,       // Crisp rapid wheel/stepper ticks
      boundary: 160,    // Muted boundary bump when reaching end of list/grid/carousel
      select: 60,
      back: 60,
      modalOpen: 100,
      folderOpen: 120,
      notification: 180,
      achievement: 250,
      toastSuccess: 120,
      toastInfo: 120,
      toastWarning: 120,
      toastError: 120,
      toggle: 60
    };

    if (this.lastPlayTimes[type] && now - this.lastPlayTimes[type] < minInterval[type]) {
      return;
    }
    this.lastPlayTimes[type] = now;

    const ctx = this.initContext();
    if (!ctx) return;

    try {
      switch (type) {
        case 'hover':
          this.playHover(ctx);
          break;
        case 'select':
          this.playSelect(ctx);
          break;
        case 'back':
          this.playBack(ctx);
          break;
        case 'modalOpen':
          this.playModalOpen(ctx);
          break;
        case 'folderOpen':
          this.playFolderOpen(ctx);
          break;
        case 'scroll':
          this.playScroll(ctx);
          break;
        case 'boundary':
          this.playBoundary(ctx);
          break;
        case 'notification':
          this.playNotification(ctx);
          break;
        case 'achievement':
          this.playAchievement(ctx);
          break;
        case 'toastSuccess':
          this.playToastSuccess(ctx);
          break;
        case 'toastInfo':
          this.playToastInfo(ctx);
          break;
        case 'toastWarning':
          this.playToastWarning(ctx);
          break;
        case 'toastError':
          this.playToastError(ctx);
          break;
        case 'toggle':
          this.playToggle(ctx);
          break;
      }
    } catch (e) {
      console.warn('Xbox Audio error:', e);
    }
  }

  /**
   * Xbox Subtle Hover Tick (ultra light & high-frequency)
   */
  private playHover(ctx: AudioContext) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.025);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(3, t);

    const masterGain = this.volume * 0.12; // soft subtle tick
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(masterGain, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  /**
   * Xbox A-Button Select Chirp (crisp digital percussive pluck)
   */
  private playSelect(ctx: AudioContext) {
    const t = ctx.currentTime;

    // High chirp oscillator
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(920, t);
    osc1.frequency.exponentialRampToValueAtTime(1480, t + 0.035);
    osc1.frequency.exponentialRampToValueAtTime(1100, t + 0.07);

    const vol1 = this.volume * 0.28;
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(vol1, t + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Warm body oscillator
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(460, t);
    osc2.frequency.exponentialRampToValueAtTime(320, t + 0.05);

    const vol2 = this.volume * 0.15;
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(vol2, t + 0.004);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.08);
    osc2.stop(t + 0.06);
  }

  /**
   * Xbox B-Button Back / Cancel / Dismiss / Route Return
   * Authentic warm descending console feel with acoustic dampening & sub-harmonic warmth
   */
  private playBack(ctx: AudioContext) {
    const t = ctx.currentTime;

    // 1. Gentle tactile transient (warm rounded click)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(750, t);
    clickOsc.frequency.exponentialRampToValueAtTime(260, t + 0.015);

    const clickVol = this.volume * 0.16;
    clickGain.gain.setValueAtTime(0, t);
    clickGain.gain.linearRampToValueAtTime(clickVol, t + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(t);
    clickOsc.stop(t + 0.02);

    // 2. Warm mid-range descending drop
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(540, t);
    osc1.frequency.exponentialRampToValueAtTime(210, t + 0.085);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(360, t + 0.09);
    filter.Q.setValueAtTime(1.8, t);

    const vol1 = this.volume * 0.28;
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(vol1, t + 0.004);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);

    // 3. Sub-harmonic body warmth (console controller resonance)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(230, t);
    osc2.frequency.exponentialRampToValueAtTime(95, t + 0.095);

    const vol2 = this.volume * 0.18;
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(vol2, t + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.1);
    osc2.stop(t + 0.11);
  }

  /**
   * Xbox Modal / Window Open ("Doux & Feutré")
   * Soft, warm, non-aggressive harmonic bloom with velvety low-pass filtering and rounded attack
   */
  private playModalOpen(ctx: AudioContext) {
    const t = ctx.currentTime;

    // Master lowpass filter to completely eliminate harsh/shrill frequencies (> 1100 Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.Q.setValueAtTime(0.7, t); // gentle butterworth response, no harsh resonant peaks
    filter.connect(ctx.destination);

    // 1. Soft cushion / air bloom (whisper-quiet ambient breath, low-passed)
    if (this.noiseBuffer) {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;

      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.setValueAtTime(450, t);
      nFilter.frequency.exponentialRampToValueAtTime(700, t + 0.1);
      nFilter.Q.setValueAtTime(1.2, t);

      const nGain = ctx.createGain();
      const nVol = this.volume * 0.045; // very quiet subtle cushion
      nGain.gain.setValueAtTime(0, t);
      nGain.gain.linearRampToValueAtTime(nVol, t + 0.03);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      noiseSource.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(filter);
      noiseSource.start(t);
      noiseSource.stop(t + 0.19);
    }

    // 2. Warm velvety harmonic tones (Smooth dual-tone bloom: G4 ~392Hz & D5 ~587Hz)
    // Completely pure sine waves with gradual attack (no percussive click or aggressive transient)
    const softChords = [
      { freqStart: 370, freqEnd: 392.00, startOffset: 0.000, dur: 0.22, vol: 0.14 }, // G4 base
      { freqStart: 554, freqEnd: 587.33, startOffset: 0.022, dur: 0.24, vol: 0.12 }, // D5 gentle fifth
      { freqStart: 740, freqEnd: 783.99, startOffset: 0.045, dur: 0.20, vol: 0.08 }  // G5 soft octave
    ];

    softChords.forEach((chord) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine'; // pure round sine wave
      const startT = t + chord.startOffset;

      // Subtle upward glide to give motion without being piercing
      osc.frequency.setValueAtTime(chord.freqStart, startT);
      osc.frequency.exponentialRampToValueAtTime(chord.freqEnd, startT + 0.06);

      const peakVol = this.volume * chord.vol;
      gain.gain.setValueAtTime(0, startT);
      // Soft 20ms attack - prevents any click or aggressive pop
      gain.gain.linearRampToValueAtTime(peakVol, startT + 0.022);
      // Smooth natural decay
      gain.gain.exponentialRampToValueAtTime(0.0001, startT + chord.dur);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(startT);
      osc.stop(startT + chord.dur + 0.01);
    });
  }

  /**
   * Xbox Blade / Guide Whoosh + Harmonic Shimmer (Folder open / View launch)
   */
  private playFolderOpen(ctx: AudioContext) {
    const t = ctx.currentTime;

    // 1. Noise whoosh layer
    if (this.noiseBuffer) {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, t);
      filter.frequency.exponentialRampToValueAtTime(2400, t + 0.12);
      filter.frequency.exponentialRampToValueAtTime(600, t + 0.28);
      filter.Q.setValueAtTime(3.5, t);

      const noiseGain = ctx.createGain();
      const nVol = this.volume * 0.2;
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(nVol, t + 0.08);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noiseSource.start(t);
      noiseSource.stop(t + 0.3);
    }

    // 2. Rising harmonic chime layer (Xbox signature crystalline chord)
    const freqs = [659.25, 987.77, 1318.5]; // E5, B5, E6
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.85, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.09);

      const cVol = (this.volume * 0.12) / (idx + 1);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(cVol, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  /**
   * Xbox Carousel Scroll Tick (crisp tactile step)
   */
  private playScroll(ctx: AudioContext) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.018);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(2, t);

    const vol = this.volume * 0.16;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.02);
  }

  /**
   * Xbox Boundary Bump / Edge Limit ("Butée de fin de liste")
   * Soft, muted, rubbery tactile bump with low-frequency damping when hitting list/grid/carousel boundary
   */
  private playBoundary(ctx: AudioContext) {
    const t = ctx.currentTime;

    // Filter to keep it warm, cushioned and non-intrusive
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.06);
    filter.Q.setValueAtTime(1.2, t);
    filter.connect(ctx.destination);

    // Primary rubbery bumper oscillator (sine, downward micro-glide)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(210, t);
    osc1.frequency.exponentialRampToValueAtTime(85, t + 0.055);

    const vol1 = this.volume * 0.17;
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(vol1, t + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

    osc1.connect(gain1);
    gain1.connect(filter);
    osc1.start(t);
    osc1.stop(t + 0.07);

    // Sub-harmonic cushioned body
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110, t);
    osc2.frequency.exponentialRampToValueAtTime(55, t + 0.045);

    const vol2 = this.volume * 0.11;
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(vol2, t + 0.002);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc2.connect(gain2);
    gain2.connect(filter);
    osc2.start(t);
    osc2.stop(t + 0.055);
  }

  /**
   * Xbox Notification Ring / Double Chime
   */
  private playNotification(ctx: AudioContext) {
    const t = ctx.currentTime;
    const notes = [
      { f: 880, start: 0, dur: 0.22, vol: 0.25 },     // A5
      { f: 1320, start: 0.08, dur: 0.35, vol: 0.3 }   // E6
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, t + n.start);

      const targetVol = this.volume * n.vol;
      gain.gain.setValueAtTime(0, t + n.start);
      gain.gain.linearRampToValueAtTime(targetVol, t + n.start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.start + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + n.start);
      osc.stop(t + n.start + n.dur);
    });
  }

  /**
   * The Legendary Xbox Achievement / Success Chime (Validation & Completion)
   */
  private playAchievement(ctx: AudioContext) {
    const t = ctx.currentTime;

    // Stage 1: Ascending dual herald (F#5 -> C#6)
    const herald = [
      { freq: 739.99, time: 0, dur: 0.15 },       // F#5
      { freq: 1108.73, time: 0.08, dur: 0.55 }    // C#6
    ];

    herald.forEach((h) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.freq, t + h.time);

      const vol = this.volume * 0.3;
      gain.gain.setValueAtTime(0, t + h.time);
      gain.gain.linearRampToValueAtTime(vol, t + h.time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + h.time + h.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + h.time);
      osc.stop(t + h.time + h.dur);
    });

    // Stage 2: Crystalline Bell Chord Ring (F#6, A#6, C#7, F#7)
    const chord = [1479.98, 1864.66, 2217.46, 2959.96];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + 0.12);

      const chordVol = (this.volume * 0.22) / (i + 1);
      gain.gain.setValueAtTime(0, t + 0.12);
      gain.gain.linearRampToValueAtTime(chordVol, t + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + 0.12);
      osc.stop(t + 0.9);
    });
  }

  /**
   * Xbox Toast Alert - Success (Affirmative ascending crystal triad)
   */
  private playToastSuccess(ctx: AudioContext) {
    const t = ctx.currentTime;
    // 3-note ascending triad: F#5 (739.99 Hz), A#5 (932.33 Hz), C#6 (1108.73 Hz)
    const notes = [
      { f: 739.99, delay: 0, dur: 0.2, vol: 0.24 },
      { f: 932.33, delay: 0.04, dur: 0.22, vol: 0.26 },
      { f: 1108.73, delay: 0.08, dur: 0.42, vol: 0.3 }
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      const st = t + n.delay;
      osc.frequency.setValueAtTime(n.f, st);

      const vol = this.volume * n.vol;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(vol, st + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(st);
      osc.stop(st + n.dur + 0.02);
    });
  }

  /**
   * Xbox Toast Alert - Information (Modern crisp dual bell pulse)
   */
  private playToastInfo(ctx: AudioContext) {
    const t = ctx.currentTime;
    // Dual bell: A5 (880 Hz) and E6 (1318.5 Hz) with body at 440 Hz
    const notes = [
      { f: 880, delay: 0, dur: 0.22, vol: 0.24 },
      { f: 1318.5, delay: 0.045, dur: 0.3, vol: 0.26 },
      { f: 440, delay: 0, dur: 0.15, vol: 0.12 }
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      const st = t + n.delay;
      osc.frequency.setValueAtTime(n.f, st);

      const vol = this.volume * n.vol;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(vol, st + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(st);
      osc.stop(st + n.dur + 0.02);
    });
  }

  /**
   * Xbox Toast Alert - Warning (Electronic dual notch caution pulse)
   */
  private playToastWarning(ctx: AudioContext) {
    const t = ctx.currentTime;
    const pulses = [
      { f: 554.37, delay: 0, dur: 0.06, vol: 0.25 },     // C#5
      { f: 466.16, delay: 0.075, dur: 0.12, vol: 0.26 }  // A#4
    ];

    pulses.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, t + p.delay);
      filter.Q.setValueAtTime(2.2, t + p.delay);

      const st = t + p.delay;
      osc.frequency.setValueAtTime(p.f, st);

      const vol = this.volume * p.vol;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(vol, st + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + p.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(st);
      osc.stop(st + p.dur + 0.01);
    });
  }

  /**
   * Xbox Toast Alert - Error / Deletion (Gentle descending low resonance)
   */
  private playToastError(ctx: AudioContext) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(392, t); // G4
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.12); // A3

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);
    filter.Q.setValueAtTime(2, t);

    const vol = this.volume * 0.24;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Sub thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(60, t + 0.15);

    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(this.volume * 0.18, t + 0.005);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    osc.start(t);
    subOsc.start(t);
    osc.stop(t + 0.14);
    subOsc.stop(t + 0.16);
  }

  /**
   * Crisp toggle notch
   */
  private playToggle(ctx: AudioContext) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.02);

    const vol = this.volume * 0.18;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.035);
  }
}

// Singleton instance
export const xboxAudio = new XboxAudioEngine();

/**
 * Convenient shorthand helper function
 */
export function playXboxSound(type: XboxSoundType) {
  xboxAudio.play(type);
}

export function isXboxAudioMuted(): boolean {
  return xboxAudio.getIsMuted();
}

export function toggleXboxAudio(): boolean {
  return xboxAudio.toggleMute();
}
