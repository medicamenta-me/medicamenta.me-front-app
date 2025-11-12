import { Injectable } from '@angular/core';

/**
 * Audio Service
 * Manages sound effects for gamification events
 */
@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private isMuted = false;

  constructor() {
    // Initialize Web Audio API
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }

    // Load mute preference from localStorage
    const savedMute = localStorage.getItem('audio_muted');
    this.isMuted = savedMute === 'true';
  }

  /**
   * Toggle mute/unmute
   */
  toggleMute(): void {
    this.isMuted = !this.isMuted;
    localStorage.setItem('audio_muted', this.isMuted.toString());
  }

  /**
   * Get mute status
   */
  isMutedStatus(): boolean {
    return this.isMuted;
  }

  /**
   * Play confetti sound (general achievement)
   * Pop + sparkle sound
   */
  playConfetti(): void {
    if (this.isMuted || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Create oscillator for pop sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Pop sound: quick frequency drop
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);

    // Add sparkle sound
    setTimeout(() => this.playSparkle(), 50);
  }

  /**
   * Play starburst sound (level up)
   * Whoosh + power-up ding
   */
  playStarburst(): void {
    if (this.isMuted || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Whoosh sound (ascending frequency)
    const whooshOsc = ctx.createOscillator();
    const whooshGain = ctx.createGain();

    whooshOsc.connect(whooshGain);
    whooshGain.connect(ctx.destination);

    whooshOsc.frequency.setValueAtTime(200, now);
    whooshOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

    whooshGain.gain.setValueAtTime(0.2, now);
    whooshGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    whooshOsc.start(now);
    whooshOsc.stop(now + 0.3);

    // Power-up ding (after whoosh)
    setTimeout(() => {
      const dingOsc = ctx.createOscillator();
      const dingGain = ctx.createGain();

      dingOsc.connect(dingGain);
      dingGain.connect(ctx.destination);

      dingOsc.frequency.setValueAtTime(1200, ctx.currentTime);
      dingOsc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.2);

      dingGain.gain.setValueAtTime(0.4, ctx.currentTime);
      dingGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      dingOsc.start(ctx.currentTime);
      dingOsc.stop(ctx.currentTime + 0.2);
    }, 300);
  }

  /**
   * Play fireworks sound (perfect week/month)
   * Bang + crackle sequence
   */
  playFireworks(): void {
    if (this.isMuted || !this.audioContext) return;

    const ctx = this.audioContext;

    // Launch sound (ascending)
    this.playLaunchSound();

    // Bang + crackle after launch
    setTimeout(() => {
      this.playBangSound();
      setTimeout(() => this.playCrackle(), 100);
    }, 800);

    // Second firework
    setTimeout(() => {
      this.playLaunchSound();
      setTimeout(() => {
        this.playBangSound();
        setTimeout(() => this.playCrackle(), 100);
      }, 800);
    }, 1500);
  }

  /**
   * Play sparkle sound (high frequency shimmer)
   */
  private playSparkle(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Play launch sound (rocket ascending)
   */
  private playLaunchSound(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.8);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  /**
   * Play bang sound (explosion)
   */
  private playBangSound(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Use white noise for bang
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.start(now);
    noise.stop(now + 0.2);
  }

  /**
   * Play crackle sound (sparks after explosion)
   */
  private playCrackle(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;

    // Multiple quick pops
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const freq = 1000 + Math.random() * 2000;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq / 2, now + 0.05);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
      }, i * 50);
    }
  }

  /**
   * Play notification sound (simple beep)
   */
  playNotification(): void {
    if (this.isMuted || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

