/* ==================================================
   SNAKE RETRO
   Con pantalla de Game Over y reinicio
   ================================================== */

function startSnake() {
  const { ctx, canvas } = createGameCanvas(600, 400);

  const GRID_SIZE = 20;
  const GRID_WIDTH = 30;  // 600 / 20
  const GRID_HEIGHT = 20; // 400 / 20

  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 }; // Para evitar giros de 180°
  let food = { x: 15, y: 10 };
  let score = 0;
  let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
  let running = true;
  let gameOver = false;
  let gameSpeed = 100; // ms entre frames (se acelera con el score)

  // Inicializar serpiente
  function initSnake() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
  }

  // Generar comida en posición válida
  function spawnFood() {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
    } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
    return newFood;
  }

  // Reiniciar juego
  function restartGame() {
    initSnake();
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food = spawnFood();
    score = 0;
    gameSpeed = 100;
    running = true;
    gameOver = false;
    updateScore(score);
    
    // Reiniciar el intervalo con la velocidad inicial
    clearInterval(window.gameInterval);
    startGameLoop();
  }

  // Controles
  const handleKeyDown = (e) => {
    // Reiniciar con ENTER o ESPACIO cuando termina
    if (gameOver && (e.key === 'Enter' || e.key === ' ')) {
      restartGame();
      return;
    }

    // Prevenir scroll con flechas
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
    }

    // Cambiar dirección (evitando giros de 180°)
    switch(e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (dir.y !== 1) nextDir = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (dir.y !== -1) nextDir = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (dir.x !== 1) nextDir = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (dir.x !== -1) nextDir = { x: 1, y: 0 };
        break;
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  // Click para reiniciar
  canvas.onclick = () => {
    if (gameOver) {
      restartGame();
    }
  };

  // Dibujar pantalla de Game Over
  function drawGameOver() {
    // Fondo oscuro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, 600, 400);

    ctx.textAlign = 'center';

    // Título
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 42px "Press Start 2P", monospace';
    ctx.fillText('GAME OVER', 300, 120);

    // Puntuación final
    ctx.fillStyle = '#ffb000';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText(`PUNTOS: ${score}`, 300, 180);

    // High Score
    ctx.fillStyle = '#00ff41';
    ctx.font = '14px "Press Start 2P", monospace';
    if (score >= highScore && score > 0) {
      ctx.fillText('¡NUEVO RÉCORD!', 300, 220);
    } else {
      ctx.fillText(`RÉCORD: ${highScore}`, 300, 220);
    }

    // Estadísticas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`LONGITUD: ${snake.length} | VELOCIDAD: ${Math.round((100/gameSpeed) * 100)}%`, 300, 260);

    // Instrucción para reiniciar (parpadeante)
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText('CLICK O ENTER PARA REINICIAR', 300, 320);
    }

    ctx.textAlign = 'left';
  }

  // Dibujar grid de fondo
  function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.05)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= 600; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }
    
    for (let y = 0; y <= 400; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }
  }

  // Dibujar serpiente con efecto degradado
  function drawSnake() {
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      
      // Color degradado de cabeza a cola
      const intensity = 1 - (index / snake.length) * 0.5;
      
      if (isHead) {
        // Cabeza verde brillante
        ctx.fillStyle = '#00ff41';
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 10;
      } else {
        // Cuerpo naranja con degradado
        const r = Math.floor(255 * intensity);
        const g = Math.floor(122 * intensity);
        ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
        ctx.shadowBlur = 0;
      }

      // Dibujar segmento con bordes redondeados
      const x = segment.x * GRID_SIZE + 1;
      const y = segment.y * GRID_SIZE + 1;
      const size = GRID_SIZE - 2;
      
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, isHead ? 6 : 3);
      ctx.fill();
      
      // Ojos de la cabeza
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        
        // Posición de ojos según dirección
        let eyeOffset1, eyeOffset2;
        if (dir.x === 1) { // Derecha
          eyeOffset1 = { x: 12, y: 5 };
          eyeOffset2 = { x: 12, y: 13 };
        } else if (dir.x === -1) { // Izquierda
          eyeOffset1 = { x: 5, y: 5 };
          eyeOffset2 = { x: 5, y: 13 };
        } else if (dir.y === -1) { // Arriba
          eyeOffset1 = { x: 5, y: 5 };
          eyeOffset2 = { x: 13, y: 5 };
        } else { // Abajo
          eyeOffset1 = { x: 5, y: 12 };
          eyeOffset2 = { x: 13, y: 12 };
        }
        
        ctx.beginPath();
        ctx.arc(x + eyeOffset1.x, y + eyeOffset1.y, 2, 0, Math.PI * 2);
        ctx.arc(x + eyeOffset2.x, y + eyeOffset2.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    ctx.shadowBlur = 0;
  }

  // Dibujar comida con animación
  function drawFood() {
    const pulse = Math.sin(Date.now() / 200) * 2 + 8;
    const x = food.x * GRID_SIZE + GRID_SIZE / 2;
    const y = food.y * GRID_SIZE + GRID_SIZE / 2;

    // Brillo exterior
    ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
    ctx.beginPath();
    ctx.arc(x, y, pulse + 4, 0, Math.PI * 2);
    ctx.fill();

    // Comida principal
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Dibujar HUD
  function drawHUD() {
    // Puntuación
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PUNTOS: ${score}`, 10, 25);

    // High Score
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0, 255, 65, 0.6)';
    ctx.fillText(`RÉCORD: ${highScore}`, 590, 25);
    
    ctx.textAlign = 'left';
  }

  // Loop principal del juego
  function gameLoop() {
    if (!running) return;

    // Si terminó, dibujar pantalla de game over
    if (gameOver) {
      drawGameOver();
      return;
    }

    // Aplicar la siguiente dirección
    dir = { ...nextDir };

    // Calcular nueva posición de la cabeza
    const head = {
      x: snake[0].x + dir.x,
      y: snake[0].y + dir.y
    };

    // Verificar colisiones
    const hitWall = head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT;
    const hitSelf = snake.some(seg => seg.x === head.x && seg.y === head.y);

    if (hitWall || hitSelf) {
      gameOver = true;
      running = true; // Mantener el loop para mostrar game over
      
      // Actualizar high score
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore.toString());
      }
      
      return;
    }

    // Mover serpiente
    snake.unshift(head);

    // Verificar si comió
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      updateScore(score);
      food = spawnFood();

      // Aumentar velocidad cada 50 puntos (máx 50ms)
      if (score % 50 === 0 && gameSpeed > 50) {
        gameSpeed -= 5;
        clearInterval(window.gameInterval);
        startGameLoop();
      }
    } else {
      snake.pop();
    }

    // === RENDER ===
    // Fondo
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 600, 400);

    // Grid
    drawGrid();

    // Comida
    drawFood();

    // Serpiente
    drawSnake();

    // HUD
    drawHUD();
  }

  // Iniciar loop del juego
  function startGameLoop() {
    window.gameInterval = setInterval(gameLoop, gameSpeed);
  }

  // Inicializar
  initSnake();
  food = spawnFood();
  updateScore(score);
  startGameLoop();

  // Limpiar al cerrar
  const originalClose = window.closeMinigame;
  window.closeMinigame = function() {
    document.removeEventListener('keydown', handleKeyDown);
    clearInterval(window.gameInterval);
    if (originalClose) originalClose();
  };
}

// Polyfill para roundRect si no existe
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}