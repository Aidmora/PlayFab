// tutorial.js

const tutorialOverlay = document.getElementById("tutorial-overlay");
const helpBtn = document.getElementById("helpBtn");

function openTutorial() {
  tutorialOverlay.classList.add("active");
  tutorialOverlay.classList.add("fade-in");
}

function closeTutorial() {
  tutorialOverlay.classList.remove("active");
  tutorialOverlay.classList.remove("fade-in");
}

// Eventos
helpBtn.addEventListener("click", openTutorial);

// Cerrar al hacer click fuera del contenido
tutorialOverlay.addEventListener("click", (e) => {
  if (e.target === tutorialOverlay) closeTutorial();
});

// Cerrar con tecla ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && tutorialOverlay.classList.contains("active")) {
    closeTutorial();
  }
});
