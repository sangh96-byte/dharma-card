/**
 * Dharma Card — 순수 JS 내장 불교 명상 음악 엔진 (GitHub Pages 경량 · 안드로이드 100% 호환)
 */
(function (global) {
  const SR = 16000;
  const TRACK_LABELS = {
    singing_bowl: '싱잉볼 · 범종 여운',
    temple_wind: '산사 풍경 · 숲바람',
    zen_gayageum: '고요한 선(禪) 선율',
    mute: '무음',
  };

  function buildWavBlobUrl(track) {
    const dur = track === 'temple_wind' ? 18 : 20;
    const totalSamples = dur * SR;
    const buf = new Float32Array(totalSamples);

    const addBowl = (startSec, baseFreq, amp, spanSec) => {
      const s = Math.floor(startSec * SR);
      const n = Math.floor(spanSec * SR);
      const parts = [[1.0, 1.0, 0.34], [1.0045, 0.56, 0.36], [2.756, 0.25, 0.62]];
      for (let i = 0; i < n && s + i < totalSamples; i++) {
        const t = i / SR;
        const atk = Math.min(1, t / 0.14);
        let v = 0;
        for (let k = 0; k < parts.length; k++) {
          const [r, pa, dec] = parts[k];
          v += pa * atk * Math.exp(-t * dec) * Math.sin(2 * Math.PI * baseFreq * r * t);
        }
        buf[s + i] += v * amp;
      }
    };

    const addBell = (startSec, baseFreq, amp, spanSec) => {
      const s = Math.floor(startSec * SR);
      const n = Math.floor(spanSec * SR);
      const parts = [[1.0, 1.0, 0.26], [1.007, 0.7, 0.28], [2.005, 0.28, 0.45]];
      for (let i = 0; i < n && s + i < totalSamples; i++) {
        const t = i / SR;
        const atk = Math.min(1, t / 0.07);
        let v = 0;
        for (let k = 0; k < parts.length; k++) {
          const [r, pa, dec] = parts[k];
          v += pa * atk * Math.exp(-t * dec) * Math.sin(2 * Math.PI * baseFreq * r * t);
        }
        buf[s + i] += v * amp;
      }
    };

    if (track === 'temple_wind') {
      let lp1 = 0, lp2 = 0, seed = 108;
      const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed / 4294967296) * 2 - 1; };
      for (let i = 0; i < totalSamples; i++) {
        const t = i / SR;
        lp1 = 0.96 * lp1 + 0.04 * rand();
        lp2 = 0.94 * lp2 + 0.06 * lp1;
        buf[i] = lp2 * 1.3 * (0.55 + 0.45 * Math.sin(2 * Math.PI * t / 6.0));
      }
      const chimes = [[0.7, 587.33, 0.3], [1.2, 880, 0.2], [4.3, 659.25, 0.28], [4.9, 783.99, 0.24], [8.8, 987.77, 0.2], [12.5, 587.33, 0.28], [15.4, 880, 0.22]];
      for (const [st, f, a] of chimes) {
        const s = Math.floor(st * SR), n = Math.floor(4.2 * SR);
        for (let i = 0; i < n && s + i < totalSamples; i++) {
          const t = i / SR;
          const env = Math.min(1, t / 0.02) * Math.exp(-t * 0.9);
          buf[s + i] += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.exp(-t * 1.8) * Math.sin(2 * Math.PI * f * 2.41 * t)) * env * a;
        }
      }
      addBell(1.5, 110, 0.18, 10);
    } else if (track === 'zen_gayageum') {
      for (let i = 0; i < totalSamples; i++) {
        const t = i / SR;
        const sw = 0.65 + 0.35 * Math.sin(2 * Math.PI * t / 10);
        buf[i] = 0.085 * sw * (Math.sin(2 * Math.PI * 146.83 * t) + 0.52 * Math.sin(2 * Math.PI * 220 * t));
      }
      const notes = [[0.4, 293.66, 0.4], [2.2, 329.63, 0.35], [4.0, 392, 0.38], [6.2, 440, 0.42], [8.6, 392, 0.35], [10.4, 329.63, 0.33], [12.4, 293.66, 0.42], [15.0, 220, 0.38], [17.2, 293.66, 0.38]];
      for (const [st, f, a] of notes) {
        const s = Math.floor(st * SR), n = Math.floor(4.2 * SR);
        for (let i = 0; i < n && s + i < totalSamples; i++) {
          const t = i / SR;
          const atk = Math.min(1, t / 0.025);
          const fv = f * (1 + 0.003 * Math.sin(2 * Math.PI * 4.2 * t) * Math.min(1, t / 0.5));
          buf[s + i] += (Math.exp(-t * 0.75) * Math.sin(2 * Math.PI * fv * t) + 0.38 * Math.exp(-t * 1.5) * Math.sin(2 * Math.PI * fv * 2 * t)) * atk * a;
        }
      }
    } else {
      for (let i = 0; i < totalSamples; i++) {
        const t = i / SR;
        const sw = 0.7 + 0.3 * Math.sin(2 * Math.PI * t / 10);
        buf[i] = 0.09 * sw * (Math.sin(2 * Math.PI * 110 * t) + 0.45 * Math.sin(2 * Math.PI * 164.81 * t));
      }
      addBell(0.2, 98, 0.52, 12.5);
      addBowl(2.0, 220, 0.42, 9.5);
      addBowl(7.2, 261.63, 0.38, 9.0);
      addBowl(12.2, 196, 0.44, 7.8);
    }

    const fadeN = Math.floor(SR * 1.0);
    const outLen = totalSamples - fadeN;
    let peak = 0;
    for (let i = 0; i < outLen; i++) {
      if (i < fadeN) {
        const k = i / fadeN;
        buf[i] = buf[i] * k + buf[outLen + i] * (1 - k);
      }
      const a = Math.abs(buf[i]);
      if (a > peak) peak = a;
    }
    const scale = 0.72 / (peak || 1);

    const dataBytes = outLen * 2;
    const wav = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(wav);
    const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeStr(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SR, true);
    view.setUint32(28, SR * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataBytes, true);
    for (let i = 0; i < outLen; i++) {
      const s = Math.max(-1, Math.min(1, buf[i] * scale));
      view.setInt16(44 + i * 2, Math.round(s * 32767), true);
    }
    return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  }

  class BuddhistSoundEngine {
    constructor() {
      this.audio = null;
      this.fadeTimer = null;
      this.playing = false;
      this.track = 'singing_bowl';
      this.volume = 0.6;
      this.listeners = [];
      this.blobUrls = {};
    }
    onChange(fn) { this.listeners.push(fn); }
    _notify() { this.listeners.forEach((fn) => { try { fn(this.playing, this.track); } catch {} }); }
    getTrackLabel(track) { return TRACK_LABELS[track || this.track] || '불교 명상 음악'; }
    isPlaying() { return this.playing; }
    _ensureAudio(track) {
      const t = track || this.track || 'singing_bowl';
      if (!this.blobUrls[t]) this.blobUrls[t] = buildWavBlobUrl(t);
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.loop = true;
        this.audio.preload = 'auto';
        this.audio.playsInline = true;
      }
      if (this.audio.src !== this.blobUrls[t]) {
        this.audio.src = this.blobUrls[t];
        this.audio.load();
      }
      return this.audio;
    }
    preload(track) {
      const t = track || this.track || 'singing_bowl';
      if (t !== 'mute') { this.track = t; this._ensureAudio(t); }
    }
    _clearFade() { if (this.fadeTimer) { clearInterval(this.fadeTimer); this.fadeTimer = null; } }
    setVolume(percent) {
      this.volume = Math.max(0.15, Math.min(1, Number(percent) / 100));
      if (this.audio && this.playing && !this.fadeTimer) this.audio.volume = this.volume;
    }
    setTrack(track) {
      const n = track || 'singing_bowl';
      this.track = n;
      if (n === 'mute') return this.stop();
      if (this.playing) this.start(n, Math.round(this.volume * 100));
      else this._notify();
    }
    start(track, volumePercent) {
      if (track) this.track = track;
      if (volumePercent !== undefined) this.volume = Math.max(0.15, Math.min(1, Number(volumePercent) / 100));
      if (this.track === 'mute') { this.stop(); return Promise.resolve(false); }
      const audio = this._ensureAudio(this.track);
      this._clearFade();
      audio.volume = Math.min(this.volume, 0.28);
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        return p.then(() => {
          this.playing = true; this._fadeTo(this.volume, 1100); this._notify(); return true;
        }).catch(() => {
          this.playing = false; this._notify(); return false;
        });
      }
      this.playing = true; this._fadeTo(this.volume, 1100); this._notify();
      return Promise.resolve(true);
    }
    _fadeTo(targetVol, durationMs, onDone) {
      if (!this.audio) return;
      this._clearFade();
      const steps = 20, stepMs = Math.max(25, Math.round(durationMs / steps)), startVol = this.audio.volume;
      let count = 0;
      this.fadeTimer = setInterval(() => {
        count += 1;
        const k = Math.min(1, count / steps);
        try { this.audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * k)); } catch {}
        if (k >= 1) { this._clearFade(); if (onDone) onDone(); }
      }, stepMs);
    }
    stop() {
      this.playing = false; this._notify();
      if (this.audio) this._fadeTo(0, 500, () => { try { this.audio.pause(); } catch {} });
    }
    toggle(track, volumePercent) {
      if (this.playing) { this.stop(); return false; }
      return this.start(track || this.track, volumePercent);
    }
  }
  global.DharmaSoundEngine = new BuddhistSoundEngine();
})(window);