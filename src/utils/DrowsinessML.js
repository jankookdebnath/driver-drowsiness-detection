/**
 * DrowsinessML — Lightweight Neural Network Classifier
 * 
 * A custom feedforward neural network implemented from scratch (no external ML libraries).
 * Architecture: 5 inputs → 12 hidden (ReLU) → 6 output classes (softmax)
 * 
 * Starts with hand-crafted weights based on domain knowledge (encoding the rule-based logic),
 * then refines through online learning as it collects labeled data from the rule-based system.
 * 
 * This demonstrates the transition from rule-based to ML-based detection.
 */

// State indices
const STATES = ['Alert', 'Fatigued', 'Drowsy', 'Microsleep', 'Yawning / Distracted', 'Not Concentrating'];
const NUM_INPUTS = 5;
const NUM_HIDDEN = 12;
const NUM_OUTPUTS = 6;

class DrowsinessML {
  constructor() {
    // Initialize weights with domain knowledge
    this.weightsIH = this._initInputToHidden();
    this.biasH = this._initHiddenBias();
    this.weightsHO = this._initHiddenToOutput();
    this.biasO = this._initOutputBias();

    // Training buffer
    this.trainingBuffer = [];
    this.maxBufferSize = 500;
    this.trainedSamples = 0;
    this.learningRate = 0.01;
    this.isActive = false;
    this.minSamplesToActivate = 50;
    this.accuracy = 0;
    this.confidenceThreshold = 0.6;
  }

  /**
   * Normalize raw features to [0, 1] range
   * Input: { ear, mar, yaw, blinkRate, closedFramesRatio }
   */
  normalizeFeatures(raw) {
    return [
      Math.min(1, Math.max(0, (parseFloat(raw.ear) || 0) / 0.4)),          // EAR: 0-0.4 → 0-1 (higher = eyes open)
      Math.min(1, Math.max(0, (parseFloat(raw.mar) || 0) / 0.8)),          // MAR: 0-0.8 → 0-1 (higher = mouth open)
      Math.min(1, Math.max(0, Math.abs((parseFloat(raw.yaw) || 1) - 1.0))),// Yaw deviation from center
      Math.min(1, Math.max(0, (raw.blinkRate || 0) / 30)),                 // Blink rate: 0-30 → 0-1
      Math.min(1, Math.max(0, (raw.closedFramesRatio || 0))),              // Closed frames ratio: 0-1
    ];
  }

  /**
   * Forward pass — predict state probabilities
   */
  predict(rawFeatures) {
    const x = this.normalizeFeatures(rawFeatures);

    // Input → Hidden (ReLU)
    const hidden = new Array(NUM_HIDDEN).fill(0);
    for (let j = 0; j < NUM_HIDDEN; j++) {
      let sum = this.biasH[j];
      for (let i = 0; i < NUM_INPUTS; i++) {
        sum += x[i] * this.weightsIH[i][j];
      }
      hidden[j] = Math.max(0, sum); // ReLU
    }

    // Hidden → Output (Softmax)
    const logits = new Array(NUM_OUTPUTS).fill(0);
    for (let k = 0; k < NUM_OUTPUTS; k++) {
      let sum = this.biasO[k];
      for (let j = 0; j < NUM_HIDDEN; j++) {
        sum += hidden[j] * this.weightsHO[j][k];
      }
      logits[k] = sum;
    }

    const probs = this._softmax(logits);
    const predictedIndex = probs.indexOf(Math.max(...probs));

    return {
      state: STATES[predictedIndex],
      confidence: probs[predictedIndex],
      probabilities: STATES.reduce((obj, state, i) => {
        obj[state] = Math.round(probs[i] * 1000) / 1000;
        return obj;
      }, {}),
      isMLActive: this.isActive,
    };
  }

  /**
   * Get the ML-predicted state if confidence is high enough, otherwise return null
   */
  getPredictedState(rawFeatures) {
    if (!this.isActive) return null;

    const result = this.predict(rawFeatures);
    if (result.confidence >= this.confidenceThreshold) {
      return result;
    }
    return null;
  }

