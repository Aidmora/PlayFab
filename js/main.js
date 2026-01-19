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

  if (window.gameInterval) clearInterval(window.gameInterval);
  if (window.activeCpuGameInstance) {
    window.activeCpuGameInstance.destroy();
    window.activeCpuGameInstance = null;
  }
  document.getElementById('mlToggle').checked = false;

  gameArea.innerHTML = '';
  gameArea.innerHTML += `
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

  overlay.classList.add('active');
  if (title) title.innerText = type.toUpperCase();

  // Música del juego (crossfade desde lobby)
  withAudio((am) => am.playGameTrack(type));

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
['pointerdown', 'keydown', 'touchstart', 'click'].forEach(evt => {
  window.addEventListener(evt, unlockAudioByInput, { once: true, capture: true });
});

// Mute button setup
const muteBtn = document.getElementById("muteBtn");

function updateMuteButton() {
  if (!muteBtn) return;
  const am = window.audioManager;
  const muted = am?.isMuted ?? false;
  
  muteBtn.classList.toggle("muted", muted);
  const icon = muteBtn.querySelector('.mi-icon');
  if (icon) icon.textContent = muted ? '🔇' : '🔊';
}

// Inicializa el estado del botón
updateMuteButton();

if (muteBtn) {
  muteBtn.addEventListener("click", async () => {
    const am = window.audioManager;
    if (!am) return;

    // Si aún no se desbloqueó y está muteado, primero desbloquea
    if (!am.unlocked && am.isMuted) {
      am.isMuted = false;
      localStorage.setItem("muted", "false");
      await am.unlockAndPrime();
      am.startLobbyNow();
    } else {
      am.toggleMute();
    }
    
    updateMuteButton();
    setSettingsMenuOpen(false);
  });
}

// ---- Splash ----
window.addEventListener("load", () => {
  const loader = document.getElementById("retro-loader");
  if (!loader) {
    // Sin loader, marca splash como terminado
    withAudio((am) => am.startLobbyNow());
    return;
  }

  const MIN_LOADING_TIME = 1400;
  const start = performance.now();

  const finishLoading = () => {
    loader.style.transition = "opacity 700ms ease";
    loader.style.opacity = "0";

    setTimeout(() => {
      loader.remove();
      // Marca splash como terminado e inicia lobby si ya se desbloqueó
      withAudio((am) => am.startLobbyNow());
    }, 700);
  };

  const elapsed = performance.now() - start;
  const remaining = MIN_LOADING_TIME - elapsed;

  if (remaining > 0) {
    setTimeout(finishLoading, remaining);
  } else {
    finishLoading();
  }
});