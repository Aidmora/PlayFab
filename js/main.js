/* ==================================================
   MAIN (UI + NAVEGACION + OVERLAY)
   Mantiene la lógica original 1:1
   ================================================== */

// Estado del carrusel
let currentIndex = 0;
let currentListId = 'list-minigames';

// Controles UI
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playBtn = document.getElementById('playBtn');

// Timers / Instancias globales para minijuegos
// (necesario para conservar el flujo actual)
window.gameInterval = null;
window.activeCpuGameInstance = null;

// ---- Navegación por categorías (Minijuegos / Pro) ----
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

// ---- Botón JUGAR ----
playBtn.addEventListener('click', () => {
  const cards = getActiveCards();
  const name = cards[currentIndex].querySelector('h3').innerText.toLowerCase();

  if (currentListId === 'list-pro') return alert("¡BLOQUEADO!");

  if (name.includes('pong')) window.playMinigame('pong');
  else if (name.includes('snake')) window.playMinigame('snake');
  else if (name.includes('cpu')) window.playMinigame('cpu');
});

// ---- Toggle ML (solo CPU Defender) ----
window.toggleMLMode = function () {
  if (window.activeCpuGameInstance) {
    setTimeout(() => {
      window.activeCpuGameInstance.setMLMode(document.getElementById('mlToggle').checked);
    }, 50);
  }
};

// ---- Abrir Minijuego (Overlay) ----
window.playMinigame = function (type) {
  const overlay = document.getElementById('game-overlay');
  const gameArea = document.getElementById('game-area');
  const title = document.getElementById('game-title');

  // Limpieza de juego anterior (idéntico al original)
  if (window.gameInterval) clearInterval(window.gameInterval);
  if (window.activeCpuGameInstance) {
    window.activeCpuGameInstance.destroy();
    window.activeCpuGameInstance = null;
  }
  document.getElementById('mlToggle').checked = false;

  // Reset del área + overlays internos (idéntico al original)
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

  // Mostrar / ocultar switch ML según el juego
  if (type === 'cpu') {
    document.querySelector('.ml-switch-container').style.display = 'flex';
    // startCpuDefender debe existir (definido en js/cpuDefender/cpuDefender.js)
    startCpuDefender();
  } else {
    document.querySelector('.ml-switch-container').style.display = 'none';

    // startSnake / startPong deben existir (definidos en js/snake.js y js/pong.js)
    if (type === 'snake') startSnake();
    if (type === 'pong') startPong();
  }
};

// ---- Cerrar overlay y limpiar ----
window.closeMinigame = function () {
  if (window.gameInterval) clearInterval(window.gameInterval);
  if (window.activeCpuGameInstance) {
    window.activeCpuGameInstance.destroy();
    window.activeCpuGameInstance = null;
  }

  document.getElementById('game-area').innerHTML = '';
  document.getElementById('game-overlay').classList.remove('active');
};


// ---- AUDIO ARCADE ----
document.addEventListener("click", () => {
    audioManager.playOnce();
}, { once: true });
const muteBtn = document.getElementById("muteBtn");

// Estado inicial
if (audioManager.isMuted) {
  muteBtn.classList.add("muted");
}

muteBtn.addEventListener("click", () => {
  const muted = audioManager.toggleMute();
  muteBtn.classList.toggle("muted", muted);
});



// ---- CARGADOR RETRO ----
window.addEventListener("load", () => {
    const loader = document.getElementById("retro-loader");

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
const beep = new Audio("audio/beep.mp3");
beep.volume = 0.2;

setInterval(() => {
    if (document.querySelector(".progress")) {
        beep.currentTime = 0;
        beep.play().catch(()=>{});
    }
}, 600);


