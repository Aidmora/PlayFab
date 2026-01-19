/* ==================================================
   MAIN.JS
   - Soporte completo para ARCADE/GAMEPAD
   - Palanca: navegar juegos
   - SELECT: jugar
   - X: cerrar juego
   - START: iniciar desde splash
   - Audio solo con START/ESPACIO en splash
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
   GAMEPAD / ARCADE SUPPORT
   ================================================== */
window.gamepadState = {
  connected: false,
  buttons: {},
  axes: { x: 0, y: 0 }
};

// Mapeo de botones del arcade
const ARCADE_BUTTONS = {
  X: 0,
  A: 1,
  B: 2,
  Y: 3,
  L: 4,
  R: 5,
  SELECT: 8,
  START: 9
};

// Estado previo para detectar "just pressed"
let prevButtonState = {};
let prevAxisState = { left: false, right: false, up: false, down: false };

// Detectar gamepad conectado
window.addEventListener('gamepadconnected', (e) => {
  console.log('🎮 Arcade conectado:', e.gamepad.id);
  window.gamepadState.connected = true;
});

window.addEventListener('gamepaddisconnected', (e) => {
  console.log('🎮 Arcade desconectado');
  window.gamepadState.connected = false;
});

// Función para verificar si un botón fue RECIÉN presionado
function isButtonJustPressed(buttonIndex) {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0];
  if (!gp) return false;
  
  const isPressed = gp.buttons[buttonIndex]?.pressed || false;
  const wasPressed = prevButtonState[buttonIndex] || false;
  
  return isPressed && !wasPressed;
}

// Función para verificar si un eje fue RECIÉN movido
function isAxisJustMoved(direction) {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0];
  if (!gp) return false;
  
  let isActive = false;
  switch(direction) {
    case 'left': isActive = gp.axes[0] < -0.5; break;
    case 'right': isActive = gp.axes[0] > 0.5; break;
    case 'up': isActive = gp.axes[1] < -0.5; break;
    case 'down': isActive = gp.axes[1] > 0.5; break;
  }
  
  const wasActive = prevAxisState[direction] || false;
  return isActive && !wasActive;
}

// Actualizar estado previo
function updatePrevState() {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0];
  if (!gp) return;
  
  // Botones
  for (let i = 0; i < gp.buttons.length; i++) {
    prevButtonState[i] = gp.buttons[i]?.pressed || false;
  }
  
  // Ejes
  prevAxisState.left = gp.axes[0] < -0.5;
  prevAxisState.right = gp.axes[0] > 0.5;
  prevAxisState.up = gp.axes[1] < -0.5;
  prevAxisState.down = gp.axes[1] > 0.5;
}

// Loop principal del gamepad
function gamepadLoop() {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0];
  
  if (gp) {
    const loader = document.getElementById('retro-loader');
    const gameOverlay = document.getElementById('game-overlay');
    const isInGame = gameOverlay && gameOverlay.classList.contains('active');
    const isInSplash = loader && loader.style.opacity !== '0';
    
    // === SPLASH: START para comenzar ===
    if (isInSplash) {
      if (isButtonJustPressed(ARCADE_BUTTONS.START)) {
        skipSplashAndStart();
      }
    }
    // === EN JUEGO ===
    else if (isInGame) {
      // X para cerrar/salir del juego
      if (isButtonJustPressed(ARCADE_BUTTONS.X)) {
        window.closeMinigame();
      }
    }
    // === EN MENÚ PRINCIPAL ===
    else {
      // Palanca izquierda/derecha para navegar juegos
      if (isAxisJustMoved('left')) {
        prevBtn.click();
      }
      if (isAxisJustMoved('right')) {
        nextBtn.click();
      }
      
      // SELECT o START para jugar
      if (isButtonJustPressed(ARCADE_BUTTONS.SELECT) || isButtonJustPressed(ARCADE_BUTTONS.START)) {
        playBtn.click();
      }
      
      // A para abrir menú de ayuda
      if (isButtonJustPressed(ARCADE_BUTTONS.A)) {
        if (isSettingsMenuOpen()) {
          // Si el menú está abierto, A abre tutorial
          openHelpBtn?.click();
        } else {
          settingsBtn?.click();
        }
      }
      
      // B para cerrar menú
      if (isButtonJustPressed(ARCADE_BUTTONS.B)) {
        if (isSettingsMenuOpen()) {
          setSettingsMenuOpen(false);
        }
      }
    }
  }
  
  updatePrevState();
  requestAnimationFrame(gamepadLoop);
}

