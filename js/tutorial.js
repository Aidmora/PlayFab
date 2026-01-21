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

  const ARCADE_BUTTONS = {
    X: 0,
    B: 2
  };

  let prevButtonState = {};

  // Configuración del scroll con palanca
  const SCROLL_SPEED = 15; // Pixeles por frame
  const AXIS_DEADZONE = 0.3; // Zona muerta para evitar scroll accidental

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

        // Scroll con la palanca (eje Y)
        const tutorialContent = tutorialOverlay.querySelector('.tutorial-content');
        if (tutorialContent) {
          const axisY = gp.axes[1] || 0; // Eje vertical de la palanca

          // Aplicar scroll si está fuera de la zona muerta
          if (Math.abs(axisY) > AXIS_DEADZONE) {
            const scrollAmount = axisY * SCROLL_SPEED;
            tutorialContent.scrollTop += scrollAmount;
          }
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