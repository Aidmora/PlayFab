/* ==================================================
   CPU DEFENDER - ENTITIES
   (Físicas ajustadas: Control preciso y frenado rápido)
   ================================================== */

class CpuBase {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.health = 100;
    this.pulse = 0;
  }

  draw(ctx) {
    this.pulse += 0.05;
    const healthPercent = this.health / 100;
    const dangerMode = this.health <= 30;
    const criticalPulse = dangerMode ? Math.sin(this.pulse * 8) * 0.5 + 0.5 : 1;

    // === CPU BASE CYBERPUNK ===

    // Plataforma base
    ctx.fillStyle = '#0a1a2a';
    ctx.fillRect(this.x - 60, this.y + 15, 120, 25);

    // Glow de la base según salud
    const glowColor = dangerMode ? '#ff0066' : '#00ffff';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = dangerMode ? 20 * criticalPulse : 15;

    // Cuerpo principal del CPU
    const cpuGrad = ctx.createLinearGradient(this.x - 45, this.y - 25, this.x + 45, this.y + 15);
    cpuGrad.addColorStop(0, '#1a3344');
    cpuGrad.addColorStop(0.5, '#2a4455');
    cpuGrad.addColorStop(1, '#1a3344');
    ctx.fillStyle = cpuGrad;
    ctx.fillRect(this.x - 45, this.y - 25, 90, 40);

    ctx.shadowBlur = 0;

    // Borde neón
    ctx.strokeStyle = dangerMode ? `rgba(255, 0, 102, ${criticalPulse})` : '#00ffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x - 45, this.y - 25, 90, 40);

    // Núcleo central brillante
    const coreGrad = ctx.createRadialGradient(this.x, this.y - 5, 0, this.x, this.y - 5, 25);
    if (dangerMode) {
      coreGrad.addColorStop(0, `rgba(255, 0, 102, ${0.8 * criticalPulse})`);
      coreGrad.addColorStop(1, 'rgba(100, 0, 50, 0.3)');
    } else {
      coreGrad.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
      coreGrad.addColorStop(1, 'rgba(0, 100, 150, 0.3)');
    }
    ctx.fillStyle = coreGrad;
    ctx.fillRect(this.x - 35, this.y - 18, 70, 26);

    // Circuitos decorativos
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 1;

    // Líneas de circuito izquierda
    ctx.beginPath();
    ctx.moveTo(this.x - 40, this.y - 15);
    ctx.lineTo(this.x - 55, this.y - 15);
    ctx.lineTo(this.x - 55, this.y + 5);
    ctx.moveTo(this.x - 40, this.y);
    ctx.lineTo(this.x - 50, this.y);
    ctx.stroke();

    // Líneas de circuito derecha
    ctx.beginPath();
    ctx.moveTo(this.x + 40, this.y - 15);
    ctx.lineTo(this.x + 55, this.y - 15);
    ctx.lineTo(this.x + 55, this.y + 5);
    ctx.moveTo(this.x + 40, this.y);
    ctx.lineTo(this.x + 50, this.y);
    ctx.stroke();

    // Texto "CPU" o símbolo
    ctx.fillStyle = dangerMode ? '#ff0066' : '#00ffff';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('CPU', this.x, this.y + 2);

    // LEDs de estado
    const ledColors = [
      healthPercent > 0.7 ? '#00ff66' : '#333',
      healthPercent > 0.4 ? '#ffff00' : '#333',
      healthPercent > 0.1 ? '#ff6600' : '#333'
    ];

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ledColors[i];
      ctx.beginPath();
      ctx.arc(this.x - 25 + i * 25, this.y - 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // === BARRA DE SALUD MEJORADA ===
    const barWidth = 100;
    const barHeight = 10;
    const barX = this.x - barWidth / 2;
    const barY = this.y + 30;

    // Fondo de la barra
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // Borde
    ctx.strokeStyle = dangerMode ? '#ff0066' : '#00ffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // Relleno de salud con gradiente
    const healthGrad = ctx.createLinearGradient(barX, barY, barX + barWidth * healthPercent, barY);
    if (healthPercent > 0.6) {
      healthGrad.addColorStop(0, '#00ff66');
      healthGrad.addColorStop(1, '#00cc44');
    } else if (healthPercent > 0.3) {
      healthGrad.addColorStop(0, '#ffff00');
      healthGrad.addColorStop(1, '#ffaa00');
    } else {
      healthGrad.addColorStop(0, '#ff0066');
      healthGrad.addColorStop(1, '#cc0044');
    }

    ctx.fillStyle = healthGrad;
    if (dangerMode) ctx.globalAlpha = criticalPulse;
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    ctx.globalAlpha = 1;

    // Texto de porcentaje
    ctx.fillStyle = '#ffffff';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText(`${Math.floor(this.health)}%`, this.x, barY + 8);

    ctx.textAlign = 'left';
  }

  takeDamage(n) {
    this.health -= n;
  }
}

