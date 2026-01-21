/* ==================================================
   CPU DEFENDER - GAME
   Depende de:
   - utils.js: createGameCanvas(), updateScore()
   - cpuDefender/ai.js: window.CpuDefenderAI
   - cpuDefender/entities.js: window.PlayerTank, window.CpuBase, etc.
   - cpuDefender/ui.js: window.cpuShowAnnouncement(), window.cpuSetLoading()
   ================================================== */

function startCpuDefender() {
  const gameArea = document.getElementById('game-area');

  // Limpieza de seguridad
  const existingCanvas = gameArea.querySelector('canvas');
  if (existingCanvas) existingCanvas.remove();

  const existingUi = gameArea.querySelector('.ui-layer');
  if (existingUi) existingUi.remove();

  // Limpiar overlays previos
  const existingOverlays = gameArea.querySelectorAll('.crt-overlay, .vignette-overlay');
  existingOverlays.forEach(o => o.remove());

  // Canvas del juego
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 600;
  canvas.style.cursor = 'crosshair';
  canvas.style.backgroundColor = '#0a0a1a';

  // SOLUCIÓN 1: Hacer el canvas "enfocable" y darle el foco inmediatamente
  canvas.setAttribute('tabindex', '0');
  canvas.style.outline = 'none'; // Quitar el borde azul de selección

  // UI layer (botón repair + game over msg + ammo bar)
  const ui = document.createElement('div');
  ui.className = 'ui-layer';
  ui.innerHTML = `
    <!-- CRT Scanline Overlay -->
    <div class="crt-overlay"></div>

    <!-- Vignette Effect -->
    <div class="vignette-overlay"></div>

    <!-- HUD IA Status -->
    <div class="ai-status-hud" id="ai-status-hud" style="display:none;">
      <span id="ai-level-text">AI LVL: 1</span>
      <small id="ai-status-sub">CALIBRANDO...</small>
    </div>

    <!-- Ammo Bar Visual -->
    <div class="ammo-bar-container">
      <span class="ammo-bar-label">AMMO</span>
      <div class="ammo-bar-track">
        <div class="ammo-bar-fill" id="ammo-bar-fill" style="width: 100%;"></div>
      </div>
    </div>

    <div class="hud-controls">
      <button class="btn-cpu" id="btn-repair">⚡ REPAIR<span>(500 PTS)</span></button>
    </div>

    <div id="cpu-game-over" class="cpu-game-over-msg" style="display:none;">
      <h2>SYSTEM FAILURE</h2>
      <p>Score: <span id="final-cpu-score">0</span></p>
      <p class="restart-hint">SELECT/ENTER PARA REINICIAR</p>
      <p style="font-size:0.6rem; color:#888; margin-top:8px;">X PARA SALIR</p>
    </div>
  `;

  gameArea.appendChild(canvas);
  gameArea.appendChild(ui);

  // Forzamos el foco al canvas para que las teclas las reciba el juego
  canvas.focus();

  // Instancia del juego (global para toggle ML)
  window.activeCpuGameInstance = new CpuGame(canvas);

  // Repair button
  const btnRepair = document.getElementById('btn-repair');
  if (btnRepair) btnRepair.onclick = () => window.activeCpuGameInstance.repairCpu();
  
  // Si el usuario hace clic fuera y vuelve, asegurar que el canvas recupere el foco
  canvas.addEventListener('click', () => {
      canvas.focus();
  });
}

window.startCpuDefender = startCpuDefender;

class CpuGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.state = 'playing';
    this.score = 0;

    // IA
    this.ai = new window.CpuDefenderAI();
    this.mlModeActive = false;

    this.introSequence = false;
    this.evaluationPhase = false;
    this.evaluationTimer = 0;

    // Niveles
    this.currentLevel = 1;
    this.aiCheckTimer = 0;
    this.levelTimer = 0;

    // Munición
    this.maxAmmo = 50;
    this.ammo = this.maxAmmo;
    this.ammoBoxes = [];
    this.ammoBoxSpawnTimer = 0;

    // Probabilidades crudas (HUD)
    this.aiProbabilities = [0.33, 0.33, 0.34]; // EASY, NORMAL, HARD

    // ===== Ruta A: EMA + histéresis + cooldown =====
    this.aiEma = { easy: 0.33, normal: 0.33, hard: 0.34 };
    this.aiCooldownFrames = 0;

    // UI progreso suave
    this.aiProgressSmooth = 0;

    // alerta ammo bajo
    this.lowAmmoWarned = false;

    // ===== Parámetros Ruta A (AJUSTADO PARA MEJOR PROGRESIÓN) =====
    this.AI_EMA_ALPHA = 0.20;
    this.AI_UP_TH = 0.50;     // ANTES 0.72. Bajado para subir nivel más fácil.
    this.AI_DOWN_TH = 0.78;
    this.AI_NORMAL_LOCK = 0.55;
    this.AI_COOLDOWN_SEC = 4;
    this.AI_COOLDOWN_FRAMES = Math.floor(this.AI_COOLDOWN_SEC * 60);

    // ===== Tuning asistencia (bajar) =====
    this.ASSIST_FAST_HEALTH = 55;
    this.ASSIST_EMERGENCY_HEALTH = 35;
    this.ASSIST_DANGER_TH = 0.62;
    this.ASSIST_DANGER_TH_LOWHP = 0.54;
    this.ASSIST_CONFIRM_DEFAULT = 2;
    this.ASSIST_CONFIRM_FAST = 1;
    this.ASSIST_DMG_EMERGENCY = 6;

    // ===== Asistencia inteligente =====
    this.prevCpuHealth = 100;
    this.cpuDmgEma = 0;
    this.dangerEma = 0;
    this.assistCounter = 0;

    // Entidades
    this.cpu = new window.CpuBase(this.width / 2, this.height - 60);
    this.player = new window.PlayerTank(this.width / 2, this.height - 150);

    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.tanks = [];
    this.particles = [];

    this.keys = {};
    this.frameCount = 0;
    this.enemySpawnRate = 120;
    this.shootCooldown = 0;

    // Control para evitar spam de botones en mando
    this.gamepadRepairLocked = false;
    this.gamepadAiToggleLocked = false; // Bloqueo para el botón de IA
    this.gamepadRestartLocked = false;  // Bloqueo para el botón de reinicio

    // Inputs de Teclado
    this.handleKeyDown = (e) => {
      // Prevenir comportamiento por defecto
      if([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
          e.preventDefault();
      }

      this.keys[e.key.toLowerCase()] = true;

      // Reiniciar con Enter o Space cuando está en game over
      if (this.state === 'gameover' && (e.key === 'Enter' || e.key === ' ')) {
        this.restartGame();
        return;
      }

      // Disparo Teclado
      if (['z', 'x', 'c', ' ', 'enter'].includes(e.key.toLowerCase())) {
        if (this.state === 'playing' && !this.introSequence && this.shootCooldown <= 0 && this.ammo > 0) {
          this.player.shoot(this);
          this.shootCooldown = 10;
          this.ammo--;
          this.checkAmmoStatus();
        }
      }

      // Repair Teclado
      if (['q', 'e', 'shift'].includes(e.key.toLowerCase())) {
        this.repairCpu();
      }
    };

    this.handleKeyUp = (e) => {
      this.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    this.loop();
  }

  // Helper para revisar ammo
  checkAmmoStatus() {
    if (this.ammo <= 10 && !this.lowAmmoWarned && this.ammo > 0) {
      this.lowAmmoWarned = true;
      window.cpuShowAnnouncement("POCA MUNICIÓN", "RECOGE AMMO", 1200);
    }
    if (this.ammo <= 0) {
      window.cpuShowAnnouncement("SIN MUNICIÓN", "SISTEMA OFFLINE", 1600);
      this.gameOver();
    }
  }

  resetAiFilterState() {
    this.aiEma = { easy: 0.33, normal: 0.33, hard: 0.34 };
    this.aiCooldownFrames = 0;
    this.aiProgressSmooth = 0;
    this.levelTimer = 0;

    this.prevCpuHealth = 100;
    this.cpuDmgEma = 0;
    this.dangerEma = 0;
    this.assistCounter = 0;
  }

  async setMLMode(active) {
    this.mlModeActive = active;
    
    // Actualizar también el switch visual si existe
    const toggleBtn = document.getElementById('mlToggle');
    if(toggleBtn) toggleBtn.checked = active;

    if (active) {
      this.introSequence = true;
      this.enemies = [];
      this.tanks = [];
      this.enemyBullets = [];

      window.cpuSetLoading(true, "CARGANDO MODELO IA...");

      setTimeout(async () => {
        try {
          if (!this.ai.isLoaded) {
            const success = await this.ai.loadModel();
            if (!success) throw new Error("Fallo carga");
          }

          window.cpuSetLoading(false);
          window.cpuShowAnnouncement("SISTEMA IA", "ONLINE", 1500);
          await new Promise(r => setTimeout(r, 1500));

          window.cpuShowAnnouncement("NIVEL 1", "ROBOTS SIMPLES", 1500);
          await new Promise(r => setTimeout(r, 1500));

          this.introSequence = false;
          this.evaluationPhase = true;
          this.evaluationTimer = 0;

          this.currentLevel = 1;
          this.enemySpawnRate = 90;

          this.maxAmmo = 50;
          this.ammo = this.maxAmmo;
          this.lowAmmoWarned = false;

          this.resetAiFilterState();
        } catch (err) {
          console.error(err);
          window.cpuSetLoading(false);
          this.mlModeActive = false;
          this.introSequence = false;
          const t = document.getElementById('mlToggle');
          if (t) t.checked = false;
        }
      }, 100);
    } else {
      this.introSequence = false;
      this.currentLevel = 1;
      this.enemySpawnRate = 120;

      this.maxAmmo = 50;
      this.ammo = this.maxAmmo;
      this.lowAmmoWarned = false;

      window.cpuShowAnnouncement("MODO MANUAL", "IA DESACTIVADA");
      this.resetAiFilterState();
    }
  }

  repairCpu() {
    if (this.score >= 500 && this.cpu.health < 100) {
      this.score -= 500;
      this.cpu.health = Math.min(100, this.cpu.health + 30);
      this.createExplosion(this.cpu.x, this.cpu.y, 10, '#00ff00');
      updateScore(this.score);
    }
  }

  createExplosion(x, y, c, color) {
    for (let i = 0; i < c; i++) this.particles.push(new window.Particle(x, y, color));
  }

  spawnAmmoBox() {
    const x = 50 + Math.random() * (this.width - 100);
    this.ammoBoxes.push(new window.AmmoBox(x, -30));
  }

  spawnEnemy() {
    const x = 50 + Math.random() * (this.width - 100);

    if (this.mlModeActive && this.currentLevel === 3 && Math.random() < 0.3) {
      this.tanks.push(new window.ExplosiveTank(x, -30, this.currentLevel));
      return;
    }

    const canShoot = this.mlModeActive && this.currentLevel >= 2;
    const e = new window.RobotEnemy(x, -30, canShoot);

    if (this.currentLevel === 2) e.speed *= 1.2;
    if (this.currentLevel === 3) e.speed *= 1.5;

    this.enemies.push(e);
  }

  update() {
    if (this.state !== 'playing') return;
    if (this.introSequence) return;

    this.frameCount++;
    if (this.shootCooldown > 0) this.shootCooldown--;

    // ==========================================
    //  LÓGICA GAMEPAD (ARCADE STICK / MANDO)
    // ==========================================
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0]; // Tomamos el primer mando

    let activeInput = { ...this.keys };

    if (gp) {
      // 1. MOVIMIENTO (Palanca / Ejes)
      // Eje 1 (Vertical): -1 es Arriba, 1 es Abajo
      if (gp.axes[1] < -0.5) activeInput['gp_up'] = true;
      if (gp.axes[1] > 0.5)  activeInput['gp_down'] = true;

      // Eje 0 (Horizontal): -1 es Izquierda, 1 es Derecha
      if (gp.axes[0] < -0.5) activeInput['gp_left'] = true;
      if (gp.axes[0] > 0.5)  activeInput['gp_right'] = true;

      // 2. DISPARO
      if (gp.buttons[1].pressed) {
        if (this.shootCooldown <= 0 && this.ammo > 0) {
          this.player.shoot(this);
          this.shootCooldown = 15;
          this.ammo--;
          this.checkAmmoStatus();
        }
      }

      // 3. REPARAR (Botones 1, 2, 3)
      const btnRepair = gp.buttons[2]?.pressed;
      if (btnRepair && !this.gamepadRepairLocked) {
        this.repairCpu();
        this.gamepadRepairLocked = true;
      } else if (!btnRepair) {
        this.gamepadRepairLocked = false;
      }

      // 4. TOGGLE IA (NUEVO: Botón 4 o Botón 8/Select)
      const btnToggle = gp.buttons[4]?.pressed;
      if (btnToggle && !this.gamepadAiToggleLocked) {
        this.setMLMode(!this.mlModeActive);
        this.gamepadAiToggleLocked = true;
      } else if (!btnToggle) {
        this.gamepadAiToggleLocked = false;
      }
    }

    // Player movement
    this.player.update(activeInput, this.width, this.height);

    // ===== IA + NIVELES (Ruta A) =====
    if (this.mlModeActive && this.ai.isLoaded) {
      if (this.evaluationPhase) {
        this.evaluationTimer++;
        if (this.evaluationTimer > 120) {
          this.evaluationPhase = false;
          window.cpuShowAnnouncement("CALIBRACION", "COMPLETA");
        }
      }

      this.aiCheckTimer++;
      if (this.aiCheckTimer > 30) {
        this.aiCheckTimer = 0;

        if (this.aiCooldownFrames > 0) this.aiCooldownFrames -= 30;
        if (this.aiCooldownFrames < 0) this.aiCooldownFrames = 0;

        const result = this.ai.predict(this.score, this.cpu.health, this.enemies.length, this.frameCount);
        this.aiProbabilities = result.probabilities;

        const pEasy = this.aiProbabilities[0] ?? 0.33;
        const pNormal = this.aiProbabilities[1] ?? 0.33;
        const pHard = this.aiProbabilities[2] ?? 0.34;

        const a = this.AI_EMA_ALPHA;
        this.aiEma.easy = a * pEasy + (1 - a) * this.aiEma.easy;
        this.aiEma.normal = a * pNormal + (1 - a) * this.aiEma.normal;
        this.aiEma.hard = a * pHard + (1 - a) * this.aiEma.hard;

        const canChange =
          this.aiCooldownFrames === 0 &&
          !this.evaluationPhase &&
          !this.introSequence;

        if (canChange) {
          if (this.aiEma.normal < this.AI_NORMAL_LOCK) {

            // ===== SUBIR NIVEL =====
            if (this.aiEma.hard >= this.AI_UP_TH) {
              if (this.currentLevel === 1) {
                this.currentLevel = 2;
                this.levelTimer = 0;
                this.maxAmmo = 75;
                window.cpuShowAnnouncement("NIVEL 2", "¡ROBOTS ARMADOS!");
                this.aiCooldownFrames = this.AI_COOLDOWN_FRAMES;
              } else if (this.currentLevel === 2) {
                this.levelTimer++;
                if (this.levelTimer > 8) {
                  this.currentLevel = 3;
                  this.maxAmmo = 100;
                  window.cpuShowAnnouncement("NIVEL 3", "¡TANQUES EXPLOSIVOS!");
                  this.aiCooldownFrames = this.AI_COOLDOWN_FRAMES;
                }
              }
            } else {
              if (this.currentLevel === 2) this.levelTimer = 0;
            }

            // ===== BAJAR NIVEL =====
            const currentHealth = this.cpu.health;
            const prevH = (this.prevCpuHealth ?? currentHealth);
            const healthLoss = Math.max(0, prevH - currentHealth);
            this.prevCpuHealth = currentHealth;

            const dmgAlpha = 0.25;
            this.cpuDmgEma = dmgAlpha * healthLoss + (1 - dmgAlpha) * (this.cpuDmgEma ?? 0);

            const enemyPressure = Math.min(1, this.enemies.length / 15);
            const ammoPressure = 1 - (this.ammo / Math.max(1, this.maxAmmo));

            const dangerNow =
              (1 - currentHealth / 100) * 0.60 +
              enemyPressure * 0.30 +
              ammoPressure * 0.10;

            const dangerAlpha = 0.20;
            this.dangerEma = dangerAlpha * dangerNow + (1 - dangerAlpha) * (this.dangerEma ?? 0);

            const dynamicDownTh =
              this.AI_DOWN_TH - 0.30 * (1 - currentHealth / 100);

            const dangerTh = (currentHealth <= this.ASSIST_FAST_HEALTH)
              ? this.ASSIST_DANGER_TH_LOWHP
              : this.ASSIST_DANGER_TH;

            const confirmNeeded = (currentHealth <= this.ASSIST_FAST_HEALTH)
              ? this.ASSIST_CONFIRM_FAST
              : this.ASSIST_CONFIRM_DEFAULT;

            const emergency =
              (currentHealth <= this.ASSIST_EMERGENCY_HEALTH) ||
              (this.cpuDmgEma >= this.ASSIST_DMG_EMERGENCY);

            const shouldAssist =
              (this.aiEma.easy >= dynamicDownTh && this.aiEma.hard < 0.55) ||
              (this.dangerEma >= dangerTh);

            if (this.currentLevel > 1 && (shouldAssist || emergency)) {
              this.assistCounter++;
            } else {
              this.assistCounter = 0;
            }

            if (this.currentLevel > 1 && (emergency || this.assistCounter >= confirmNeeded)) {
              this.currentLevel = Math.max(1, this.currentLevel - 1);
              this.maxAmmo = this.currentLevel === 1 ? 50 : 75;
              window.cpuShowAnnouncement("ASISTENCIA", "BAJANDO DIFICULTAD");
              this.aiCooldownFrames = this.AI_COOLDOWN_FRAMES;
              this.levelTimer = 0;
              this.assistCounter = 0;
              this.prevCpuHealth = this.cpu.health;
            }
          }
        }
      }

      if (this.currentLevel === 1) this.enemySpawnRate = 90;
      if (this.currentLevel === 2) this.enemySpawnRate = 60;
      if (this.currentLevel === 3) this.enemySpawnRate = 50;

    } else {
      this.enemySpawnRate = 120;
    }

    // ===== Spawn Cajas =====
    this.ammoBoxSpawnTimer++;
    const ammoSpawnRate = this.currentLevel === 1 ? 300 : this.currentLevel === 2 ? 250 : 200;
    if (this.ammoBoxSpawnTimer > ammoSpawnRate) {
      this.spawnAmmoBox();
      this.ammoBoxSpawnTimer = 0;
    }

    this.ammoBoxes.forEach((box, i) => {
      box.update();

      if (box.y > this.height) {
        this.ammoBoxes.splice(i, 1);
        return;
      }

      if (Math.hypot(box.x - this.player.x, box.y - this.player.y) < 25) {
        const ammoGain = this.currentLevel === 1 ? 20 : this.currentLevel === 2 ? 30 : 40;
        this.ammo = Math.min(this.maxAmmo, this.ammo + ammoGain);
        if (this.ammo > 10) this.lowAmmoWarned = false;
        this.createExplosion(box.x, box.y, 8, '#ffcc00');
        this.ammoBoxes.splice(i, 1);
      }

      this.bullets.forEach((b, bi) => {
        if (Math.hypot(box.x - b.x, box.y - b.y) < 20) {
          const ammoGain = this.currentLevel === 1 ? 20 : this.currentLevel === 2 ? 30 : 40;
          this.ammo = Math.min(this.maxAmmo, this.ammo + ammoGain);
          if (this.ammo > 10) this.lowAmmoWarned = false;
          this.createExplosion(box.x, box.y, 8, '#ffcc00');
          this.ammoBoxes.splice(i, 1);
          this.bullets.splice(bi, 1);
        }
      });
    });

    if (this.frameCount % this.enemySpawnRate === 0) this.spawnEnemy();

    this.bullets.forEach((b, i) => {
      b.update();
      if (b.y < 0) this.bullets.splice(i, 1);
    });

    this.enemyBullets.forEach((b, i) => {
      b.update();
      if (b.y > this.height) {
        this.enemyBullets.splice(i, 1);
        return;
      }
      if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < 20) {
        this.cpu.takeDamage(5);
        this.createExplosion(this.player.x, this.player.y, 5, '#ff6600');
        this.enemyBullets.splice(i, 1);
        if (this.cpu.health <= 0) this.gameOver();
      }
    });

    this.enemies.forEach((e, ei) => {
      e.update(this);
      if (e.y > this.height - 90) {
        this.cpu.takeDamage(10);
        this.createExplosion(e.x, e.y, 5, 'red');
        this.enemies.splice(ei, 1);
        if (this.cpu.health <= 0) this.gameOver();
        return;
      }
      this.bullets.forEach((b, bi) => {
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
          this.createExplosion(e.x, e.y, 8, '#ffaa00');
          this.enemies.splice(ei, 1);
          this.bullets.splice(bi, 1);
          this.score += 50;
          updateScore(this.score);
        }
      });
    });

    this.tanks.forEach((t, ti) => {
      t.update(this);
      if (t.y > this.height - 90) {
        this.cpu.takeDamage(20);
        this.createExplosion(t.x, t.y, 15, '#ff0000');
        this.tanks.splice(ti, 1);
        if (this.cpu.health <= 0) this.gameOver();
        return;
      }
      this.bullets.forEach((b, bi) => {
        if (Math.hypot(t.x - b.x, t.y - b.y) < 20) {
          this.createExplosion(t.x, t.y, 20, '#ff6600');
          const explosionRadius = 80;
          this.enemies.forEach((e, ei2) => {
            if (Math.hypot(e.x - t.x, e.y - t.y) < explosionRadius) {
              this.createExplosion(e.x, e.y, 8, '#ffaa00');
              this.enemies.splice(ei2, 1);
              this.score += 25;
            }
          });
          this.tanks.splice(ti, 1);
          this.bullets.splice(bi, 1);
          this.score += 200;
          updateScore(this.score);
        }
      });
    });

    this.particles.forEach((p, i) => {
      p.update();
      if (p.life <= 0) this.particles.splice(i, 1);
    });
  }

  drawCircuitBoard(ctx) {
    // Fondo base cyberpunk oscuro
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#0d1020');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid de circuitos
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Líneas verticales
    for (let x = 0; x < this.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // Líneas horizontales
    for (let y = 0; y < this.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Circuitos principales (más brillantes)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
    ctx.lineWidth = 2;

    // Línea central vertical
    ctx.beginPath();
    ctx.moveTo(this.width / 2, 0);
    ctx.lineTo(this.width / 2, this.height);
    ctx.stroke();

    // Líneas diagonales decorativas
    ctx.strokeStyle = 'rgba(255, 0, 102, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(200, 200);
    ctx.moveTo(this.width, 0);
    ctx.lineTo(this.width - 200, 200);
    ctx.moveTo(0, this.height);
    ctx.lineTo(200, this.height - 200);
    ctx.moveTo(this.width, this.height);
    ctx.lineTo(this.width - 200, this.height - 200);
    ctx.stroke();

    // Nodos de circuito (puntos brillantes en intersecciones)
    const nodePositions = [
      [100, 100], [200, 150], [350, 100], [500, 150], [600, 100],
      [150, 250], [350, 300], [550, 250],
      [100, 400], [250, 450], [450, 450], [600, 400]
    ];

    nodePositions.forEach(([nx, ny]) => {
      // Glow exterior
      const nodeGlow = ctx.createRadialGradient(nx, ny, 0, nx, ny, 15);
      nodeGlow.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
      nodeGlow.addColorStop(1, 'rgba(0, 255, 255, 0)');
      ctx.fillStyle = nodeGlow;
      ctx.beginPath();
      ctx.arc(nx, ny, 15, 0, Math.PI * 2);
      ctx.fill();

      // Punto central
      ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(nx, ny, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Pulsos de energía animados en las líneas
    const pulseOffset = (this.frameCount * 2) % 100;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 2;

    // Pulso horizontal
    ctx.beginPath();
    ctx.moveTo(pulseOffset * 7, this.height / 2);
    ctx.lineTo(pulseOffset * 7 + 30, this.height / 2);
    ctx.stroke();

    // Pulso vertical
    ctx.beginPath();
    ctx.moveTo(this.width / 2, pulseOffset * 6);
    ctx.lineTo(this.width / 2, pulseOffset * 6 + 30);
    ctx.stroke();
  }

  draw() {
    const ctx = this.ctx;

    // Fondo cyberpunk con circuitos
    this.drawCircuitBoard(ctx);

    // Dibujar entidades del juego
    this.cpu.draw(ctx);
    this.tanks.forEach(t => t.draw(ctx));
    this.ammoBoxes.forEach(box => box.draw(ctx));
    this.enemyBullets.forEach(b => b.draw(ctx));
    this.bullets.forEach(b => b.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    this.player.draw(ctx);
    this.particles.forEach(p => p.draw(ctx));

    // Actualizar barra de munición visual (HTML)
    this.updateAmmoBar();

    // Actualizar HUD de IA (HTML)
    this.updateAIStatusHud();

    // HUD IA en canvas (barra de probabilidades)
    if (this.mlModeActive && !this.introSequence && !this.evaluationPhase) {
      this.drawAIProbabilityBar(ctx);
    }
  }

  updateAmmoBar() {
    const ammoFill = document.getElementById('ammo-bar-fill');
    if (!ammoFill) return;

    const percentage = (this.ammo / this.maxAmmo) * 100;
    ammoFill.style.width = `${percentage}%`;

    // Clase para munición baja
    if (this.ammo <= 10) {
      ammoFill.classList.add('low');
    } else {
      ammoFill.classList.remove('low');
    }
  }

  updateAIStatusHud() {
    const aiHud = document.getElementById('ai-status-hud');
    const aiLevelText = document.getElementById('ai-level-text');
    const aiStatusSub = document.getElementById('ai-status-sub');

    if (!aiHud || !aiLevelText || !aiStatusSub) return;

    if (this.mlModeActive) {
      aiHud.style.display = 'flex';

      if (this.introSequence) {
        aiLevelText.textContent = 'AI: INIT';
        aiLevelText.style.color = '#ffff00';
        aiStatusSub.textContent = 'CARGANDO...';
      } else if (this.evaluationPhase) {
        aiLevelText.textContent = 'AI: SCAN';
        aiLevelText.style.color = '#ffff00';
        aiStatusSub.textContent = 'CALIBRANDO...';
      } else {
        const levelColors = ['#00ff66', '#ffaa00', '#ff0066'];
        const levelNames = ['FÁCIL', 'NORMAL', 'DIFÍCIL'];
        aiLevelText.textContent = `AI LVL: ${this.currentLevel}`;
        aiLevelText.style.color = levelColors[this.currentLevel - 1];
        aiStatusSub.textContent = levelNames[this.currentLevel - 1];
      }
    } else {
      aiHud.style.display = 'none';
    }
  }

  drawAIProbabilityBar(ctx) {
    const barX = 20;
    const barY = 80;
    const barWidth = 180;
    const barHeight = 16;

    // Fondo con borde neón
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    const easyWidth = barWidth * (this.aiProbabilities[0] ?? 0.33);
    const normalWidth = barWidth * (this.aiProbabilities[1] ?? 0.33);
    const hardWidth = barWidth * (this.aiProbabilities[2] ?? 0.34);

    // Barras con gradientes
    const easyGrad = ctx.createLinearGradient(barX, barY, barX + easyWidth, barY);
    easyGrad.addColorStop(0, '#00ff66');
    easyGrad.addColorStop(1, '#00cc44');
    ctx.fillStyle = easyGrad;
    ctx.fillRect(barX, barY, easyWidth, barHeight);

    const normalGrad = ctx.createLinearGradient(barX + easyWidth, barY, barX + easyWidth + normalWidth, barY);
    normalGrad.addColorStop(0, '#ffff00');
    normalGrad.addColorStop(1, '#ffaa00');
    ctx.fillStyle = normalGrad;
    ctx.fillRect(barX + easyWidth, barY, normalWidth, barHeight);

    const hardGrad = ctx.createLinearGradient(barX + easyWidth + normalWidth, barY, barX + barWidth, barY);
    hardGrad.addColorStop(0, '#ff6600');
    hardGrad.addColorStop(1, '#ff0066');
    ctx.fillStyle = hardGrad;
    ctx.fillRect(barX + easyWidth + normalWidth, barY, hardWidth, barHeight);

    // Borde neón
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Labels pequeños
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    if (easyWidth > 25) ctx.fillText('E', barX + easyWidth / 2, barY + 11);
    if (normalWidth > 25) ctx.fillText('N', barX + easyWidth + normalWidth / 2, barY + 11);
    if (hardWidth > 25) ctx.fillText('H', barX + easyWidth + normalWidth + hardWidth / 2, barY + 11);

    // Barra de progreso de upgrade
    if (this.currentLevel < 3) {
      const progressBarY = barY + 22;
      const target = Math.min(1, this.aiEma.hard / this.AI_UP_TH);
      this.aiProgressSmooth += (target - this.aiProgressSmooth) * 0.12;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(barX, progressBarY, barWidth, 8);

      const isReady = this.aiEma.hard >= this.AI_UP_TH;
      const pulse = Math.sin(Date.now() * 0.01) * 0.15 + 0.85;

      // Gradiente para la barra de progreso
      const progressGrad = ctx.createLinearGradient(barX, progressBarY, barX + barWidth * this.aiProgressSmooth, progressBarY);
      progressGrad.addColorStop(0, isReady ? '#ff0066' : '#00ffff');
      progressGrad.addColorStop(1, isReady ? '#ff00ff' : '#00ff66');

      ctx.fillStyle = progressGrad;
      if (isReady) ctx.globalAlpha = pulse;
      ctx.fillRect(barX, progressBarY, barWidth * this.aiProgressSmooth, 8);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, progressBarY, barWidth, 8);

      // Texto de upgrade
      ctx.font = '6px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillStyle = isReady ? '#ff0066' : '#00ffff';

      const pct = Math.floor(this.aiProgressSmooth * 100);
      const txt = isReady ? '>> UPGRADE READY!' : `UPGRADE: ${pct}%`;
      ctx.fillText(txt, barX, progressBarY + 18);

      if (this.aiCooldownFrames > 0) {
        ctx.fillStyle = '#666';
        ctx.fillText('COOLDOWN', barX + 100, progressBarY + 18);
      }
    }

    ctx.textAlign = 'left';
  }

  gameOver() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    const over = document.getElementById('cpu-game-over');
    if (over) over.style.display = 'block';
    const finalScore = document.getElementById('final-cpu-score');
    if (finalScore) finalScore.innerText = this.score;

    // NO removemos los listeners para poder detectar reinicio
    // Iniciamos el loop de game over para detectar input de reinicio
    this.gameOverLoop();
  }

  restartGame() {
    // Ocultar mensaje de game over
    const over = document.getElementById('cpu-game-over');
    if (over) over.style.display = 'none';

    // Reiniciar estado del juego
    this.state = 'playing';
    this.score = 0;
    this.frameCount = 0;

    // Reiniciar entidades
    this.cpu = new window.CpuBase(this.width / 2, this.height - 60);
    this.player = new window.PlayerTank(this.width / 2, this.height - 150);

    // Limpiar arrays
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.tanks = [];
    this.particles = [];
    this.ammoBoxes = [];

    // Reiniciar munición
    this.maxAmmo = 50;
    this.ammo = this.maxAmmo;
    this.lowAmmoWarned = false;
    this.ammoBoxSpawnTimer = 0;

    // Reiniciar IA si estaba activa
    if (this.mlModeActive) {
      this.currentLevel = 1;
      this.enemySpawnRate = 90;
      this.resetAiFilterState();
    } else {
      this.currentLevel = 1;
      this.enemySpawnRate = 120;
    }

    // Reiniciar controles de gamepad
    this.gamepadRepairLocked = false;
    this.gamepadAiToggleLocked = false;
    this.gamepadRestartLocked = false;

    // Actualizar score UI
    updateScore(this.score);

    // Reiniciar el loop principal
    this.loop();
  }

  gameOverLoop() {
    if (this.state !== 'gameover') return;

    // Detectar input de gamepad para reiniciar
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];

    if (gp) {
      const selectPressed = gp.buttons[8]?.pressed || false; // SELECT
      const startPressed = gp.buttons[9]?.pressed || false;  // START
      const aPressed = gp.buttons[1]?.pressed || false;      // A

      if ((selectPressed || startPressed || aPressed) && !this.gamepadRestartLocked) {
        this.gamepadRestartLocked = true;
        this.restartGame();
        return;
      }

      if (!selectPressed && !startPressed && !aPressed) {
        this.gamepadRestartLocked = false;
      }
    }

    // Continuar el loop de game over
    requestAnimationFrame(() => this.gameOverLoop());
  }

  destroy() {
    this.state = 'destroyed';
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  loop() {
    if (this.state !== 'destroyed') {
      this.update();
      this.draw();
      if (this.state === 'playing') {
        this.animationId = requestAnimationFrame(() => this.loop());
      }
    }
  }
}