  /**
   * Add a training example (from rule-based detection)
   */
  addTrainingExample(rawFeatures, label) {
    const stateIndex = STATES.indexOf(label);
    if (stateIndex === -1) return;

    const features = this.normalizeFeatures(rawFeatures);

    this.trainingBuffer.push({
      features,
      label: stateIndex,
    });

    if (this.trainingBuffer.length > this.maxBufferSize) {
      this.trainingBuffer.shift();
    }

    // Train every 10 new samples
    if (this.trainingBuffer.length % 10 === 0 && this.trainingBuffer.length >= 30) {
      this._trainMiniBatch();
    }

    // Activate ML after enough samples
    if (this.trainedSamples >= this.minSamplesToActivate && !this.isActive) {
      this._evaluateAccuracy();
      if (this.accuracy >= 0.7) {
        this.isActive = true;
      }
    }
  }

  /**
   * Get training status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      trainedSamples: this.trainedSamples,
      bufferSize: this.trainingBuffer.length,
      accuracy: Math.round(this.accuracy * 100),
      minSamples: this.minSamplesToActivate,
    };
  }

  /**
   * Force activate/deactivate ML mode
   */
  setActive(active) {
    this.isActive = active;
  }

  // === Private Methods ===

  /**
   * Train on a mini-batch from the buffer
   */
  _trainMiniBatch() {
    const batchSize = Math.min(16, this.trainingBuffer.length);
    const batch = this._sampleRandom(this.trainingBuffer, batchSize);

    for (const sample of batch) {
      this._trainSingle(sample.features, sample.label);
    }

    this.trainedSamples += batchSize;

    // Re-evaluate accuracy periodically
    if (this.trainedSamples % 50 === 0) {
      this._evaluateAccuracy();
    }
  }

  /**
   * Train on a single example using backpropagation
   */
  _trainSingle(x, targetIndex) {
    // Forward pass
    const hidden = new Array(NUM_HIDDEN).fill(0);
    const hiddenRaw = new Array(NUM_HIDDEN).fill(0);
    for (let j = 0; j < NUM_HIDDEN; j++) {
      let sum = this.biasH[j];
      for (let i = 0; i < NUM_INPUTS; i++) {
        sum += x[i] * this.weightsIH[i][j];
      }
      hiddenRaw[j] = sum;
      hidden[j] = Math.max(0, sum); // ReLU
    }

    const logits = new Array(NUM_OUTPUTS).fill(0);
    for (let k = 0; k < NUM_OUTPUTS; k++) {
      let sum = this.biasO[k];
      for (let j = 0; j < NUM_HIDDEN; j++) {
        sum += hidden[j] * this.weightsHO[j][k];
      }
      logits[k] = sum;
    }

    const probs = this._softmax(logits);

    // Target one-hot
    const target = new Array(NUM_OUTPUTS).fill(0);
    target[targetIndex] = 1;

    // Output layer gradients (cross-entropy + softmax derivative = probs - target)
    const dLogits = probs.map((p, k) => p - target[k]);

    // Update output weights & biases
    for (let k = 0; k < NUM_OUTPUTS; k++) {
      for (let j = 0; j < NUM_HIDDEN; j++) {
        this.weightsHO[j][k] -= this.learningRate * dLogits[k] * hidden[j];
      }
      this.biasO[k] -= this.learningRate * dLogits[k];
    }

    // Hidden layer gradients
    const dHidden = new Array(NUM_HIDDEN).fill(0);
    for (let j = 0; j < NUM_HIDDEN; j++) {
      let grad = 0;
      for (let k = 0; k < NUM_OUTPUTS; k++) {
        grad += dLogits[k] * this.weightsHO[j][k];
      }
      // ReLU derivative
      dHidden[j] = hiddenRaw[j] > 0 ? grad : 0;
    }

    // Update input weights & biases
    for (let j = 0; j < NUM_HIDDEN; j++) {
      for (let i = 0; i < NUM_INPUTS; i++) {
        this.weightsIH[i][j] -= this.learningRate * dHidden[j] * x[i];
      }
      this.biasH[j] -= this.learningRate * dHidden[j];
    }
  }

