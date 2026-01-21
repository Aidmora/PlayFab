let currentIndex = 0;
let currentListId = 'list-minigames';

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playBtn = document.getElementById('playBtn');

const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const openHelpBtn = document.getElementById('openHelpBtn');
const arcadeHint = document.getElementById('arcadeHint');

window.gameInterval = null;
window.activeCpuGameInstance = null;

//Pantalla completa
function enterFullscreen() {
  const overlay = document.getElementById('game-overlay');
  if (!overlay) return;
  overlay.classList.add('fullscreen-mode');
  if (overlay.requestFullscreen) {
    overlay.requestFullscreen().catch(() => {});
  } else if (overlay.webkitRequestFullscreen) {
    overlay.webkitRequestFullscreen();
  } else if (overlay.msRequestFullscreen) {
    overlay.msRequestFullscreen();
  }
}

function exitFullscreen() {
  const overlay = document.getElementById('game-overlay');
  if (overlay) {
    overlay.classList.remove('fullscreen-mode');
  }

  if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

function handleFullscreenChange() {
  const overlay = document.getElementById('game-overlay');
  const isNativeFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);

  if (!isNativeFullscreen && overlay) {
    overlay.classList.remove('fullscreen-mode');
  }
}

//Gamepad
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

// Estado previo 
let prevButtonState = {};
let prevAxisState = { left: false, right: false, up: false, down: false };

// Detectar gamepad conectado
window.addEventListener('gamepadconnected', (e) => {
  console.log(' Arcade conectado:', e.gamepad.id);
  window.gamepadState.connected = true;
  if (arcadeHint) {
    arcadeHint.classList.add('visible');
  }
});

window.addEventListener('gamepaddisconnected', (e) => {
  console.log(' Arcade desconectado');
  window.gamepadState.connected = false;
  if (arcadeHint) {
    arcadeHint.classList.remove('visible');
  }
});

// Función para verificar si un botón fue Recién presionado
function isButtonJustPressed(buttonIndex) {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0];
  if (!gp) return false;
  
  const isPressed = gp.buttons[buttonIndex]?.pressed || false;
  const wasPressed = prevButtonState[buttonIndex] || false;
  
  return isPressed && !wasPressed;
}

// verificación del eje 
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
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    
    const isInGame = gameOverlay && gameOverlay.classList.contains('active');
    const isInSplash = loader && loader.style.opacity !== '0';
    const isTutorialOpen = tutorialOverlay && (tutorialOverlay.classList.contains('active') || tutorialOverlay.style.display === 'flex');
    const isMenuOpen = isSettingsMenuOpen();
    
    //SPLASH 
    if (isInSplash) {
      if (isButtonJustPressed(ARCADE_BUTTONS.START)) {
        skipSplashAndStart();
      }
    }
    else if (isTutorialOpen) {
      if (isButtonJustPressed(ARCADE_BUTTONS.X) || isButtonJustPressed(ARCADE_BUTTONS.B)) {
        window.closeTutorial();
      }
    }
    //Menú
    else if (isMenuOpen) {
      if (isButtonJustPressed(ARCADE_BUTTONS.R)) {
        setSettingsMenuOpen(false);
        window.openTutorial();
      }
      if (isButtonJustPressed(ARCADE_BUTTONS.B)) {
        muteBtn?.click();
      }
      if (isButtonJustPressed(ARCADE_BUTTONS.X) || isButtonJustPressed(ARCADE_BUTTONS.Y)) {
        setSettingsMenuOpen(false);
      }
    }
    //Juego
    else if (isInGame) {
      if (isButtonJustPressed(ARCADE_BUTTONS.X)) {
        window.closeMinigame();
      }
      if (isButtonJustPressed(ARCADE_BUTTONS.Y)) {
        window.openTutorial();
      }
    }
    // Menú principal 
    else {
      //Moven entre juegos
      if (isAxisJustMoved('left')) {
        prevBtn.click();
      }
      if (isAxisJustMoved('right')) {
        nextBtn.click();
      }

      // select para jugar
      if (isButtonJustPressed(ARCADE_BUTTONS.SELECT)) {
        playBtn.click();
      }

      // Y - Menú de ayuda
      if (isButtonJustPressed(ARCADE_BUTTONS.Y)) {
        setSettingsMenuOpen(!isSettingsMenuOpen());
      }
    }
  }
  
  updatePrevState();
  requestAnimationFrame(gamepadLoop);
}
requestAnimationFrame(gamepadLoop);

