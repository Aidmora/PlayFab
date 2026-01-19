/* ==================================================
   MAIN
   - Desbloquea audio al primer click/tecla
   - Lobby suena al terminar splash (si ya se desbloqueó)
   - Al JUGAR: crossfade a música del juego
   ================================================== */

let currentIndex = 0;
let currentListId = 'list-minigames';

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playBtn = document.getElementById('playBtn');

const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const openHelpBtn = document.getElementById('openHelpBtn');

window.gameInterval = null;
window.activeCpuGameInstance = null;

/* ==================================================
   INTRO POR JUEGO (UI) - SOLO DISEÑO
   ================================================== */
window.__gameIntroTimeout = null;
window.__gameRunToken = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getGameIntroLabel(type) {
  if (type === 'pong') return 'PONG';
  if (type === 'snake') return 'SNAKE';
  return 'CPU DEFENDER';
}

function ensureGameAreaUI(gameArea) {
  // (Re)inyecta overlays UI necesarios si fueron limpiados.
  // Incluye el overlay de intro por juego.
  if (!gameArea) return;

  gameArea.innerHTML = `
    <div id="game-intro" class="game-intro" aria-hidden="true">
      <div class="game-intro-inner">
        <div class="game-intro-kicker">PREPÁRATE</div>
        <h1 id="game-intro-title" class="game-intro-title">JUEGO</h1>
        <div class="game-intro-sub">INICIANDO...</div>
      </div>
    </div>

    <div id="challenge-announcement" class="challenge-overlay" style="display: none;">
      <h1 class="glitch-text" id="announcement-title">CPU OVERDRIVE</h1>
      <p id="announcement-subtitle">AI DIFFICULTY ENABLED</p>
    </div>

    <div id="ai-loading" class="challenge-overlay" style="display: none; background: #000; z-index: 500;">
      <div class="spinner"></div>
      <p id="loading-text" style="margin-top: 20px; color: #00ff00; font-family: 'Courier Prime'; text-align:center;">
        CARGANDO CEREBRO...
      </p>
    </div>
  `;
}

async function showGameIntro(type) {
  // Limpia timeout anterior
  if (window.__gameIntroTimeout) {
    clearTimeout(window.__gameIntroTimeout);
    window.__gameIntroTimeout = null;
  }

  const intro = document.getElementById('game-intro');
  const introTitle = document.getElementById('game-intro-title');

  if (!intro || !introTitle) {
    // Si no existe por cualquier razón, no bloqueamos inicio.
    return;
  }

  introTitle.textContent = getGameIntroLabel(type);

  intro.classList.add('active');
  intro.setAttribute('aria-hidden', 'false');

  // Tiempo de “pantalla grande”
  await sleep(1100);

  // Oculta overlay
  intro.classList.remove('active');
  intro.setAttribute('aria-hidden', 'true');
}

function withAudio(fn) {
  const am = window.audioManager;
  if (am) return fn(am);
  return null;
}

// ---- Categorías ----
window.switchCategory = function (c, b) {
  currentIndex = 0;

  document.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');

  document.querySelectorAll('.game-display').forEach(l => l.classList.remove('active-list'));

  currentListId = (c === 'minigames') ? 'list-minigames' : 'list-pro';
  document.getElementById(currentListId).classList.add('active-list');

  updateGallery();
};

function updateGallery() {
  document.getElementById(currentListId).style.transform = `translateX(${currentIndex * -100}%)`;
}

function getActiveCards() {
  return document.getElementById(currentListId).querySelectorAll('.game-card');
}

nextBtn.onclick = () => {
  const c = getActiveCards();
  currentIndex = (currentIndex < c.length - 1) ? currentIndex + 1 : 0;
  updateGallery();
};

prevBtn.onclick = () => {
  const c = getActiveCards();
  currentIndex = (currentIndex > 0) ? currentIndex - 1 : c.length - 1;
  updateGallery();
};

// ---- Toggle ML CPU ----
window.toggleMLMode = function () {
  if (window.activeCpuGameInstance) {
    setTimeout(() => {
      window.activeCpuGameInstance.setMLMode(document.getElementById('mlToggle').checked);
    }, 50);
  }
};

// ---- Abrir Minijuego ----
window.playMinigame = async function (type) {
  const overlay = document.getElementById('game-overlay');
  const gameArea = document.getElementById('game-area');
  const title = document.getElementById('game-title');

  // Token para evitar que arranque el juego si el usuario cierra antes de tiempo
  const runToken = Date.now();
  window.__gameRunToken = runToken;

  if (window.gameInterval) clearInterval(window.gameInterval);
  if (window.activeCpuGameInstance) {
    window.activeCpuGameInstance.destroy();
    window.activeCpuGameInstance = null;
  }
  document.getElementById('mlToggle').checked = false;

  // Reinyecta UI del overlay (intro + loaders)
  ensureGameAreaUI(gameArea);

  overlay.classList.add('active');
  if (title) title.innerText = type.toUpperCase();

  // Música del juego (crossfade desde lobby)
  withAudio((am) => am.playGameTrack(type));

  // UI: mostrar intro ANTES de iniciar el juego
  await showGameIntro(type);

  // Si se cerró o se inició otro juego durante la intro, aborta
  if (window.__gameRunToken !== runToken) return;
  if (!overlay.classList.contains('active')) return;

  // Luego de intro, inicia la lógica del juego (SIN cambiar lógica interna)
  if (type === 'cpu') {
    document.querySelector('.ml-switch-container').style.display = 'flex';
    startCpuDefender();
  } else {
    document.querySelector('.ml-switch-container').style.display = 'none';
    if (type === 'snake') startSnake();
    if (type === 'pong') startPong();
  }
};

