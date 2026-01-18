/* ==================================================
   SNAKE
   Mantiene la lógica original 1:1
   ================================================== */

function startSnake() {
  const { ctx, canvas } = createGameCanvas(600, 400);

  let snake = [{ x: 10, y: 10 }];
  let dir = { x: 1, y: 0 };
  let food = { x: 15, y: 15 };
  let score = 0;
  let running = true;

  // Controles (idénticos)
  document.onkeydown = (e) => {
    if (e.key.startsWith('Arrow')) {
      dir = {
        x: e.key === 'ArrowUp' ? 0 : e.key === 'ArrowDown' ? 0 : e.key === 'ArrowLeft' ? -1 : 1,
        y: e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
      };
    }
  };

  window.gameInterval = setInterval(() => {
    if (!running) return;

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Colisiones (pared o consigo misma)
    if (
      head.x < 0 || head.x >= 30 ||
      head.y < 0 || head.y >= 20 ||
      snake.some(seg => seg.x === head.x && seg.y === head.y)
    ) {
      running = false;
      return;
    }

    snake.unshift(head);

    // Comer
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      updateScore(score);
      food = { x: Math.floor(Math.random() * 30), y: Math.floor(Math.random() * 20) };
    } else {
      snake.pop();
    }

    // Render (idéntico)
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 600, 400);

    ctx.fillStyle = 'orange';
    snake.forEach(p => ctx.fillRect(p.x * 20 + 1, p.y * 20 + 1, 18, 18));

    ctx.fillStyle = 'lime';
    ctx.beginPath();
    ctx.arc(food.x * 20 + 10, food.y * 20 + 10, 8, 0, 7);
    ctx.fill();
  }, 100);
}
