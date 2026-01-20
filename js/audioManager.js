// js/audioManager.js
// - Rutas robustas aunque index.html esté en /html/
// - Preload mejorado con promesas
// - Crossfade suave entre tracks
// - Expone window.audioManager

class AudioManager {
  constructor() {
    this.TARGET_VOL_LOBBY = 0.5;
    this.TARGET_VOL_GAME = 0.5;
    this.FADE_MS = 400;
    this.PRIME_VOL = 0.001;

    this.isMuted = localStorage.getItem("muted") === "true";
    this.unlocked = false;
    this.splashGone = false;
    this.preloaded = false;

    this.activeType = null; // null hasta que suene algo
    this.activeChannel = "A";

    // Rutas: si tu index está en /html/index.html -> ../audio/... resuelve bien a /audio/...
    const u = (rel) => new URL(rel, document.baseURI).toString();

    this.tracks = {
      lobby: u("../audio/arcade.mp3"),
      pong:  u("../audio/pong.mp3"),
      snake: u("../audio/snake.mp3"),
      cpu:   u("../audio/cpu.mp3"),
    };

    this.A = this._makeAudio();
    this.B = this._makeAudio();

    this._applyMuteTo(this.A);
    this._applyMuteTo(this.B);

    // Preload asíncrono
    this._preloadAll();
  }

  /* =========================
     PUBLIC API
     ========================= */

  async unlockAndPrime() {
    if (this.unlocked) return true;
    if (this.isMuted) return false;

    // Espera a que esté precargado el lobby
    await this._waitForPreload();

    // Prime: inicia lobby en canal A a volumen casi inaudible
    const ok = await this._startOnChannel(this.A, "lobby", this.PRIME_VOL);
    if (!ok) {
      // Marcar que necesita reintento - no bloquear futuros intentos
      console.warn("AudioManager: unlock failed, will retry on next user interaction");
      return false;
    }

    this.unlocked = true;
    this.activeType = "lobby";
    this.activeChannel = "A";

    // Si el splash ya se fue, sube el volumen inmediatamente
    if (this.splashGone) {
      this._fade(this.A, this.PRIME_VOL, this.TARGET_VOL_LOBBY, 200);
    }

    return true;
  }

  // Método para forzar el inicio del audio (llamado tras interacción del usuario)
  async forceStart() {
    if (this.isMuted) return false;

    // Reset del estado para permitir reintento
    this.unlocked = false;

    const ok = await this.unlockAndPrime();
    if (ok && this.splashGone) {
      this.startLobbyNow();
    }
    return ok;
  }

  playOnce() {
    return this.unlockAndPrime();
  }

  startLobbyNow() {
    this.splashGone = true;
    if (this.isMuted) return;

    // Si no está desbloqueado, intentar desbloquear
    if (!this.unlocked) {
      this.unlockAndPrime().then(ok => {
        if (ok) this._ensureLobbyPlaying();
      });
      return;
    }

    this._ensureLobbyPlaying();
  }

  _ensureLobbyPlaying() {
    const active = this._active();

    // Si ya está sonando lobby, solo sube el volumen
    if (this.activeType === "lobby" && !active.paused) {
      this._fade(active, active.volume, this.TARGET_VOL_LOBBY, 200);
      return;
    }

    // Si el canal activo está pausado pero debería ser lobby, reiniciarlo
    if (this.activeType === "lobby" && active.paused) {
      this._startOnChannel(active, "lobby", 0).then(ok => {
        if (ok) this._fade(active, 0, this.TARGET_VOL_LOBBY, 200);
      });
      return;
    }

    // Si no, crossfade a lobby
    this.crossfadeTo("lobby", this.TARGET_VOL_LOBBY, 200);
  }

  playGameTrack(type) {
    const key = (type === "pong" || type === "snake" || type === "cpu") ? type : "cpu";

    if (!this.unlocked || this.isMuted) {
      this.activeType = key; // Guardar para cuando se desmutee
      return;
    }

    this.crossfadeTo(key, this.TARGET_VOL_GAME, this.FADE_MS);
  }