class PlayerTank {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    
    // === FÍSICAS "ARCADE PRECISO" ===
    this.vx = 0; 
    this.vy = 0; 
    
    // Ajustes para evitar el "efecto hielo":
    this.maxSpeed = 7;       // Velocidad tope ágil
    this.acceleration = 2.0; // Respuesta inmediata al mover la palanca
    this.friction = 0.70;    // Frenado fuerte (0.70 retiene menos velocidad que 0.85)
  }

  update(keys, w, h) {
    // 1. ACELERACIÓN (Fuerza de movimiento)
    // Si detectamos input, aplicamos fuerza en esa dirección
    let inputX = 0;
    let inputY = 0;

    if (keys['w'] || keys['arrowup'] || keys['gp_up'])    inputY = -1;
    if (keys['s'] || keys['arrowdown'] || keys['gp_down'])  inputY = 1;
    if (keys['a'] || keys['arrowleft'] || keys['gp_left'])  inputX = -1;
    if (keys['d'] || keys['arrowright'] || keys['gp_right']) inputX = 1;

    // Aplicar aceleración
    if (inputX !== 0) this.vx += inputX * this.acceleration;
    if (inputY !== 0) this.vy += inputY * this.acceleration;

    // 2. FRICCIÓN (Frenado)
    // Si NO hay input, la fricción actúa más fuerte para detenerte rápido
    // Si HAY input, la fricción evita que aceleres infinitamente
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 3. LIMITAR VELOCIDAD (Clamping)
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > this.maxSpeed) {
        // Normalizar y escalar a maxSpeed
        const scale = this.maxSpeed / currentSpeed;
        this.vx *= scale;
        this.vy *= scale;
    }

    // 4. STOP TOTAL (Evitar micro-deslizamiento final)
    if (Math.abs(this.vx) < 0.1) this.vx = 0;
    if (Math.abs(this.vy) < 0.1) this.vy = 0;

    // 5. ACTUALIZAR POSICIÓN
    this.x += this.vx;
    this.y += this.vy;

    // 6. LÍMITES DE PANTALLA (Rebote suave opcional, aquí es tope seco)
    if (this.x < 25) { this.x = 25; this.vx = 0; }
    if (this.x > w - 25) { this.x = w - 25; this.vx = 0; }
    if (this.y < 100) { this.y = 100; this.vy = 0; }
    if (this.y > h - 170) { this.y = h - 170; this.vy = 0; }
  }

  shoot(game) {
    game.bullets.push(new Bullet(this.x, this.y - 25, -8, '#ffff00'));
  }

  draw(ctx) {
    // === TANQUE FUTURISTA CYBERPUNK ===

    // Sombra/glow del tanque
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;

    // Cuerpo principal (hexagonal futurista)
    ctx.fillStyle = '#1a3a4a';
    ctx.beginPath();
    ctx.moveTo(this.x - 22, this.y);
    ctx.lineTo(this.x - 18, this.y - 12);
    ctx.lineTo(this.x + 18, this.y - 12);
    ctx.lineTo(this.x + 22, this.y);
    ctx.lineTo(this.x + 18, this.y + 12);
    ctx.lineTo(this.x - 18, this.y + 12);
    ctx.closePath();
    ctx.fill();

    // Borde neón del cuerpo
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Cañón superior (con glow)
    const cannonGlow = ctx.createLinearGradient(this.x, this.y - 28, this.x, this.y - 8);
    cannonGlow.addColorStop(0, '#00ffff');
    cannonGlow.addColorStop(1, '#0088aa');
    ctx.fillStyle = cannonGlow;
    ctx.fillRect(this.x - 4, this.y - 28, 8, 20);

    // Punta del cañón (brillante)
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(this.x - 3, this.y - 32, 6, 5);

    // Orugas laterales (estilo tech)
    const trackGrad = ctx.createLinearGradient(this.x - 26, this.y, this.x - 18, this.y);
    trackGrad.addColorStop(0, '#333');
    trackGrad.addColorStop(0.5, '#555');
    trackGrad.addColorStop(1, '#333');
    ctx.fillStyle = trackGrad;
    ctx.fillRect(this.x - 26, this.y - 10, 8, 20);
    ctx.fillRect(this.x + 18, this.y - 10, 8, 20);

    // Detalles de las orugas
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(this.x - 25, this.y - 8 + i * 5, 6, 3);
      ctx.strokeRect(this.x + 19, this.y - 8 + i * 5, 6, 3);
    }

    // Cabina central (ventana)
    ctx.fillStyle = '#003344';
    ctx.fillRect(this.x - 10, this.y - 6, 20, 12);

    // Ventana con glow
    const windowGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 12);
    windowGlow.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
    windowGlow.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
    ctx.fillStyle = windowGlow;
    ctx.fillRect(this.x - 8, this.y - 4, 16, 8);

    // Líneas decorativas neón
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x - 15, this.y + 8);
    ctx.lineTo(this.x - 5, this.y + 8);
    ctx.moveTo(this.x + 5, this.y + 8);
    ctx.lineTo(this.x + 15, this.y + 8);
    ctx.stroke();

    // Indicador de dirección (flecha frontal)
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 15);
    ctx.lineTo(this.x - 4, this.y - 10);
    ctx.lineTo(this.x + 4, this.y - 10);
    ctx.closePath();
    ctx.fill();
  }
}