  /**
   * Evaluate accuracy on the training buffer
   */
  _evaluateAccuracy() {
    if (this.trainingBuffer.length < 20) {
      this.accuracy = 0;
      return;
    }

    let correct = 0;
    const testSet = this.trainingBuffer.slice(-30);
    for (const sample of testSet) {
      const hidden = new Array(NUM_HIDDEN).fill(0);
      for (let j = 0; j < NUM_HIDDEN; j++) {
        let sum = this.biasH[j];
        for (let i = 0; i < NUM_INPUTS; i++) {
          sum += sample.features[i] * this.weightsIH[i][j];
        }
        hidden[j] = Math.max(0, sum);
      }

      const logits = new Array(NUM_OUTPUTS).fill(0);
      for (let k = 0; k < NUM_OUTPUTS; k++) {
        let sum = this.biasO[k];
        for (let j = 0; j < NUM_HIDDEN; j++) {
          sum += hidden[j] * this.weightsHO[j][k];
        }
        logits[k] = sum;
      }

      const predicted = logits.indexOf(Math.max(...logits));
      if (predicted === sample.label) correct++;
    }

    this.accuracy = correct / testSet.length;
  }

  _softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxLogit));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  _sampleRandom(arr, n) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  // === Weight Initialization (Domain Knowledge Encoded) ===

  /**
   * Input → Hidden weights [5 x 12]
   * Designed so certain hidden neurons specialize in detecting specific states:
   * Neurons 0-1: Alertness (high EAR, centered yaw)
   * Neurons 2-3: Fatigue (slightly low EAR, low blink rate)
   * Neurons 4-5: Drowsiness (low EAR, moderate closed frames)
   * Neurons 6-7: Microsleep (very high closed frames)
   * Neurons 8-9: Yawning (high MAR)
   * Neurons 10-11: Distraction (high yaw deviation)
   */
  _initInputToHidden() {
    //         [ear,  mar,  yaw,  blink, closed]
    return [
      /* ear   */ [ 2.0,  1.5, -1.5, -2.0, -1.0, -1.5, -2.0, -2.5,  0.0,  0.0, -0.5, -0.3],
      /* mar   */ [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  2.5,  2.0,  0.0,  0.0],
      /* yaw   */ [-1.0, -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  2.5,  2.0],
      /* blink */ [ 0.5,  0.5, -0.5, -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
      /* closed*/ [-1.0, -1.0,  0.5,  1.0,  1.5,  2.0,  2.5,  3.0,  0.0,  0.0,  0.0,  0.0],
    ];
  }

  _initHiddenBias() {
    return [0.5, 0.5, -0.3, -0.5, -0.8, -1.0, -1.5, -2.0, -0.5, -0.3, -0.5, -0.3];
  }

  /**
   * Hidden → Output weights [12 x 6]
   * Maps hidden neuron specializations to output states
   */
  _initHiddenToOutput() {
    const w = [];
    for (let j = 0; j < NUM_HIDDEN; j++) {
      w[j] = new Array(NUM_OUTPUTS).fill(0);
    }
    // Neuron 0,1 → Alert
    w[0][0] = 2.0; w[1][0] = 1.5;
    // Neuron 2,3 → Fatigued
    w[2][1] = 2.0; w[3][1] = 1.5;
    // Neuron 4,5 → Drowsy
    w[4][2] = 2.0; w[5][2] = 1.5;
    // Neuron 6,7 → Microsleep
    w[6][3] = 2.0; w[7][3] = 2.5;
    // Neuron 8,9 → Yawning
    w[8][4] = 2.0; w[9][4] = 1.5;
    // Neuron 10,11 → Not Concentrating
    w[10][5] = 2.0; w[11][5] = 1.5;

    // Add some cross-connections for nuance
    w[2][0] = -0.5; // Fatigue neurons inhibit Alert
    w[4][0] = -1.0; // Drowsy neurons strongly inhibit Alert
    w[6][0] = -1.5; // Microsleep neurons very strongly inhibit Alert
    w[0][2] = -0.5; // Alert neurons inhibit Drowsy
    w[0][3] = -1.0; // Alert neurons inhibit Microsleep

    return w;
  }

  _initOutputBias() {
    return [1.0, -0.3, -0.5, -1.0, -0.3, -0.5]; // Bias toward Alert initially
  }
}

export { DrowsinessML, STATES };
export default DrowsinessML;
