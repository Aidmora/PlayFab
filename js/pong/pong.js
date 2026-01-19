/* ==================================================
   PONG CON IA ADAPTATIVA
   La CPU ajusta su dificultad según el rendimiento del jugador
   ================================================== */

function startPong() {
  const { ctx, canvas } = createGameCanvas(600, 400);

  let ball = {
    x: 300,
    y: 200,
    dx: 4.5,
    dy: 4.5
  };

  let player = { y: 150, score: 0, speed: 0 };
  let cpu = { y: 150, score: 0 };
  let running = true;
  
  // Sistema de dificultad adaptativa mejorado
  let cpuDifficulty = 0.04; // Velocidad base de la CPU (0.015 a 0.45)
  let playerWinStreak = 0;
  let cpuWinStreak = 0;
  
  // Control con teclado
  let keys = {};
  
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
  });
  
  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  // Control del jugador con mouse
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    player.y = e.clientY - rect.top - 40;
  };

  // Loop principal
  window.gameInterval = setInterval(() => {
    if (!running) return;
    
    // Control del jugador con teclado
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      player.y = Math.max(0, player.y - 6);
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      player.y = Math.min(320, player.y + 6);
    }

    // Movimiento de la pelota
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Rebote vertical
    if (ball.y <= 0 || ball.y >= 400) {
      ball.dy *= -1;
    }

    // Colisión con paletas (mejorada)
    if (ball.x <= 20 && ball.x >= 10 && ball.y > player.y && ball.y < player.y + 80) {
      ball.dx = Math.abs(ball.dx) * 1.08; // rebote hacia la derecha y acelera
      ball.x = 20; // evita que se atore
    }
    if (ball.x >= 580 && ball.x <= 590 && ball.y > cpu.y && ball.y < cpu.y + 80) {
      ball.dx = -Math.abs(ball.dx) * 1.08; // rebote hacia la izquierda y acelera
      ball.x = 580; // evita que se atore
    }

    // Punto (reinicio)
    if (ball.x < 0 || ball.x > 600) {
      // Actualizar puntajes y rachas
      if (ball.x < 0) {
        cpu.score++;
        cpuWinStreak++;
        playerWinStreak = 0;
        
        // Reducir dificultad progresivamente según la racha de CPU
        if (cpuWinStreak === 1) {
          cpuDifficulty = Math.max(0.02, cpuDifficulty - 0.025);
        } else if (cpuWinStreak === 2) {
          cpuDifficulty = Math.max(0.02, cpuDifficulty - 0.035);
        } else if (cpuWinStreak >= 3) {
          cpuDifficulty = Math.max(0.02, cpuDifficulty - 0.045);
        }
      } else {
        player.score++;
        playerWinStreak++;
        cpuWinStreak = 0;
        
        // Aumentar dificultad progresivamente según la racha del jugador
        if (playerWinStreak === 1) {
          cpuDifficulty = Math.min(0.4, cpuDifficulty + 0.03);
        } else if (playerWinStreak === 2) {
          cpuDifficulty = Math.min(0.4, cpuDifficulty + 0.045);
        } else if (playerWinStreak >= 3) {
          cpuDifficulty = Math.min(0.4, cpuDifficulty + 0.06);
        }
      }
      
      // Reiniciar pelota
      ball.x = 300;
      ball.y = 200;
      ball.dx = 3.5 * (Math.random() > 0.5 ? 1 : -1);
      ball.dy = 3.5 * (Math.random() > 0.5 ? 1 : -1);
    }

    // IA adaptativa del CPU con límite de error
    let targetY = ball.y - 40;
    let error = 0;
    
    // A menor dificultad, mayor error en el seguimiento
    if (cpuDifficulty < 0.1) {
      // Muy fácil: error grande, movimientos lentos e imprecisos
      error = (Math.random() - 0.5) * 60;
    } else if (cpuDifficulty < 0.2) {
      // Fácil: error moderado
      error = (Math.random() - 0.5) * 30;
    } else if (cpuDifficulty < 0.3) {
      // Medio: error pequeño
      error = (Math.random() - 0.5) * 15;
    }
    // Mayor a 0.3: casi sin error, muy preciso
    
    cpu.y += (targetY + error - cpu.y) * cpuDifficulty;

    // Render
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 600, 400);

    // Marcador
    ctx.fillStyle = 'white';
    ctx.font = '24px monospace';
    ctx.fillText(`${player.score}`, 250, 40);
    ctx.fillText(`${cpu.score}`, 330, 40);
    
    // Indicador de dificultad (opcional)
    ctx.font = '12px monospace';
    ctx.fillText(`CPU: ${Math.round(cpuDifficulty * 100)}%`, 10, 20);

    ctx.fillStyle = 'orange';
    ctx.fillRect(10, player.y, 10, 80);
    ctx.fillRect(580, cpu.y, 10, 80);

    ctx.fillStyle = 'lime';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
    ctx.fill();

  }, 16);
}