class Bullet {
  constructor(x, y, vy, color) {
    this.x = x;
    this.y = y;
    this.vy = vy;
    this.radius = 4;
    this.color = color;
    this.trail = [];
    this.maxTrail = 5;
  }

  update() {
    // Guardar posición para el trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    this.y += this.vy;
  }

  draw(ctx) {
    // === PROYECTIL CYBERPUNK CON TRAIL ===

    // Trail (estela)
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (i / this.trail.length) * 0.5;
      const size = (i / this.trail.length) * this.radius;

      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Glow del proyectil
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    // Proyectil principal (forma de flecha/laser)
    const isPlayerBullet = this.vy < 0;

    if (isPlayerBullet) {
      // Bala del jugador - láser cyan
      const laserGrad = ctx.createLinearGradient(this.x, this.y - 8, this.x, this.y + 4);
      laserGrad.addColorStop(0, '#ffffff');
      laserGrad.addColorStop(0.3, this.color);
      laserGrad.addColorStop(1, 'rgba(0, 255, 255, 0.3)');
      ctx.fillStyle = laserGrad;

      // Forma alargada
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 10);
      ctx.lineTo(this.x - 3, this.y + 4);
      ctx.lineTo(this.x + 3, this.y + 4);
      ctx.closePath();
      ctx.fill();
    } else {
      // Bala enemiga - esfera de energía
      const enemyGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius + 2);
      enemyGrad.addColorStop(0, '#ffffff');
      enemyGrad.addColorStop(0.4, this.color);
      enemyGrad.addColorStop(1, 'rgba(255, 0, 102, 0)');
      ctx.fillStyle = enemyGrad;

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.fill();

      // Núcleo brillante
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }
}