//Intro del juego 
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

function getGameControls(type) {
  if (type === 'pong') {
    return `
      <div class="game-controls">
        <div class="control-item">PALANCA / MOUSE: Mover paleta</div>
        <div class="control-item">W/S: Mover paleta</div>
        <div class="control-item">L: Activar/Desactivar IA</div>
        <div class="control-item">META: 5 puntos</div>
      </div>
    `;
  } else if (type === 'snake') {
    return `
      <div class="game-controls">
        <div class="control-item">PALANCA: Dirección</div>
        <div class="control-item">WASD: Dirección</div>
        <div class="control-item">L: Activar/Desactivar IA</div>
        <div class="control-item">OBJETIVO: Máxima puntuación</div>
      </div>
    `;
  } else {
    return `
      <div class="game-controls">
        <div class="control-item">PALANCA: Mover y esquivar</div>
        <div class="control-item">A: Disparar</div>
        <div class="control-item">B: Curar (si hay kit)</div>
        <div class="control-item">SOBREVIVE el mayor tiempo posible</div>
      </div>
    `;
  }
}

function ensureGameAreaUI(gameArea, gameType) {
  if (!gameArea) return;

  gameArea.innerHTML = `
    <div id="game-intro" class="game-intro" aria-hidden="true">
      <div class="game-intro-decor left"></div>
      <div class="game-intro-decor right"></div>

      <div class="game-intro-inner">
        <div class="game-intro-kicker">PREPÁRATE</div>
        <h1 id="game-intro-title" class="game-intro-title">JUEGO</h1>
        <div id="game-intro-controls" class="game-intro-controls"></div>
        <div class="game-intro-sub">
          <span class="blink-text">PRESIONA START PARA JUGAR</span>
        </div>
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
  const introControls = document.getElementById('game-intro-controls');

  if (!intro || !introTitle) return;

  introTitle.textContent = getGameIntroLabel(type);
  //Controles del juego
  if (introControls) {
    introControls.innerHTML = getGameControls(type);
  }

  intro.classList.add('active');
  intro.setAttribute('aria-hidden', 'false');

  //  START para continuar
  return new Promise((resolve) => {
    let resolved = false;
    let buttonWasReleased = false; 

    const checkGamepad = () => {
      if (resolved) return;

      const gamepads = navigator.getGamepads();
      const gp = gamepads[0];

      if (gp) {
        const startPressed = gp.buttons[ARCADE_BUTTONS.START]?.pressed || false;
        if (!startPressed && !buttonWasReleased) {
          buttonWasReleased = true;
        }
        if (startPressed && buttonWasReleased) {
          resolved = true;
          hideIntro();
          resolve();
          return;
        }
      }

      requestAnimationFrame(checkGamepad);
    };

    const handleKeyPress = (e) => {
      if (resolved) return;
      if (e.key === 'Enter' || e.key === ' ') {
        resolved = true;
        document.removeEventListener('keydown', handleKeyPress);
        hideIntro();
        resolve();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    requestAnimationFrame(checkGamepad);

    async function hideIntro() {
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
  });
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

// ML
window.currentGameIACallback = null;

window.toggleMLMode = function () {
  const mlToggle = document.getElementById('mlToggle');
  const isChecked = mlToggle ? mlToggle.checked : false;
  if (typeof window.currentGameIACallback === 'function') {
    window.currentGameIACallback(isChecked);
    return;
  }
  if (window.activeCpuGameInstance && typeof window.activeCpuGameInstance.setMLMode === 'function') {
    setTimeout(() => {
      window.activeCpuGameInstance.setMLMode(isChecked);
    }, 50);
  }
};

window.registerIACallback = function(callback) {
  window.currentGameIACallback = callback;
};

window.unregisterIACallback = function() {
  window.currentGameIACallback = null;
};

// Abrir Minijuego 
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

  ensureGameAreaUI(gameArea, type);

  overlay.classList.add('active');
  if (title) title.innerText = type.toUpperCase();

  // Activar fullscreen automáticamente
  enterFullscreen();

  // Ocultar botón de IA durante la intro
  const mlContainer = document.querySelector('.ml-switch-container');
  if (mlContainer) mlContainer.style.display = 'none';
  //Mostrar intro

  await showGameIntro(type);
  if (window.__gameRunToken !== runToken) return;
  if (!overlay.classList.contains('active')) return;
// Iniciar audio de juego
  withAudio((am) => am.playGameTrack(type));

  // Mostrar botón de IA
  if (type === 'pong' || type === 'snake') {
    if (mlContainer) mlContainer.style.display = 'flex';
  }

  // Inicia la lógica del juego
  if (type === 'cpu') {
    if (mlContainer) mlContainer.style.display = 'flex';
    startCpuDefender();
  } else {
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
  window.unregisterIACallback();
  exitFullscreen();

  const overlay = document.getElementById('game-overlay');
  document.getElementById('game-area').innerHTML = '';
  overlay.classList.remove('active');
  const mlToggle = document.getElementById('mlToggle');
  if (mlToggle) mlToggle.checked = false;

  withAudio((am) => am.returnToLobby());
};

// Botón JUGAR 
playBtn.addEventListener('click', () => {
  const cards = getActiveCards();
  const name = cards[currentIndex].querySelector('h3').innerText.toLowerCase();

  //  ARCADE PRO
  if (currentListId === 'list-pro') {
    if (name.includes('feed the monster')) {
      window.open('http://localhost:3000', '_blank');
    } else {
      alert("Juego Arcade Pro no disponible aún");
    }
    return;
  }

  //  MINIJUEGOS
  if (name.includes('pong')) window.playMinigame('pong');
  else if (name.includes('snake')) window.playMinigame('snake');
  else if (name.includes('cpu')) window.playMinigame('cpu');
});


// Menú
function setSettingsMenuOpen(open) {
  if (!settingsMenu) return;
  settingsMenu.classList.toggle('open', open);
  settingsMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (arcadeHint && window.gamepadState.connected) {
    if (open) {
      arcadeHint.classList.remove('visible');
    } else {
      arcadeHint.classList.add('visible');
    }
  }
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

//Audio solo cuando se presiona Start - Splash
let audioStarted = false;
let splashSkipped = false;
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
  } else {
    audioStarted = false;
  }
}

function retryAudioIfNeeded(e) {
  const am = window.audioManager;
  if (!am || am.isMuted) return;
  if (e && e.target) {
    const target = e.target;
    if (target.id === 'mlToggle' ||
        target.closest('.ml-switch-container') ||
        target.closest('#game-area') ||
        target.tagName === 'CANVAS') {
      return;
    }
  }

  if (splashSkipped && !am.unlocked) {
    am.forceStart();
  } else if (splashSkipped && am.unlocked) {
    const active = am._active();
    if (active && active.paused && am.activeType) {
      am._ensureLobbyPlaying();
    }
  }
}

document.addEventListener('click', retryAudioIfNeeded, { once: false });

document.addEventListener('keydown', (e) => {
  const loader = document.getElementById('retro-loader');
  const isInSplash = loader && loader.style.opacity !== '0';
  
  if (isInSplash && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    skipSplashAndStart();
  }
});

const muteBtn = document.getElementById("muteBtn");

function updateMuteButton() {
  if (!muteBtn) return;
  const am = window.audioManager;
  const muted = am?.isMuted ?? false;
  
  muteBtn.classList.toggle("muted", muted);
  const icon = muteBtn.querySelector('.mi-icon');
  if (icon) icon.textContent = muted ? '🔇' : '🔊';
}
setTimeout(updateMuteButton, 100);

if (muteBtn) {
  muteBtn.addEventListener("click", async () => {
    const am = window.audioManager;
    if (!am) return;

    if (!am.unlocked || am.isMuted) {
      // Si está muteado o no desbloqueado, forzar inicio
      am.isMuted = false;
      localStorage.setItem("muted", "false");
      am._applyMuteTo(am.A);
      am._applyMuteTo(am.B);
      await am.forceStart();
    } else {
      am.toggleMute();
    }

    updateMuteButton();
    setSettingsMenuOpen(false);
  });
}

// SPLASH - START
window.addEventListener("load", () => {
  const loader = document.getElementById("retro-loader");
  if (!loader) {
    startAudioNow();
    return;
  }
  setTimeout(() => {
    if (!splashSkipped) {
      skipSplashAndStart();
    }
  }, 10000);
});

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