/* ==================================================
   SNAKE - AI (CARGA + PREDICCIÓN)
   Mantener intacta la lógica del modelo y exportación.
   ================================================== */

class SnakeAI {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.loadAttempts = 0;
    this.maxAttempts = 3;
  }

  async loadModel() {
    try {
      console.log("🔄 Intentando cargar modelo de IA Snake...");

      // Importante: ruta relativa desde index.html (raíz)
      this.model = await tf.loadLayersModel('./model/snake/model.json');

      if (!this.model) {
        throw new Error("Modelo es null después de la carga");
      }

      // Log shape del input (debug)
      const inputShape = this.model.inputs?.[0]?.shape;
      console.log("📊 Forma de entrada del modelo:", inputShape);

      // Smoke test: una predicción dummy para verificar que corre
      const testInput = tf.tensor2d([[0.5, 0.5, 0.5, 0.5]]);
      const testOutput = this.model.predict(testInput);
      testInput.dispose();
      testOutput.dispose();

      this.isLoaded = true;
      console.log("✅ IA SNAKE CARGADA Y LISTA.");
      return true;

    } catch (error) {
      console.error("❌ ERROR CARGANDO IA SNAKE:", error);
      this.loadAttempts++;

      if (this.loadAttempts < this.maxAttempts) {
        console.log(`🔄 Reintentando... (${this.loadAttempts}/${this.maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.loadModel();
      }

      console.warn("⚠️ No se pudo cargar el modelo de IA Snake. Usando modo adaptativo básico.");
      return false;
    }
  }

  /**
   * Retorna:
   *  - classIndex (0=EASY, 1=NORMAL, 2=HARD)
   *  - probabilities: [pEasy, pNormal, pHard]
   *
   * Parámetros adaptados para Snake:
   *  - score: puntuación actual
   *  - snakeLength: longitud de la serpiente (análogo a "health")
   *  - foodEaten: cantidad de comida comida (análogo a "enemies")
   *  - gameTime: tiempo de juego en ms
   */
  predict(score, snakeLength, foodEaten, gameTime) {
    if (!this.isLoaded || !this.model) {
      console.warn("⚠️ Modelo no cargado, usando dificultad NORMAL por defecto");
      return { classIndex: 1, probabilities: [0.0, 1.0, 0.0] };
    }

    return tf.tidy(() => {
      // Normalización adaptada para Snake
      const normalizedInput = [
        score / 500.0,        // Score típico max ~500
        snakeLength / 50.0,   // Longitud máxima razonable ~50
        foodEaten / 50.0,     // Comida comida max ~50
        gameTime / 300000.0   // 5 minutos en ms
      ];

      const inputTensor = tf.tensor2d([normalizedInput]);
      const prediction = this.model.predict(inputTensor);

      const probabilities = prediction.dataSync();
      const classIndex = prediction.argMax(1).dataSync()[0];

      return { classIndex, probabilities: Array.from(probabilities) };
    });
  }

  /**
   * Convierte el índice de clase a velocidad del juego
   * 0 = EASY (más lento), 1 = NORMAL, 2 = HARD (más rápido)
   */
  getSpeedFromClass(classIndex) {
    switch (classIndex) {
      case 0: return 140;  // EASY - Muy lento
      case 1: return 100;  // NORMAL
      case 2: return 60;   // HARD - Muy rápido
      default: return 100;
    }
  }

  getDifficultyLabel(classIndex) {
    switch (classIndex) {
      case 0: return 'FÁCIL';
      case 1: return 'NORMAL';
      case 2: return 'DIFÍCIL';
      default: return 'NORMAL';
    }
  }
}

// Exponer global (porque usamos <script> sin modules)
window.SnakeAI = SnakeAI;
