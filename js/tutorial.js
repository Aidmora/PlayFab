/* tutorial.js
   Maneja la lógica de la ventana modal de ayuda/instrucciones.

   ✅ Soporta:
   - Botón viejo: #helpBtn (aunque esté hidden)
   - Botón nuevo del menú: #openHelpBtn
   - Llamadas directas: openTutorial() / closeTutorial() (por si lo usas en HTML o main.js)
*/

document.addEventListener('DOMContentLoaded', () => {
  // Elementos del DOM
  const helpBtnLegacy = document.getElementById('helpBtn');      // botón viejo/oculto
  const openHelpBtn = document.getElementById('openHelpBtn');    // botón nuevo (en settings)
  const tutorialOverlay = document.getElementById('tutorial-overlay');
  const closeBtn = document.querySelector('.btn-close-tutorial');

  // Si no existe el overlay, no hay nada que hacer
  if (!tutorialOverlay) return;

  // --- Helpers de UI ---
  function showOverlay() {
    // Asegura display correcto aunque el CSS use clases
    tutorialOverlay.style.display = 'flex';
    tutorialOverlay.classList.remove('fade-in');
    // reflow para reiniciar animación
    void tutorialOverlay.offsetWidth;
    tutorialOverlay.classList.add('fade-in');

    // Accesibilidad
    tutorialOverlay.setAttribute('aria-hidden', 'false');
    tutorialOverlay.classList.add('active');
  }

  function hideOverlay() {
    tutorialOverlay.style.display = 'none';
    tutorialOverlay.classList.remove('fade-in');
    tutorialOverlay.classList.remove('active');
    tutorialOverlay.setAttribute('aria-hidden', 'true');
  }

  // --- API global (para main.js y/o onclick en HTML) ---
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

  // Cerrar haciendo clic fuera del contenido (en el fondo)
  tutorialOverlay.addEventListener('click', (e) => {
    if (e.target === tutorialOverlay) hideOverlay();
  });

  // Cerrar con ESC
  document.addEventListener('keydown', (e) => {
    const isOpen = tutorialOverlay.style.display === 'flex' || tutorialOverlay.classList.contains('active');
    if (e.key === 'Escape' && isOpen) hideOverlay();
  });
});
