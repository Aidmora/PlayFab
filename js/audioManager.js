// js/audioManager.js

class AudioManager {
    constructor() {
        this.music = new Audio("audio/arcade.mp3");
        this.music.loop = true;       // 🔁 bucle infinito
        this.music.volume = 0.5;

        // Estado de mute persistente
        this.isMuted = localStorage.getItem("muted") === "true";
        this.music.muted = this.isMuted;
    }

    playOnce() {
        if (!this.musicStarted) {
            this.musicStarted = true;
            this.music.play().catch(() => {});
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.music.muted = this.isMuted;
        localStorage.setItem("muted", this.isMuted);
        return this.isMuted;
    }
}

// UNA sola instancia global
const audioManager = new AudioManager();
