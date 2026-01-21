/* ==================================================
   SNAKE RETRO CON MODO IA
   - MODO IA OFF: Velocidad fija (juego clásico)
   - MODO IA ON: Velocidad se adapta según tu rendimiento
   - Toggle con mouse o tecla L (arcade)
   ================================================== */

function startSnake() {
  const { ctx, canvas } = createGameCanvas(600, 400);

  const GRID_SIZE = 20;
  const GRID_WIDTH = 30;
  const GRID_HEIGHT = 20;

  // Mapeo de botones del arcade
  const ARCADE_BUTTONS = {
    X: 0,
    A: 1,
    B: 2,
    Y: 3,
    L: 4,      // Toggle IA
    R: 5,
    SELECT: 8,
    START: 9
  };

  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 15, y: 10 };
  let score = 0;
  let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
  let running = true;
  let gameOver = false;
  
  // === SISTEMA DE IA ===
  let iaMode = false;  // false = velocidad fija, true = velocidad adaptativa
  const FIXED_SPEED = 100; // Velocidad fija cuando IA está OFF
  let gameSpeed = FIXED_SPEED;
  let adaptiveSpeed = 100; // Velocidad cuando IA está ON (se adapta)
  
  // Variables para IA adaptativa
  let deathCount = 0;
  let foodEatenStreak = 0;
  let lastDeathLength = 0;

  // Estado previo del gamepad
  let prevGamepadDir = { x: 0, y: 0 };
  let prevLPressed = false;

  // Sincronizar con el toggle del HTML usando sistema centralizado
  const mlToggle = document.getElementById('mlToggle');

  // Callback que será llamado por toggleMLMode en main.js
  function handleIAToggle(isEnabled) {
    if (isEnabled !== iaMode) {
      iaMode = isEnabled;
      applySpeedMode();
      showIANotification(iaMode);
    }
  }

  function setupToggle() {
    // Registrar callback en el sistema centralizado
    window.registerIACallback(handleIAToggle);
    if (mlToggle) {
      mlToggle.checked = iaMode;
    }
  }

  function toggleIAMode() {
    iaMode = !iaMode;
    if (mlToggle) mlToggle.checked = iaMode;
    applySpeedMode();
    showIANotification(iaMode);
  }

  function applySpeedMode() {
    if (!iaMode) {
      // Modo normal: velocidad fija
      gameSpeed = FIXED_SPEED;
    } else {
      // Modo IA: usar velocidad adaptativa
      gameSpeed = adaptiveSpeed;
    }

    // Reiniciar el loop con la nueva velocidad
    clearInterval(window.gameInterval);
    if (!gameOver) {
      startGameLoop();
    }
  }

  function showIANotification(enabled) {
    // Remover notificaciones previas
    const gameArea = document.getElementById('game-area');
    if (!gameArea) return;

    const oldNotifications = gameArea.querySelectorAll('.ia-notification');
    oldNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = 'ia-notification';
    notification.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${enabled ? 'rgba(0, 255, 65, 0.9)' : 'rgba(255, 122, 0, 0.9)'};
      color: #000;
      padding: 15px 30px;
      border-radius: 10px;
      font-family: 'Press Start 2P', monospace;
      font-size: 12px;
      z-index: 1000;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.5s ease-out;
      text-align: center;
    `;
    notification.innerHTML = enabled
      ? 'IA ADAPTATIVA ON<br><small style="font-size:8px">Velocidad se ajusta a tu nivel</small>'
      : 'MODO CLÁSICO<br><small style="font-size:8px">Velocidad fija</small>';

    gameArea.appendChild(notification);

    // Fade out manual
    setTimeout(() => {
      notification.style.opacity = '0';
    }, 1000);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 1500);
  }

  function initSnake() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
  }

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

  function restartGame() {
    // Guardar datos para IA antes de reiniciar
    if (iaMode && snake.length > 0) {
      lastDeathLength = snake.length;
      deathCount++;
      
      // Adaptar velocidad según rendimiento
      if (lastDeathLength < 5) {
        // Murió muy rápido - hacer más lento
        adaptiveSpeed = Math.min(150, adaptiveSpeed + 15);
      } else if (lastDeathLength < 10) {
        // Murió pronto - hacer un poco más lento
        adaptiveSpeed = Math.min(130, adaptiveSpeed + 8);
      } else if (lastDeathLength > 20) {
        // Lo hizo bien - puede ir más rápido
        adaptiveSpeed = Math.max(60, adaptiveSpeed - 5);
      }
    }
    
    initSnake();
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food = spawnFood();
    score = 0;
    foodEatenStreak = 0;
    running = true;
    gameOver = false;

    
    // Aplicar velocidad según modo
    if (iaMode) {
      gameSpeed = adaptiveSpeed;
    } else {
      gameSpeed = FIXED_SPEED;
    }
    
    updateScore(score);
    
    clearInterval(window.gameInterval);
    startGameLoop();
  }

  // ============================================================
  // A* PATHFINDING ALGORITHM
  // ============================================================
  
  function heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  function getNeighbors(node) {
    const neighbors = [];
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 }   // right
    ];

    for (const dir of directions) {
      const nx = node.x + dir.x;
      const ny = node.y + dir.y;

      // Check boundaries
      if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) {
        continue;
      }

      // Check collision with snake body (excluding tail since it will move)
      const isSnakeBody = snake.slice(0, -1).some(seg => seg.x === nx && seg.y === ny);
      if (isSnakeBody) {
        continue;
      }

      neighbors.push({ x: nx, y: ny });
    }

    return neighbors;
  }

  function findPath(start, goal) {
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const key = (node) => `${node.x},${node.y}`;

    gScore.set(key(start), 0);
    fScore.set(key(start), heuristic(start, goal));

    while (openSet.length > 0) {
      // Find node with lowest fScore
      let current = openSet[0];
      let currentIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (fScore.get(key(openSet[i])) < fScore.get(key(current))) {
          current = openSet[i];
          currentIdx = i;
        }
      }

      // Goal reached
      if (current.x === goal.x && current.y === goal.y) {
        const path = [];
        let temp = current;
        while (cameFrom.has(key(temp))) {
          path.unshift(temp);
          temp = cameFrom.get(key(temp));
        }
        return path;
      }

      openSet.splice(currentIdx, 1);

      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        const tentativeGScore = gScore.get(key(current)) + 1;
        const neighborKey = key(neighbor);

        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, goal));

          if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    // No path found
    return null;
  }

  function updateAIPath() {
    if (!aiModeEnabled || gameOver) {
      aiPath = [];
      return;
    }

    const head = snake[0];
    const path = findPath(head, food);
    aiPath = path || [];
  }

  // ============================================================
  // DRAW AI GUIDE
  // ============================================================
  
  function drawAIGuide() {
    if (!aiModeEnabled || aiPath.length === 0) return;

    const head = snake[0];
    const pathLength = aiPath.length;

    // Calculate overall distance from snake to fruit
    // Shorter path = closer to fruit = more transparent
    // Longer path = farther from fruit = more opaque
    const maxDistance = 30; // Maximum expected path length for scaling
    const normalizedDistance = Math.min(pathLength / maxDistance, 1);
    
    // Exponential fade based on total path length
    // When far (long path): opacity ≈ 1.0 (fully visible)
    // When close (short path): opacity ≈ 0.0 (invisible)
    const globalOpacity = Math.pow(normalizedDistance, 2.5);
    
    // Skip drawing if too transparent
    if (globalOpacity < 0.05) return;

    // Draw all path segments with the same opacity
    for (let i = 0; i < pathLength; i++) {
      const node = aiPath[i];
      const nextNode = i < pathLength - 1 ? aiPath[i + 1] : null;

      // Draw line segment
      if (nextNode) {
        const x1 = node.x * GRID_SIZE + GRID_SIZE / 2;
        const y1 = node.y * GRID_SIZE + GRID_SIZE / 2;
        const x2 = nextNode.x * GRID_SIZE + GRID_SIZE / 2;
        const y2 = nextNode.y * GRID_SIZE + GRID_SIZE / 2;

        ctx.strokeStyle = `rgba(255, 180, 0, ${globalOpacity})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        ctx.shadowColor = `rgba(255, 180, 0, ${globalOpacity * 0.5})`;
        ctx.shadowBlur = 8;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw guide dots
      const x = node.x * GRID_SIZE + GRID_SIZE / 2;
      const y = node.y * GRID_SIZE + GRID_SIZE / 2;
      
      ctx.fillStyle = `rgba(255, 180, 0, ${globalOpacity})`;
      ctx.shadowColor = `rgba(255, 180, 0, ${globalOpacity})`;
      ctx.shadowBlur = 6;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }

  // ============================================================
  // AI MODE TOGGLE - Using existing ML toggle from HTML
  // ============================================================
  
  let toggleChangeHandler = null;
  let toggleKeydownHandler = null;
  
  function setupAIToggle() {
    const mlToggle = document.getElementById('mlToggle');
    const mlContainer = document.querySelector('.ml-switch-container');
    
    if (!mlToggle) {
      console.warn('ML Toggle not found - AI mode will not be available');
      return;
    }
    
    // Make sure the toggle container is visible
    if (mlContainer) {
      mlContainer.style.display = 'flex';
    }
    
    // Reset toggle state when Snake starts
    mlToggle.checked = false;
    aiModeEnabled = false;
    aiPath = [];
    
    // Remove previous handlers if they exist
    if (toggleChangeHandler) {
      mlToggle.removeEventListener('change', toggleChangeHandler);
    }
    if (toggleKeydownHandler) {
      mlToggle.removeEventListener('keydown', toggleKeydownHandler);
    }
    
    // Prevent spacebar from toggling the checkbox
    toggleKeydownHandler = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    mlToggle.addEventListener('keydown', toggleKeydownHandler);
    
    // Create and store the change handler
    toggleChangeHandler = (e) => {
      aiModeEnabled = e.target.checked;
      
      if (aiModeEnabled) {
        updateAIPath();
        console.log('AI Guide Mode ENABLED');
      } else {
        aiPath = [];
        console.log('AI Guide Mode DISABLED');
      }
    };
    
    // Add the event listener
    mlToggle.addEventListener('change', toggleChangeHandler);
  }

  setupAIToggle();

  // Controles de teclado
  const handleKeyDown = (e) => {
    // Toggle IA con tecla L
    if ((e.key === 'l' || e.key === 'L') && !gameOver) {
      toggleIAMode();
      return;
    }
    
    if (gameOver && (e.key === 'Enter' || e.key === ' ')) {
      restartGame();
      return;
    }

    // Toggle AI Mode with B key
    if (e.key === 'b' || e.key === 'B') {
      const mlToggle = document.getElementById('mlToggle');
      if (mlToggle && !gameOver) {
        mlToggle.checked = !mlToggle.checked;
        mlToggle.dispatchEvent(new Event('change'));
      }
      return;
    }

    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
    }

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

  canvas.onclick = () => {
    if (gameOver) {
      restartGame();
    }
  };

  // Leer input del gamepad/arcade
  function readGamepadInput() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];
    if (!gp) return;

    // Toggle IA con L
    const lPressed = gp.buttons[ARCADE_BUTTONS.L]?.pressed || false;
    if (lPressed && !prevLPressed && !gameOver) {
      toggleIAMode();
    }
    prevLPressed = lPressed;

    // Reiniciar con SELECT o START
    if (gameOver) {
      if (gp.buttons[ARCADE_BUTTONS.SELECT]?.pressed || 
          gp.buttons[ARCADE_BUTTONS.START]?.pressed ||
          gp.buttons[ARCADE_BUTTONS.A]?.pressed) {
        restartGame();
        return;
      }
    }

    // Toggle AI Mode con botón B (índice 2)
    const bPressed = gp.buttons[ARCADE_BUTTONS.B]?.pressed;
    const bWasPressed = prevGamepadButtons[ARCADE_BUTTONS.B];
    
    if (bPressed && !bWasPressed && !gameOver) {
      const mlToggle = document.getElementById('mlToggle');
      if (mlToggle) {
        mlToggle.checked = !mlToggle.checked;
        mlToggle.dispatchEvent(new Event('change'));
      }
    }
    
    prevGamepadButtons[ARCADE_BUTTONS.B] = bPressed;

    // Leer palanca (joystick)
    const axisX = gp.axes[0];
    const axisY = gp.axes[1];
    
    let gpDir = { x: 0, y: 0 };
    
    if (axisX < -0.5) gpDir.x = -1;
    else if (axisX > 0.5) gpDir.x = 1;
    
    if (axisY < -0.5) gpDir.y = -1;
    else if (axisY > 0.5) gpDir.y = 1;

    if (Math.abs(axisY) > Math.abs(axisX)) {
      if (gpDir.y === -1 && prevGamepadDir.y !== -1 && dir.y !== 1) {
        nextDir = { x: 0, y: -1 };
      } else if (gpDir.y === 1 && prevGamepadDir.y !== 1 && dir.y !== -1) {
        nextDir = { x: 0, y: 1 };
      }
    } else {
      if (gpDir.x === -1 && prevGamepadDir.x !== -1 && dir.x !== 1) {
        nextDir = { x: -1, y: 0 };
      } else if (gpDir.x === 1 && prevGamepadDir.x !== 1 && dir.x !== -1) {
        nextDir = { x: 1, y: 0 };
      }
    }

    prevGamepadDir = gpDir;
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, 600, 400);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 42px "Press Start 2P", monospace';
    ctx.fillText('GAME OVER', 300, 100);

    ctx.fillStyle = '#ffb000';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText(`PUNTOS: ${score}`, 300, 160);

    ctx.fillStyle = '#00ff41';
    ctx.font = '14px "Press Start 2P", monospace';
    if (score >= highScore && score > 0) {
      ctx.fillText('¡NUEVO RÉCORD!', 300, 200);
    } else {
      ctx.fillText(`RÉCORD: ${highScore}`, 300, 200);
    }

    // Mostrar modo e info de IA
    ctx.fillStyle = iaMode ? '#00ff41' : '#ff7a00';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(iaMode ? 'MODO: IA ADAPTATIVA' : 'MODO: CLÁSICO', 300, 240);
    
    if (iaMode) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(`VELOCIDAD AJUSTADA: ${getSpeedLabel(adaptiveSpeed)}`, 300, 260);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`LONGITUD: ${snake.length}`, 300, 290);

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('SELECT/ENTER PARA REINICIAR', 300, 340);
      ctx.fillText('X PARA SALIR', 300, 365);
    }

    ctx.textAlign = 'left';
  }

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

  function drawSnake() {
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const intensity = 1 - (index / snake.length) * 0.5;
      
      if (isHead) {
        // Cabeza cambia de color si IA está activa
        ctx.fillStyle = iaMode ? '#ff00ff' : '#00ff41';
        ctx.shadowColor = iaMode ? '#ff00ff' : '#00ff41';
        ctx.shadowBlur = 10;
      } else {
        const r = Math.floor(255 * intensity);
        const g = Math.floor(122 * intensity);
        ctx.fillStyle = `rgb(${r}, ${g}, 0)`;
        ctx.shadowBlur = 0;
      }

      const x = segment.x * GRID_SIZE + 1;
      const y = segment.y * GRID_SIZE + 1;
      const size = GRID_SIZE - 2;
      
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, isHead ? 6 : 3);
      ctx.fill();
      
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        
        let eyeOffset1, eyeOffset2;
        if (dir.x === 1) {
          eyeOffset1 = { x: 12, y: 5 };
          eyeOffset2 = { x: 12, y: 13 };
        } else if (dir.x === -1) {
          eyeOffset1 = { x: 5, y: 5 };
          eyeOffset2 = { x: 5, y: 13 };
        } else if (dir.y === -1) {
          eyeOffset1 = { x: 5, y: 5 };
          eyeOffset2 = { x: 13, y: 5 };
        } else {
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

  function drawFood() {
    const pulse = Math.sin(Date.now() / 200) * 2 + 8;
    const x = food.x * GRID_SIZE + GRID_SIZE / 2;
    const y = food.y * GRID_SIZE + GRID_SIZE / 2;

    ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
    ctx.beginPath();
    ctx.arc(x, y, pulse + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PUNTOS: ${score}`, 10, 25);

    // Indicador de modo IA
    if (iaMode) {
      ctx.fillStyle = '#00ff41';
      ctx.fillText(`🤖 IA: ${getSpeedLabel(gameSpeed)}`, 10, 45);
    } else {
      ctx.fillStyle = '#ff7a00';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('CLÁSICO', 10, 45);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0, 255, 65, 0.6)';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText(`RÉCORD: ${highScore}`, 590, 25);
    
    // Hint para IA
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '8px monospace';
    ctx.fillText('L = Toggle IA', 590, 45);
    
    ctx.textAlign = 'left';
  }

  function getSpeedLabel(speed) {
    if (speed >= 140) return 'MUY LENTO';
    if (speed >= 120) return 'LENTO';
    if (speed >= 90) return 'NORMAL';
    if (speed >= 70) return 'RÁPIDO';
    return 'MUY RÁPIDO';
  }

  function gameLoop() {
    if (!running) return;

    // Leer gamepad
    readGamepadInput();

    if (gameOver) {
      drawGameOver();
      return;
    }

    dir = { ...nextDir };

    const head = {
      x: snake[0].x + dir.x,
      y: snake[0].y + dir.y
    };

    const hitWall = head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT;
    const hitSelf = snake.some(seg => seg.x === head.x && seg.y === head.y);

    if (hitWall || hitSelf) {
      gameOver = true;
      running = true;
      
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore.toString());
      }
      
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 10;
      foodEatenStreak++;
      updateScore(score);
      food = spawnFood();

      // En modo IA, aumentar velocidad gradualmente al comer
      if (iaMode) {
        if (foodEatenStreak >= 5 && adaptiveSpeed > 60) {
          adaptiveSpeed -= 3;
          gameSpeed = adaptiveSpeed;
          clearInterval(window.gameInterval);
          startGameLoop();
        }
      }
      
      // Update AI path when food is eaten
      updateAIPath();
    } else {
      snake.pop();
    }

    // Update AI path every frame
    updateAIPath();

    // Render
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 600, 400);

    drawGrid();
    drawFood();
    drawAIGuide(); // Draw guide BEFORE snake so it appears behind
    drawSnake();
    drawHUD();
  }

  function startGameLoop() {
    window.gameInterval = setInterval(gameLoop, gameSpeed);
  }

  // Inicializar
  initSnake();
  food = spawnFood();
  updateScore(score);
  setupToggle();
  startGameLoop();

  // Limpiar al cerrar
  const originalClose = window.closeMinigame;
  window.closeMinigame = function() {
    document.removeEventListener('keydown', handleKeyDown);
    clearInterval(window.gameInterval);
    
    // Clean up toggle listeners and reset state
    const mlToggle = document.getElementById('mlToggle');
    if (mlToggle) {
      if (toggleChangeHandler) {
        mlToggle.removeEventListener('change', toggleChangeHandler);
      }
      if (toggleKeydownHandler) {
        mlToggle.removeEventListener('keydown', toggleKeydownHandler);
      }
      mlToggle.checked = false;
    }
    
    // Reset AI state
    aiModeEnabled = false;
    aiPath = [];
    
    // El callback de IA se limpia automáticamente en closeMinigame de main.js
    if (originalClose) originalClose();
  };
}

// Polyfill para roundRect
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