// ---- Cerrar ----
window.closeMinigame = function () {
  // Cancela cualquier inicio pendiente por intro
  window.__gameRunToken = 0;
  if (window.__gameIntroTimeout) {
    clearTimeout(window.__gameIntroTimeout);
    window.__gameIntroTimeout = null;
  }

  if (window.gameInterval) clearInterval(window.gameInterval);
  if (window.activeCpuGameInstance) {
    window.activeCpuGameInstance.destroy();
    window.activeCpuGameInstance = null;
  }

  document.getElementById('game-area').innerHTML = '';
  document.getElementById('game-overlay').classList.remove('active');

  // Vuelve al lobby
  withAudio((am) => am.returnToLobby());
};

// ---- Botón JUGAR ----
playBtn.addEventListener('click', () => {
  const cards = getActiveCards();
  const name = cards[currentIndex].querySelector('h3').innerText.toLowerCase();

  if (currentListId === 'list-pro') return alert("¡BLOQUEADO!");

  if (name.includes('pong')) window.playMinigame('pong');
  else if (name.includes('snake')) window.playMinigame('snake');
  else if (name.includes('cpu')) window.playMinigame('cpu');
});

// ==================================================
//  Menú ⚙
// ==================================================
function setSettingsMenuOpen(open) {
  if (!settingsMenu) return;
  settingsMenu.classList.toggle('open', open);
  settingsMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
}
function isSettingsMenuOpen() {
  return !!(settingsMenu && settingsMenu.classList.contains('open'));
}

if (settingsBtn && settingsMenu) {
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setSettingsMenuOpen(!isSettingsMenuOpen());
  });

  document.addEventListener('click', (e) => {
    if (!isSettingsMenuOpen()) return;
    const wrapper = settingsBtn.closest('.settings-wrapper');
    if (wrapper && !wrapper.contains(e.target)) setSettingsMenuOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSettingsMenuOpen()) setSettingsMenuOpen(false);
  });
}

if (openHelpBtn) {
  openHelpBtn.addEventListener('click', () => {
    setSettingsMenuOpen(false);
    if (typeof openTutorial === 'function') openTutorial();
    else document.getElementById('tutorial-overlay')?.classList.add('active');
  });
}

// ==================================================
//  AUDIO: desbloqueo automático al primer input
// ==================================================
let audioUnlockAttempted = false;

async function unlockAudioByInput() {
  if (audioUnlockAttempted) return;
  audioUnlockAttempted = true;

  const am = window.audioManager;
  if (!am) return;

  const unlocked = await am.unlockAndPrime();
  
  if (unlocked) {
    // Si el splash ya terminó, inicia lobby ahora
    am.startLobbyNow();
  }
}

// Captura cualquier interacción del usuario
window.addEventListener("pointerdown", unlockAudioByInput, { once: true, capture: true });
window.addEventListener("keydown", unlockAudioByInput, { once: true, capture: true });
window.addEventListener("touchstart", unlockAudioByInput, { once: true, capture: true });

const muteBtn = document.getElementById("muteBtn");

// Estado inicial
if (muteBtn && audioManager.isMuted) {
  muteBtn.classList.add("muted");
}

if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    const muted = audioManager.toggleMute();
    muteBtn.classList.toggle("muted", muted);

    // opcional: cambiar iconito 🔊/🔇 si lo usas en HTML
    const icon = muteBtn.querySelector('.mi-icon');
    if (icon) icon.textContent = muted ? '🔇' : '🔊';

    // cerrar menú luego de click (queda más limpio)
    setSettingsMenuOpen(false);
  });
}

// ---- CARGADOR RETRO ----
window.addEventListener("load", () => {
  const loader = document.getElementById("retro-loader");
  if (!loader) return;

  const MIN_LOADING_TIME = 2500; // Tiempo mínimo de carga en ms
  const start = performance.now();

  const finishLoading = () => {
    loader.style.transition = "opacity 1.5s ease";
    loader.style.opacity = 0;

    setTimeout(() => {
      loader.remove();
      audioManager?.playOnce();
    }, 1500);
  };

  const elapsed = performance.now() - start;
  const remaining = MIN_LOADING_TIME - elapsed;

  if (remaining > 0) {
    setTimeout(finishLoading, remaining);
  } else {
    finishLoading();
  }
});

// Beep del loader (si existe .progress)
const beep = new Audio("audio/beep.mp3");
beep.volume = 0.2;

setInterval(() => {
  if (document.querySelector(".progress")) {
    beep.currentTime = 0;
    beep.play().catch(() => {});
  }
}, 600);
