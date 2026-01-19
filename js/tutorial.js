/* tutorial.js
   Maneja la lógica de la ventana modal de ayuda/instrucciones.

   ✅ Soporta:
   - Botón viejo: #helpBtn (aunque esté hidden)
   - Botón nuevo del menú: #openHelpBtn
   - Llamadas directas: openTutorial() / closeTutorial()
   - ARCADE: X o B para cerrar, R para abrir desde menú
*/

document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM
  const helpBtnLegacy = document.getElementById('helpBtn');
  const openHelpBtn = document.getElementById('openHelpBtn');
  const tutorialOverlay = document.getElementById('tutorial-overlay');
  const closeBtn = document.querySelector('.btn-close-tutorial');

  if (!tutorialOverlay) return;

  // --- Helpers de UI ---
  function showOverlay() {
    tutorialOverlay.style.display = 'flex';
    tutorialOverlay.classList.remove('fade-in');
    void tutorialOverlay.offsetWidth;
    tutorialOverlay.classList.add('fade-in');
    tutorialOverlay.setAttribute('aria-hidden', 'false');
    tutorialOverlay.classList.add('active');
  }

  function hideOverlay() {
    tutorialOverlay.style.display = 'none';
    tutorialOverlay.classList.remove('fade-in');
    tutorialOverlay.classList.remove('active');
    tutorialOverlay.setAttribute('aria-hidden', 'true');
  }

  // --- API global ---
  window.openTutorial = function () {
    showOverlay();
  };

  window.closeTutorial = function () {
    hideOverlay();
  };

  // --- Eventos de apertura ---
  if (helpBtnLegacy) {
    helpBtnLegacy.addEventListener('click', () => {
      showOverlay();
    });
  }

  if (openHelpBtn) {
    openHelpBtn.addEventListener('click', () => {
      showOverlay();
    });
  }

  // --- Eventos de cierre ---
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideOverlay();
    });
  }

  // Cerrar haciendo clic fuera del contenido
  tutorialOverlay.addEventListener('click', (e) => {
    if (e.target === tutorialOverlay) hideOverlay();
  });

  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    const isOpen = tutorialOverlay.style.display === 'flex' || tutorialOverlay.classList.contains('active');
    if (e.key === 'Escape' && isOpen) hideOverlay();
  });

  // ============================================
  // SOPORTE ARCADE/GAMEPAD
  // X (botón 0) o B (botón 2) para cerrar
  // ============================================
  const ARCADE_BUTTONS = {
    X: 0,
    B: 2
  };

  let prevButtonState = {};

  function isButtonJustPressed(gp, buttonIndex) {
    const isPressed = gp.buttons[buttonIndex]?.pressed || false;
    const wasPressed = prevButtonState[buttonIndex] || false;
    return isPressed && !wasPressed;
  }

  function updatePrevState(gp) {
    for (let i = 0; i < gp.buttons.length; i++) {
      prevButtonState[i] = gp.buttons[i]?.pressed || false;
    }
  }

  function tutorialGamepadLoop() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    
    if (gp) {
      const isOpen = tutorialOverlay.style.display === 'flex' || tutorialOverlay.classList.contains('active');
      
      if (isOpen) {
        // X o B para cerrar
        if (isButtonJustPressed(gp, ARCADE_BUTTONS.X) || isButtonJustPressed(gp, ARCADE_BUTTONS.B)) {
          hideOverlay();
        }
      }
      
      updatePrevState(gp);
    }
    
    requestAnimationFrame(tutorialGamepadLoop);
  }

  // Iniciar loop solo si hay soporte de gamepad
  if ('getGamepads' in navigator) {
    requestAnimationFrame(tutorialGamepadLoop);
  }
});