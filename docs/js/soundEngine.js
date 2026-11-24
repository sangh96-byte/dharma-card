/**
 * Dharma Card — 조용한 불교 명상 음악 엔진 (HTML5 Audio 기반 · 안드로이드/카톡 브라우저 100% 호환)
 * 자체 제작된 무저작권 산사 범종·싱잉볼 / 산사 풍경·숲바람 / 고요한 선 명상 선율 WAV 트랙을 부드러운 페이드인으로 재생합니다.
 */
(function (global) {
  const TRACK_URLS = {
    singing_bowl: './audio/singing_bowl.wav',
    temple_wind: './audio/temple_wind.wav',
    zen_gayageum: './audio/zen_gayageum.wav',
  };

  const TRACK_LABELS = {
    singing_bowl: '싱잉볼 · 범종 여운',
    temple_wind: '산사 풍경 · 숲바람',
    zen_gayageum: '고요한 선(禪) 선율',
    mute: '무음',
  };

  class BuddhistSoundEngine {
    constructor() {
      this.audio = null;
      this.fadeTimer = null;
      this.playing = false;
      this.track = 'singing_bowl';
      this.volume = 0.55;
      this.listeners = [];
    }

    onChange(fn) {
      this.listeners.push(fn);
    }

    _notify() {
      this.listeners.forEach((fn) => {
        try { fn(this.playing, this.track); } catch {}
      });
    }

    getTrackLabel(track) {
      return TRACK_LABELS[track || this.track] || '불교 명상 음악';
    }

    isPlaying() {
      return this.playing;
    }

    _ensureAudio(track) {
      const url = TRACK_URLS[track] || TRACK_URLS.singing_bowl;
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.loop = true;
        this.audio.preload = 'auto';
        this.audio.playsInline = true;
      }
      const absUrl = new URL(url, window.location.href).href;
      if (this.audio.src !== absUrl) {
        this.audio.src = absUrl;
        this.audio.load();
      }
      return this.audio;
    }

    _clearFade() {
      if (this.fadeTimer) {
        clearInterval(this.fadeTimer);
        this.fadeTimer = null;
      }
    }

    setVolume(percent) {
      this.volume = Math.max(0.05, Math.min(1, Number(percent) / 100));
      if (this.audio && this.playing && !this.fadeTimer) {
        this.audio.volume = this.volume;
      }
    }

    setTrack(track) {
      const normalized = track || 'singing_bowl';
      const changed = this.track !== normalized;
      this.track = normalized;
      if (normalized === 'mute') {
        this.stop();
        return;
      }
      if (this.playing && changed) {
        this.start(normalized, Math.round(this.volume * 100));
      } else {
        this._notify();
      }
    }

    preload(track) {
      const normalized = track || this.track || 'singing_bowl';
      if (normalized === 'mute') return;
      this.track = normalized;
      this._ensureAudio(normalized);
    }

    start(track, volumePercent) {
      if (track) this.track = track;
      if (volumePercent !== undefined) {
        this.volume = Math.max(0.15, Math.min(1, Number(volumePercent) / 100));
      }
      if (this.track === 'mute') {
        this.stop();
        return Promise.resolve(false);
      }

      const audio = this._ensureAudio(this.track);
      this._clearFade();
      // 안드로이드/카톡 브라우저에서 즉시 또렷하게 들리도록 초기 볼륨 확보 후 부드럽게 상승
      audio.volume = Math.min(this.volume, 0.28);

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        return playPromise
          .then(() => {
            this.playing = true;
            this._fadeTo(this.volume, 1100);
            this._notify();
            return true;
          })
          .catch(() => {
            this.playing = false;
            this._notify();
            return false;
          });
      }
      this.playing = true;
      this._fadeTo(this.volume, 1100);
      this._notify();
      return Promise.resolve(true);
    }

    _fadeTo(targetVol, durationMs, onDone) {
      if (!this.audio) return;
      this._clearFade();
      const steps = 20;
      const stepMs = Math.max(25, Math.round(durationMs / steps));
      const startVol = this.audio.volume;
      let count = 0;
      this.fadeTimer = setInterval(() => {
        count += 1;
        const t = Math.min(1, count / steps);
        try {
          this.audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * t));
        } catch {}
        if (t >= 1) {
          this._clearFade();
          if (onDone) onDone();
        }
      }, stepMs);
    }

    stop() {
      this.playing = false;
      this._notify();
      if (this.audio) {
        this._fadeTo(0, 500, () => {
          try { this.audio.pause(); } catch {}
        });
      }
    }

    toggle(track, volumePercent) {
      if (this.playing) {
        this.stop();
        return false;
      }
      return this.start(track || this.track, volumePercent);
    }

    strikeSoftChime() {
      // WAV 루프 재생 시 카드 전환에 방해되지 않도록 유지
    }
  }

  global.DharmaSoundEngine = new BuddhistSoundEngine();
})(window);