class AmmoBox {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 1.5;
    this.pulse = 0;
    this.rotation = 0;
  }

  update() {
    this.y += this.speed;
    this.pulse += 0.12;
    this.rotation += 0.03;
  }

  draw(ctx) {
    // === POWER-UP BRILLANTE CYBERPUNK ===
    const glow = Math.sin(this.pulse) * 0.3 + 0.7;
    const floatOffset = Math.sin(this.pulse * 2) * 2;

    ctx.save();
    ctx.translate(this.x, this.y + floatOffset);

    // Glow exterior
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 15 + Math.sin(this.pulse) * 5;

    // Forma de diamante/cristal
    ctx.fillStyle = '#003322';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Interior brillante
    const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
    innerGrad.addColorStop(0, `rgba(0, 255, 102, ${glow})`);
    innerGrad.addColorStop(0.6, 'rgba(0, 200, 80, 0.6)');
    innerGrad.addColorStop(1, 'rgba(0, 100, 50, 0.3)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();

    // Borde neón
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.stroke();

    // Símbolo de munición
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', 0, 5);

    // Partículas orbitando
    ctx.fillStyle = '#00ff66';
    for (let i = 0; i < 3; i++) {
      const angle = this.rotation + (i * Math.PI * 2 / 3);
      const orbitRadius = 20;
      const px = Math.cos(angle) * orbitRadius;
      const py = Math.sin(angle) * orbitRadius * 0.5;

      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.textAlign = 'left';
  }
}

class RobotEnemy {
  constructor(x, y, canShoot) {
    this.x = x;
    this.y = y;
    this.speed = 1.2 + Math.random() * 0.5;
    this.radius = 18;
    this.canShoot = canShoot;
    this.shootCooldown = 60 + Math.random() * 60;
    this.dodgeDirection = Math.random() > 0.5 ? 1 : -1;
    this.dodgeTimer = 0;
    this.animFrame = 0;
    this.legOffset = 0;
  }

  update(game) {
    this.y += this.speed;
    this.animFrame += 0.15;
    this.legOffset = Math.sin(this.animFrame * 3) * 3;

    if (this.canShoot) {
      this.dodgeTimer++;
      if (this.dodgeTimer > 30) {
        this.dodgeDirection *= -1;
        this.dodgeTimer = 0;
      }
      this.x += this.dodgeDirection * 0.8;
      this.x = Math.max(30, Math.min(game.width - 30, this.x));
    }

    if (this.canShoot) {
      this.shootCooldown--;
      if (this.shootCooldown <= 0) {
        game.enemyBullets.push(new Bullet(this.x, this.y + 18, 5, '#ff0066'));
        this.shootCooldown = 80 + Math.random() * 40;
      }
    }
  }

  draw(ctx) {
    // === BUG/VIRUS ENEMIGO CYBERPUNK ===
    const pulse = Math.sin(this.animFrame) * 0.2 + 0.8;

    // Glow exterior
    ctx.shadowColor = '#ff0066';
    ctx.shadowBlur = 10;

    // Cuerpo del bug (forma de insecto/virus)
    ctx.fillStyle = '#330022';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 16, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Segmentos del cuerpo
    ctx.fillStyle = '#660033';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y - 8, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 8, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Patas animadas (6 patas de bug)
    ctx.strokeStyle = '#ff0066';
    ctx.lineWidth = 2;

    // Patas izquierdas
    ctx.beginPath();
    ctx.moveTo(this.x - 12, this.y - 5);
    ctx.lineTo(this.x - 22, this.y - 10 + this.legOffset);
    ctx.moveTo(this.x - 14, this.y);
    ctx.lineTo(this.x - 24, this.y + this.legOffset);
    ctx.moveTo(this.x - 12, this.y + 5);
    ctx.lineTo(this.x - 22, this.y + 10 - this.legOffset);
    ctx.stroke();

    // Patas derechas
    ctx.beginPath();
    ctx.moveTo(this.x + 12, this.y - 5);
    ctx.lineTo(this.x + 22, this.y - 10 - this.legOffset);
    ctx.moveTo(this.x + 14, this.y);
    ctx.lineTo(this.x + 24, this.y - this.legOffset);
    ctx.moveTo(this.x + 12, this.y + 5);
    ctx.lineTo(this.x + 22, this.y + 10 + this.legOffset);
    ctx.stroke();

    // Ojos brillantes
    ctx.fillStyle = `rgba(255, 0, 102, ${pulse})`;
    ctx.beginPath();
    ctx.arc(this.x - 6, this.y - 10, 4, 0, Math.PI * 2);
    ctx.arc(this.x + 6, this.y - 10, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupila
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x - 6, this.y - 10, 2, 0, Math.PI * 2);
    ctx.arc(this.x + 6, this.y - 10, 2, 0, Math.PI * 2);
    ctx.fill();

    // Antenas
    ctx.strokeStyle = '#ff0066';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x - 4, this.y - 18);
    ctx.lineTo(this.x - 8, this.y - 28);
    ctx.moveTo(this.x + 4, this.y - 18);
    ctx.lineTo(this.x + 8, this.y - 28);
    ctx.stroke();

    // Puntas de antenas brillantes
    ctx.fillStyle = '#ff0066';
    ctx.beginPath();
    ctx.arc(this.x - 8, this.y - 28, 2, 0, Math.PI * 2);
    ctx.arc(this.x + 8, this.y - 28, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cañón si puede disparar
    if (this.canShoot) {
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(this.x - 4, this.y + 14, 8, 10);

      // Indicador de disparo
      if (this.shootCooldown < 10) {
        ctx.fillStyle = `rgba(255, 255, 0, ${1 - this.shootCooldown / 10})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y + 26, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Borde del cuerpo
    ctx.strokeStyle = '#ff0066';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 16, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

class ExplosiveTank {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.speed = 1 + Math.random() * 0.5;
    this.shootCooldown = 40 + Math.random() * 40;
    this.pulse = 0;
    this.spikeRotation = 0;
  }

  update(game) {
    this.y += this.speed;
    this.pulse += 0.1;
    this.spikeRotation += 0.05;

    this.shootCooldown--;
    if (this.shootCooldown <= 0) {
      game.enemyBullets.push(new Bullet(this.x - 15, this.y + 20, 6, '#ff00ff'));
      game.enemyBullets.push(new Bullet(this.x + 15, this.y + 20, 6, '#ff00ff'));
      this.shootCooldown = 60 + Math.random() * 30;
    }
  }

  draw(ctx) {
    // === VIRUS EXPLOSIVO GRANDE ===
    const glow = Math.sin(this.pulse * 2) * 0.3 + 0.7;
    const dangerPulse = Math.sin(this.pulse * 4) * 5;

    // Glow exterior peligroso
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20 + dangerPulse;

    // Cuerpo principal del virus (forma irregular)
    ctx.fillStyle = '#220033';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 28, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Núcleo interno pulsante
    const coreGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 20);
    coreGrad.addColorStop(0, `rgba(255, 0, 255, ${glow})`);
    coreGrad.addColorStop(0.5, 'rgba(128, 0, 128, 0.6)');
    coreGrad.addColorStop(1, 'rgba(50, 0, 50, 0.3)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Espinas/protuberancias rotantes (como un virus)
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    const numSpikes = 8;
    for (let i = 0; i < numSpikes; i++) {
      const angle = (i / numSpikes) * Math.PI * 2 + this.spikeRotation;
      const innerRadius = 20;
      const outerRadius = 35 + Math.sin(this.pulse + i) * 3;

      const x1 = this.x + Math.cos(angle) * innerRadius;
      const y1 = this.y + Math.sin(angle) * innerRadius;
      const x2 = this.x + Math.cos(angle) * outerRadius;
      const y2 = this.y + Math.sin(angle) * outerRadius;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Punta brillante de cada espina
      ctx.fillStyle = '#ff66ff';
      ctx.beginPath();
      ctx.arc(x2, y2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Símbolo de peligro en el centro
    ctx.fillStyle = '#ff0066';
    ctx.font = 'bold 16px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('!', this.x, this.y + 6);

    // Ojos malvados
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(this.x - 10, this.y - 5, 5, 0, Math.PI * 2);
    ctx.arc(this.x + 10, this.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pupilas
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(this.x - 10, this.y - 5, 2, 0, Math.PI * 2);
    ctx.arc(this.x + 10, this.y - 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cañones dobles
    ctx.fillStyle = '#660066';
    ctx.fillRect(this.x - 20, this.y + 15, 10, 12);
    ctx.fillRect(this.x + 10, this.y + 15, 10, 12);

    // Indicador de disparo
    if (this.shootCooldown < 15) {
      const chargeLevel = 1 - this.shootCooldown / 15;
      ctx.fillStyle = `rgba(255, 255, 0, ${chargeLevel})`;
      ctx.beginPath();
      ctx.arc(this.x - 15, this.y + 28, 4, 0, Math.PI * 2);
      ctx.arc(this.x + 15, this.y + 28, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Borde pulsante
    ctx.strokeStyle = `rgba(255, 0, 255, ${glow})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 28, 24, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = 'left';
  }
}

class Particle {
  constructor(x, y, c) {
    this.x = x;
    this.y = y;
    this.c = c;
    this.life = 1.0;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.size = 3 + Math.random() * 4;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    this.type = Math.random() > 0.5 ? 'square' : 'circle';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96; // Fricción
    this.vy *= 0.96;
    this.vy += 0.1; // Gravedad ligera
    this.life -= 0.04;
    this.rotation += this.rotationSpeed;
    this.size *= 0.98; // Se encoge
  }

  draw(ctx) {
    if (this.life <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Glow
    ctx.shadowColor = this.c;
    ctx.shadowBlur = 8 * this.life;

    ctx.globalAlpha = Math.max(0, this.life);

    if (this.type === 'square') {
      // Partícula cuadrada con gradiente
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, this.c);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else {
      // Partícula circular
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, this.c);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }
}

// Exponer global
window.CpuBase = CpuBase;
window.PlayerTank = PlayerTank;
window.Bullet = Bullet;
window.AmmoBox = AmmoBox;
window.RobotEnemy = RobotEnemy;
window.ExplosiveTank = ExplosiveTank;
window.Particle = Particle;