  returnToLobby() {
    if (!this.unlocked || this.isMuted) {
      this.activeType = "lobby";
      return;
    }

    this.crossfadeTo("lobby", this.TARGET_VOL_LOBBY, this.FADE_MS);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem("muted", this.isMuted);

    this._applyMuteTo(this.A);
    this._applyMuteTo(this.B);

    if (this.isMuted) {
      // Para todo
      [this.A, this.B].forEach(a => {
        try { a.pause(); a.currentTime = 0; } catch {}
      });
    } else {
      // Vuelve a la pista que debería estar sonando
      if (this.unlocked && this.splashGone) {
        const type = this.activeType || "lobby";
        const vol = (type === "lobby") ? this.TARGET_VOL_LOBBY : this.TARGET_VOL_GAME;
        
        // Reinicia en el canal A
        this.activeChannel = "A";
        this._startOnChannel(this.A, type, 0).then(ok => {
          if (ok) this._fade(this.A, 0, vol, 300);
        });
      }
    }

    return this.isMuted;
  }

  crossfadeTo(type, targetVol = 0.5, fadeMs = 400) {
    if (this.isMuted) {
      this.activeType = type;
      return;
    }

    const current = this._active();
    const next = this._inactive();

    // Si ya está sonando exactamente este track, solo ajusta volumen
    if (this.activeType === type && !current.paused && current.src.includes(type === "lobby" ? "arcade" : type)) {
      this._fade(current, current.volume, targetVol, fadeMs);
      return;
    }

    // Prepara el siguiente canal con el nuevo track
    this._startOnChannel(next, type, 0.0).then((ok) => {
      if (!ok) return;

      // Fade in del nuevo
      this._fade(next, 0.0, targetVol, fadeMs);

      // Fade out del actual (si está sonando)
      if (!current.paused && current.volume > 0) {
        this._fade(current, current.volume, 0.0, fadeMs, () => {
          current.pause();
          current.currentTime = 0;
        });
      }

      // Actualiza estado
      this.activeType = type;
      this.activeChannel = (this.activeChannel === "A") ? "B" : "A";
    });
  }

  /* =========================
     INTERNALS
     ========================= */

  _makeAudio() {
    const a = new Audio();
    a.preload = "auto";
    a.loop = true;
    a.volume = 0.0;
    return a;
  }

  _applyMuteTo(audio) {
    audio.muted = this.isMuted;
  }

  _active() {
    return (this.activeChannel === "A") ? this.A : this.B;
  }

  _inactive() {
    return (this.activeChannel === "A") ? this.B : this.A;
  }

  async _preloadAll() {
    // PRIORIDAD: Precargar lobby (arcade.mp3) primero y en el canal A
    this.A.src = this.tracks.lobby;
    
    // Espera a que lobby esté listo (máximo 2s)
    await new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };

      this.A.addEventListener("canplaythrough", done, { once: true });
      this.A.addEventListener("error", done, { once: true });
      setTimeout(done, 2000);
      
      try { this.A.load(); } catch { done(); }
    });

    // Marca como precargado apenas lobby esté listo
    this.preloaded = true;

    // Precarga el resto en segundo plano (no bloquea)
    for (const [key, src] of Object.entries(this.tracks)) {
      if (key === "lobby") continue; // Ya está cargado
      
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = src;
      try { audio.load(); } catch {}
    }
  }

  _waitForPreload() {
    if (this.preloaded) return Promise.resolve();
    
    return new Promise((resolve) => {
      const check = () => {
        if (this.preloaded) resolve();
        else setTimeout(check, 30);
      };
      check();
      // Timeout máximo reducido
      setTimeout(resolve, 1500);
    });
  }

  async _startOnChannel(channel, type, initialVol) {
    if (this.isMuted) return false;

    const src = this.tracks[type] || this.tracks.lobby;
    const filename = src.split('/').pop();
    
    // Si ya tiene el src correcto, no recargues
    const alreadyLoaded = channel.src && channel.src.endsWith(filename);
    
    if (!alreadyLoaded) {
      channel.pause();
      channel.currentTime = 0;
      channel.src = src;
      
      // Espera a que esté listo
      await new Promise((resolve) => {
        const done = () => resolve();
        channel.addEventListener("canplaythrough", done, { once: true });
        channel.addEventListener("error", done, { once: true });
        setTimeout(done, 800);
        try { channel.load(); } catch { done(); }
      });
    }

    channel.volume = initialVol;

    try {
      await channel.play();
      return true;
    } catch (e) {
      console.warn("AudioManager: play failed", e);
      return false;
    }
  }

  _fade(audio, from, to, ms, onDone) {
    const start = performance.now();
    const dur = Math.max(50, ms);

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / dur);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * eased));

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        audio.volume = Math.max(0, Math.min(1, to));
        if (onDone) onDone();
      }
    };

    requestAnimationFrame(tick);
  }
}

// GLOBAL
window.audioManager = new AudioManager();