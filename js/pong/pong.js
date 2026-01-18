/* ==================================================
   PONG
   Mantiene la lógica original 1:1
   ================================================== */

function startPong() {
  const { ctx, canvas } = createGameCanvas(600, 400);

  let ball = {
    x: 300,
    y: 200,
    dx: 4,
    dy: 4
  };

  let player = { y: 150 };
  let cpu = { y: 150 };
  let running = true;

  // Control del jugador con mouse
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    player.y = e.clientY - rect.top - 40;
  };

  // Loop principal (idéntico al original)
  window.gameInterval = setInterval(() => {
    if (!running) return;

    // Movimiento de la pelota
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Rebote vertical
    if (ball.y <= 0 || ball.y >= 400) {
      ball.dy *= -1;
    }

    // Colisión con paletas
    if (
      (ball.x < 20 && ball.y > player.y && ball.y < player.y + 80) ||
      (ball.x > 580 && ball.y > cpu.y && ball.y < cpu.y + 80)
    ) {
      ball.dx *= -1.1; // acelera levemente (igual que antes)
    }

    // Punto (reinicio)
    if (ball.x < 0 || ball.x > 600) {
      ball.x = 300;
      ball.y = 200;
      ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
      ball.dy = 4 * (Math.random() > 0.5 ? 1 : -1);
    }

    // IA básica del CPU
    cpu.y += (ball.y - (cpu.y + 40)) * 0.1;

    // Render
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 600, 400);

    ctx.fillStyle = 'orange';
    ctx.fillRect(10, player.y, 10, 80);
    ctx.fillRect(580, cpu.y, 10, 80);

    ctx.fillStyle = 'lime';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
    ctx.fill();

  }, 16);
}
