/* ==================================================
   CPU DEFENDER - AI (CARGA + PREDICCIÓN)
   Mantener intacta la lógica del modelo y exportación.
   ================================================== */

class CpuDefenderAI {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.loadAttempts = 0;
    this.maxAttempts = 3;
  }

  async loadModel() {
    try {
      console.log("🔄 Intentando cargar modelo de IA...");

      // Importante: ruta relativa desde index.html (raíz)
      this.model = await tf.loadLayersModel('./model/cpuDefender/model.json');

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
      console.log("✅ IA CARGADA Y LISTA.");
      return true;

    } catch (error) {
      console.error("❌ ERROR CARGANDO IA:", error);
      this.loadAttempts++;

      if (this.loadAttempts < this.maxAttempts) {
        console.log(`🔄 Reintentando... (${this.loadAttempts}/${this.maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.loadModel();
      }

      alert("⚠️ Error al cargar modelo de IA\n\nRevisa la consola (F12) para más detalles.");
      return false;
    }
  }

  /**
   * Retorna:
   *  - classIndex (0=EASY, 1=NORMAL, 2=HARD)
   *  - probabilities: [pEasy, pNormal, pHard]
   *
   * No cambia la normalización original.
   */
  predict(score, health, enemies, time) {
    if (!this.isLoaded || !this.model) {
      console.warn("⚠️ Modelo no cargado, usando dificultad NORMAL por defecto");
      return { classIndex: 1, probabilities: [0.0, 1.0, 0.0] };
    }

    return tf.tidy(() => {
      const normalizedInput = [
        score / 5000.0,
        health / 100.0,
        enemies / 20.0,
        time / 5000.0
      ];

      const inputTensor = tf.tensor2d([normalizedInput]);
      const prediction = this.model.predict(inputTensor);

      const probabilities = prediction.dataSync();
      const classIndex = prediction.argMax(1).dataSync()[0];

      return { classIndex, probabilities: Array.from(probabilities) };
    });
  }
}

// Exponer global (porque usamos <script> sin modules)
window.CpuDefenderAI = CpuDefenderAI;
