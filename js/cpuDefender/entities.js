/* ==================================================
   CPU DEFENDER - ENTITIES
   (Físicas ajustadas: Control preciso y frenado rápido)
   ================================================== */

class CpuBase {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.health = 100;
  }

  draw(ctx) {
    ctx.fillStyle = '#005555';
    ctx.fillRect(this.x - 40, this.y - 20, 80, 40);

    ctx.fillStyle = '#00ffff';
    ctx.fillRect(this.x - 30, this.y - 15, 60, 30);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - 40, this.y - 20, 80, 40);

    ctx.fillStyle = 'red';
    ctx.fillRect(this.x - 50, this.y + 30, 100, 8);
    ctx.fillStyle = this.health > 30 ? '#00ff00' : '#ff0000';
    ctx.fillRect(this.x - 50, this.y + 30, 100 * (this.health / 100), 8);
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
    ctx.fillStyle = '#cca300';
    ctx.fillRect(this.x - 20, this.y - 10, 40, 20);

    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(this.x - 5, this.y - 25, 10, 20);

    ctx.fillStyle = '#888';
    ctx.fillRect(this.x - 22, this.y - 8, 8, 16);
    ctx.fillRect(this.x + 14, this.y - 8, 8, 16);

    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x - 8, this.y - 5, 16, 10);
  }
}

class Bullet {
  constructor(x, y, vy, color) {
    this.x = x;
    this.y = y;
    this.vy = vy;
    this.radius = 4;
    this.color = color;
  }

  update() {
    this.y += this.vy;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class AmmoBox {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 1.5;
    this.pulse = 0;
  }

  update() {
    this.y += this.speed;
    this.pulse += 0.1;
  }

  draw(ctx) {
    const glow = Math.sin(this.pulse) * 3;

    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(this.x - 15, this.y - 15, 30, 30);

    ctx.fillStyle = '#000';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('A', this.x, this.y + 8);

    ctx.strokeStyle = `rgba(255, 204, 0, ${0.5 + Math.abs(glow) / 10})`;
    ctx.lineWidth = 2 + Math.abs(glow);
    ctx.strokeRect(this.x - 15, this.y - 15, 30, 30);
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
  }

  update(game) {
    this.y += this.speed;

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
        game.enemyBullets.push(new Bullet(this.x, this.y + 18, 5, '#ff0000'));
        this.shootCooldown = 80 + Math.random() * 40;
      }
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(this.x - 18, this.y - 18, 36, 36);

    ctx.fillStyle = '#ff4444';
    ctx.fillRect(this.x - 12, this.y - 24, 24, 10);

    if (this.canShoot) {
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(this.x - 6, this.y + 15, 12, 18);

      if (this.shootCooldown < 5) {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x - 4, this.y + 30, 8, 8);
      }
    }

    ctx.fillStyle = '#ffff00';
    ctx.fillRect(this.x - 12, this.y - 10, 8, 8);
    ctx.fillRect(this.x + 4, this.y - 10, 8, 8);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - 18, this.y - 18, 36, 36);

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 26, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

class ExplosiveTank {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.speed = 1 + Math.random() * 0.5;
    this.shootCooldown = 40 + Math.random() * 40;
    this.pulse = 0;
  }

  update(game) {
    this.y += this.speed;
    this.pulse += 0.1;

    this.shootCooldown--;
    if (this.shootCooldown <= 0) {
      game.enemyBullets.push(new Bullet(this.x - 10, this.y + 15, 6, '#ff00ff'));
      game.enemyBullets.push(new Bullet(this.x + 10, this.y + 15, 6, '#ff00ff'));
      this.shootCooldown = 60 + Math.random() * 30;
    }
  }

  draw(ctx) {
    const glow = Math.sin(this.pulse) * 3;

    ctx.fillStyle = '#8b008b';
    ctx.fillRect(this.x - 28, this.y - 18, 56, 36);

    ctx.fillStyle = '#aa00aa';
    ctx.fillRect(this.x - 20, this.y - 25, 40, 15);

    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(this.x - 22, this.y - 32, 10, 12);
    ctx.fillRect(this.x + 12, this.y - 32, 10, 12);

    ctx.fillStyle = '#555';
    ctx.fillRect(this.x - 32, this.y - 15, 12, 30);
    ctx.fillRect(this.x + 20, this.y - 15, 12, 30);

    ctx.fillStyle = glow > 0 ? '#ff0000' : '#880000';
    ctx.beginPath();
    ctx.arc(this.x - 15, this.y - 8, 4, 0, Math.PI * 2);
    ctx.arc(this.x + 15, this.y - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 0, 255, ${0.5 + Math.abs(glow) / 10})`;
    ctx.lineWidth = 3 + Math.abs(glow);
    ctx.strokeRect(this.x - 28, this.y - 18, 56, 36);
  }
}

class Particle {
  constructor(x, y, c) {
    this.x = x;
    this.y = y;
    this.c = c;
    this.life = 1.0;
    this.vx = (Math.random() - 0.5) * 5;
    this.vy = (Math.random() - 0.5) * 5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.05;
  }

  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.c;
    ctx.fillRect(this.x, this.y, 4, 4);
    ctx.globalAlpha = 1.0;
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