// Iniciar loop del gamepad
requestAnimationFrame(gamepadLoop);

/* ==================================================
   INTRO POR JUEGO - ANIMACIÓN ARCADE
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
  if (!gameArea) return;

  gameArea.innerHTML = `
    <div id="game-intro" class="game-intro" aria-hidden="true">
      <div class="game-intro-decor left"></div>
      <div class="game-intro-decor right"></div>
      
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
  if (window.__gameIntroTimeout) {
    clearTimeout(window.__gameIntroTimeout);
    window.__gameIntroTimeout = null;
  }

  const intro = document.getElementById('game-intro');
  const introTitle = document.getElementById('game-intro-title');

  if (!intro || !introTitle) return;

  introTitle.textContent = getGameIntroLabel(type);

  intro.classList.add('active');
  intro.setAttribute('aria-hidden', 'false');

  await sleep(1400);

  intro.style.opacity = '0';
  intro.style.transform = 'scale(1.1)';
  intro.style.transition = 'opacity 300ms ease, transform 300ms ease';
  
  await sleep(300);

  intro.classList.remove('active');
  intro.setAttribute('aria-hidden', 'true');
  intro.style.opacity = '';
  intro.style.transform = '';
  intro.style.transition = '';
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

  const runToken = Date.now();
  window.__gameRunToken = runToken;

  if (window.gameInterval) clearInterval(window.gameInterval);
  if (window.activeCpuGameInstance) {
    window.activeCpuGameInstance.destroy();
    window.activeCpuGameInstance = null;
  }
  document.getElementById('mlToggle').checked = false;

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

  // Inicia la lógica del juego
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
//  AUDIO: SOLO con START (arcade) o ESPACIO (teclado) en SPLASH
// ==================================================
let audioStarted = false;
let splashSkipped = false;

// Función para saltar splash e iniciar audio
function skipSplashAndStart() {
  if (splashSkipped) return;
  splashSkipped = true;
  
  const loader = document.getElementById('retro-loader');
  if (loader) {
    // Efecto de apagado CRT
    loader.style.transition = "transform 0.3s ease-in, opacity 0.5s ease-out 0.2s";
    loader.style.transform = "scaleY(0.01)";
    loader.style.opacity = "0";

    setTimeout(() => {
      loader.remove();
      // Iniciar audio
      startAudioNow();
    }, 500);
  } else {
    startAudioNow();
  }
}

async function startAudioNow() {
  if (audioStarted) return;
  audioStarted = true;
  
  const am = window.audioManager;
  if (!am) return;
  
  const unlocked = await am.unlockAndPrime();
  if (unlocked) {
    am.startLobbyNow();
  }
}

// Escuchar ESPACIO en teclado para splash
document.addEventListener('keydown', (e) => {
  const loader = document.getElementById('retro-loader');
  const isInSplash = loader && loader.style.opacity !== '0';
  
  if (isInSplash && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    skipSplashAndStart();
  }
});

// Mute button
const muteBtn = document.getElementById("muteBtn");

function updateMuteButton() {
  if (!muteBtn) return;
  const am = window.audioManager;
  const muted = am?.isMuted ?? false;
  
  muteBtn.classList.toggle("muted", muted);
  const icon = muteBtn.querySelector('.mi-icon');
  if (icon) icon.textContent = muted ? '🔇' : '🔊';
}

// Esperar a que audioManager exista
setTimeout(updateMuteButton, 100);

if (muteBtn) {
  muteBtn.addEventListener("click", async () => {
    const am = window.audioManager;
    if (!am) return;

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

// ==================================================
//  🎮 SPLASH - Espera START o ESPACIO
// ==================================================
window.addEventListener("load", () => {
  const loader = document.getElementById("retro-loader");
  if (!loader) {
    // Sin loader, intentar iniciar audio
    startAudioNow();
    return;
  }

  // El splash NO se cierra automáticamente
  // Solo se cierra con START (arcade) o ESPACIO (teclado)
  
  // Timeout máximo de seguridad (10 segundos) por si no hay input
  setTimeout(() => {
    if (!splashSkipped) {
      skipSplashAndStart();
    }
  }, 10000);
});

// Beep del loader (opcional)
const beep = new Audio("audio/beep.mp3");
beep.volume = 0.15;

let beepInterval = setInterval(() => {
  const progress = document.querySelector(".progress");
  if (progress && !splashSkipped) {
    beep.currentTime = 0;
    beep.play().catch(() => {});
  } else if (splashSkipped) {
    clearInterval(beepInterval);
  }
}, 500);