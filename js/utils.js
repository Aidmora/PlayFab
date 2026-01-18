/* ==================================================
   UTILS (helpers compartidos)
   Mantiene la lógica original 1:1
   ================================================== */

function createGameCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.style.maxWidth = '100%';

  document.getElementById('game-area').appendChild(c);

  return { canvas: c, ctx: c.getContext('2d') };
}

function updateScore(v) {
  // Mantiene el formato original:
  // - si es numero => "SCORE: X"
  // - si es string => se muestra tal cual
  document.getElementById('game-score').innerText =
    (typeof v === 'number') ? ('SCORE: ' + v) : v;
}
