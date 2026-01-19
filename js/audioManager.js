// js/audioManager.js

class AudioManager {
  constructor() {
    // ===== Música lobby (Arcade) =====
    this.lobby = new Audio("audio/arcade.mp3");
    this.lobby.loop = true;
    this.lobby.volume = 0.5;

    // ===== Música por juego (se asigna dinámicamente) =====
    this.game = new Audio(); // src se setea al entrar a un juego
    this.game.loop = true;
    this.game.volume = 0.5;

    // Track actual
    this.currentGameType = null;

    // Estado de mute persistente
    this.isMuted = localStorage.getItem("muted") === "true";
    this.lobby.muted = this.isMuted;
    this.game.muted = this.isMuted;

    // Para evitar múltiples starts por autoplay policies
    this.musicStarted = false;

    // Mapa de temas por juego (ajusta nombres si tus mp3 se llaman distinto)
    this.gameTracks = {
      pong: "audio/pong.mp3",
      snake: "audio/snake.mp3",
      cpu: "audio/cpu.mp3"
    };
  }

  // =========================
  // Lobby
  // =========================
  playLobby() {
    // detener música del juego si está sonando
    this.stopGame();

    // si ya estaba sonando lobby, no reinicies
    if (!this.lobby.paused) return;

    this.lobby.currentTime = 0;
    this.lobby.play().catch(() => {});
  }

  // Compatibilidad con tu main.js actual:
  // playOnce() ahora arranca el lobby (una sola vez)
  playOnce() {
    if (!this.musicStarted) {
      this.musicStarted = true;
      this.playLobby();
    }
  }

  // =========================
  // Game music
  // =========================
  playGameTrack(type) {
    this.currentGameType = type;

    // Pausar lobby
    if (!this.lobby.paused) {
      this.lobby.pause();
      this.lobby.currentTime = 0;
    }

    // Setear el track del juego
    const src = this.gameTracks[type] || this.gameTracks.cpu || "audio/arcade.mp3";

    // Si cambia de juego, reinicia el audio del juego
    if (this.game.src !== new URL(src, window.location.href).href) {
      this.game.pause();
      this.game.src = src;
      this.game.load();
    }

    this.game.currentTime = 0;
    this.game.play().catch(() => {
      // Si el browser bloquea autoplay, no rompemos nada.
      // Se iniciará en el primer click (tu main.js ya dispara playOnce).
    });
  }

  stopGame() {
    if (!this.game.paused) this.game.pause();
    this.game.currentTime = 0;
    this.currentGameType = null;
  }

  // Al cerrar juego: vuelve el lobby
  returnToLobby() {
    this.stopGame();
    this.playLobby();
  }

  // =========================
  // Mute global
  // =========================
  toggleMute() {
    this.isMuted = !this.isMuted;

    this.lobby.muted = this.isMuted;
    this.game.muted = this.isMuted;

    localStorage.setItem("muted", this.isMuted);
    return this.isMuted;
  }

  setMute(forceMuted) {
    this.isMuted = !!forceMuted;

    this.lobby.muted = this.isMuted;
    this.game.muted = this.isMuted;

    localStorage.setItem("muted", this.isMuted);
    return this.isMuted;
  }
}

// UNA sola instancia global
const audioManager = new AudioManager();
