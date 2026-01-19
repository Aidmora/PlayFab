/* ==================================================
   PONG CON IA ADAPTATIVA
   Con soporte para ARCADE/GAMEPAD
   - Palanca: mover paleta arriba/abajo
   - El primero en llegar a 5 puntos gana
   - Reinicio con SELECT/START o ENTER
   ================================================== */

function startPong() {
  const { ctx, canvas } = createGameCanvas(600, 400);

  const WINNING_SCORE = 5;

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

  let ball = {
    x: 300,
    y: 200,
    dx: 4.5,
    dy: 4.5
  };

  let player = { y: 150, score: 0, speed: 0 };
  let cpu = { y: 150, score: 0 };
  let running = true;
  let gameOver = false;
  let winner = null;
  
  let cpuDifficulty = 0.04;
  let playerWinStreak = 0;
  let cpuWinStreak = 0;
  
  // Control con teclado
  let keys = {};
  
  const handleKeyDown = (e) => {
    keys[e.key] = true;
    if (gameOver && (e.key === 'Enter' || e.key === ' ')) {
      restartGame();
    }
  };
  
  const handleKeyUp = (e) => {
    keys[e.key] = false;
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Control del jugador con mouse
  canvas.onmousemove = (e) => {
    if (gameOver) return;
    const rect = canvas.getBoundingClientRect();
    player.y = e.clientY - rect.top - 40;
  };

  canvas.onclick = () => {
    if (gameOver) {
      restartGame();
    }
  };

  function restartGame() {
    player.score = 0;
    cpu.score = 0;
    player.y = 150;
    cpu.y = 150;
    cpuDifficulty = 0.04;
    playerWinStreak = 0;
    cpuWinStreak = 0;
    gameOver = false;
    winner = null;
    resetBall();
  }

  function resetBall() {
    ball.x = 300;
    ball.y = 200;
    ball.dx = 3.5 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = 3.5 * (Math.random() > 0.5 ? 1 : -1);
  }

  function checkWinner() {
    if (player.score >= WINNING_SCORE) {
      gameOver = true;
      winner = 'player';
      return true;
    }
    if (cpu.score >= WINNING_SCORE) {
      gameOver = true;
      winner = 'cpu';
      return true;
    }
    return false;
  }

  // Leer input del gamepad/arcade
  function readGamepadInput() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp) return;

    // Reiniciar con SELECT o START
    if (gameOver) {
      if (gp.buttons[ARCADE_BUTTONS.SELECT]?.pressed || 
          gp.buttons[ARCADE_BUTTONS.START]?.pressed ||
          gp.buttons[ARCADE_BUTTONS.A]?.pressed) {
        restartGame();
        return;
      }
    }

    // Leer palanca (joystick) - Eje Y para arriba/abajo
    const axisY = gp.axes[1];
    
    // Movimiento más suave con el joystick
    if (axisY < -0.3) {
      // Arriba - velocidad proporcional a cuánto se mueve la palanca
      const speed = Math.abs(axisY) * 8;
      player.y = Math.max(0, player.y - speed);
    } else if (axisY > 0.3) {
      // Abajo
      const speed = Math.abs(axisY) * 8;
      player.y = Math.min(320, player.y + speed);
    }
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, 600, 400);

    ctx.textAlign = 'center';
    
    if (winner === 'player') {
      ctx.fillStyle = '#00ff41';
      ctx.font = 'bold 48px "Press Start 2P", monospace';
      ctx.fillText('¡VICTORIA!', 300, 150);
      
      ctx.fillStyle = '#ffb000';
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.fillText(`${player.score} - ${cpu.score}`, 300, 200);
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 42px "Press Start 2P", monospace';
      ctx.fillText('GAME OVER', 300, 150);
      
      ctx.fillStyle = '#ffb000';
      ctx.font = '18px "Press Start 2P", monospace';
      ctx.fillText(`${player.score} - ${cpu.score}`, 300, 200);
    }

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('SELECT/ENTER PARA REINICIAR', 300, 280);
      ctx.fillText('X PARA SALIR', 300, 305);
    }

    ctx.textAlign = 'left';
  }

  // Loop principal
  window.gameInterval = setInterval(() => {
    if (!running) return;

    // Leer gamepad
    readGamepadInput();

    if (gameOver) {
      drawGameOver();
      return;
    }
    
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

    // Colisión con paletas
    if (ball.x <= 20 && ball.x >= 10 && ball.y > player.y && ball.y < player.y + 80) {
      ball.dx = Math.abs(ball.dx) * 1.08;
      ball.x = 20;
    }
    if (ball.x >= 580 && ball.x <= 590 && ball.y > cpu.y && ball.y < cpu.y + 80) {
      ball.dx = -Math.abs(ball.dx) * 1.08;
      ball.x = 580;
    }

    // Punto
    if (ball.x < 0 || ball.x > 600) {
      if (ball.x < 0) {
        cpu.score++;
        cpuWinStreak++;
        playerWinStreak = 0;
        
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
        
        if (playerWinStreak === 1) {
          cpuDifficulty = Math.min(0.4, cpuDifficulty + 0.03);
        } else if (playerWinStreak === 2) {
          cpuDifficulty = Math.min(0.4, cpuDifficulty + 0.045);
        } else if (playerWinStreak >= 3) {
          cpuDifficulty = Math.min(0.4, cpuDifficulty + 0.06);
        }
      }
      
      if (!checkWinner()) {
        resetBall();
      }

      const scoreEl = document.getElementById('game-score');
      if (scoreEl) {
        scoreEl.textContent = `TÚ: ${player.score} | CPU: ${cpu.score}`;
      }
    }

    // IA del CPU
    let targetY = ball.y - 40;
    let error = 0;
    
    if (cpuDifficulty < 0.1) {
      error = (Math.random() - 0.5) * 60;
    } else if (cpuDifficulty < 0.2) {
      error = (Math.random() - 0.5) * 30;
    } else if (cpuDifficulty < 0.3) {
      error = (Math.random() - 0.5) * 15;
    }
    
    cpu.y += (targetY + error - cpu.y) * cpuDifficulty;

    // === RENDER ===
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 600, 400);

    // Línea central punteada
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(300, 0);
    ctx.lineTo(300, 400);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marcador grande de fondo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${player.score}`, 150, 250);
    ctx.fillText(`${cpu.score}`, 450, 250);
    ctx.textAlign = 'left';

    // Marcador arriba
    ctx.fillStyle = 'white';
    ctx.font = '20px monospace';
    ctx.fillText(`${player.score}`, 250, 35);
    ctx.fillText(`${cpu.score}`, 335, 35);
    
    // Meta
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`META: ${WINNING_SCORE}`, 270, 55);

    // Dificultad
    ctx.font = '10px monospace';
    ctx.fillStyle = getDifficultyColor(cpuDifficulty);
    ctx.fillText(`CPU: ${getDifficultyLabel(cpuDifficulty)}`, 10, 20);

    // Paleta del jugador
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 10;
    ctx.fillRect(10, player.y, 10, 80);
    ctx.shadowBlur = 0;

    // Paleta del CPU
    ctx.fillStyle = '#ff7a00';
    ctx.shadowColor = '#ff7a00';
    ctx.shadowBlur = 10;
    ctx.fillRect(580, cpu.y, 10, 80);
    ctx.shadowBlur = 0;

    // Pelota
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  }, 16);

  // Limpiar al cerrar
  const originalClose = window.closeMinigame;
  window.closeMinigame = function() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    if (originalClose) originalClose();
  };
}

function getDifficultyLabel(diff) {
  if (diff < 0.05) return 'MUY FÁCIL';
  if (diff < 0.1) return 'FÁCIL';
  if (diff < 0.2) return 'NORMAL';
  if (diff < 0.3) return 'DIFÍCIL';
  return 'EXPERTO';
}

function getDifficultyColor(diff) {
  if (diff < 0.05) return '#00ff41';
  if (diff < 0.1) return '#7fff00';
  if (diff < 0.2) return '#ffff00';
  if (diff < 0.3) return '#ff7a00';
  return '#ff4444';
}