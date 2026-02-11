const dfd = require("danfojs-node");
const tf = dfd.tensorflow;
const path = require('path');
const fs = require('fs');
const DatosModel = require('../models/DatosModel');
const ModeloEntrenado = require('../models/ModeloEntrenado');
const DeviceModel = require('../models/DeviceModel');
const socketService = require('../services/SocketService');

const MAX_ADC_VALUE = 4095;
const ANOMALY_THRESHOLD = 0.05;

// Configuración por defecto
const DEFAULT_MAX_SAMPLES = 10;
const DEFAULT_TRAINING_BATCHES = 10;

// CONTENEDOR DE ESTADOS POR DISPOSITIVO
const deviceStates = new Map();
const deviceIdCache = new Map(); // Cache para device_uid -> id de base de datos

/**
 * Obtiene o inicializa el estado para un dispositivo específico
 */
function getDeviceState(deviceUid) {
    if (!deviceStates.has(deviceUid)) {
        deviceStates.set(deviceUid, {
            deviceUid,
            sampleBuffer: [],
            rawBuffer: [],
            trainingData: [],
            model: null,
            isTraining: false,
            isModelReady: false,
            trainingHistory: [],
            isManualTraining: false,
            maxSamples: DEFAULT_MAX_SAMPLES,
            batchesRequired: DEFAULT_TRAINING_BATCHES
        });
    }
    return deviceStates.get(deviceUid);
}

/**
 * Obtiene el ID numérico de la base de datos para un UID, usando cache
 */
async function getDeviceId(deviceUid) {
    if (deviceIdCache.has(deviceUid)) {
        return deviceIdCache.get(deviceUid);
    }
    try {
        const device = await DeviceModel.getByUid(deviceUid);
        if (device) {
            deviceIdCache.set(deviceUid, device.id);
            return device.id;
        }
    } catch (err) {
        console.warn(`⚠️ Error obteniendo ID para ${deviceUid}:`, err.message);
    }
    return null;
}

// Directory for saving models
const MODELS_DIR = path.join(__dirname, '..', 'trained_models');

// Initialize
(async () => {
    try {
        await ModeloEntrenado.init();
        await DeviceModel.init();
        console.log("💾 [AI] Model persistence system initialized");
    } catch (error) {
        console.error("❌ Error initializing model persistence:", error);
    }
})();

/**
 * Construye el Autoencoder según el tamaño de ventana del dispositivo
 */
function buildModel(maxSamples) {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [maxSamples] }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: maxSamples, activation: 'linear' }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return model;
}

/**
 * Entrena el modelo para un dispositivo específico
 */
async function trainModel(state) {
    if (state.isTraining) return;
    state.isTraining = true;
    state.trainingHistory = [];
    
    console.log(`🚀 [AI] Iniciando entrenamiento para ${state.deviceUid}...`);

    const tensorData = tf.tensor2d(state.trainingData, [state.trainingData.length, state.maxSamples]);

    socketService.emit('training:started', {
        device_uid: state.deviceUid,
        total_epochs: 50,
        batches: state.trainingData.length
    });

    try {
        if (!state.model) state.model = buildModel(state.maxSamples);

        await state.model.fit(tensorData, tensorData, {
            epochs: 50,
            batchSize: 4,
            shuffle: true,
            verbose: 0,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    const progress = {
                        epoch: epoch + 1,
                        loss: logs.loss,
                        device_uid: state.deviceUid
                    };
                    state.trainingHistory.push(progress);
                    socketService.emit('training:progress', progress);
                }
            }
        });

        const finalLoss = state.trainingHistory[state.trainingHistory.length - 1].loss;
        console.log(`✅ [AI] Entrenamiento finalizado para ${state.deviceUid}. Loss: ${finalLoss}`);

        // Guardar modelo persistentemente
        const modelPath = path.join(MODELS_DIR, `${state.deviceUid}_${Date.now()}`);
        if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });
        
        await state.model.save(`file://${modelPath}`);
        
        await ModeloEntrenado.create(
            state.deviceUid, 
            modelPath, 
            state.maxSamples, 
            state.batchesRequired, 
            ANOMALY_THRESHOLD, 
            state.trainingHistory, 
            finalLoss
        );

        state.isModelReady = true;
        state.isTraining = false;
        state.trainingData = [];

        socketService.emit('training:finished', {
            device_uid: state.deviceUid,
            loss: finalLoss,
            success: true
        });

    } catch (err) {
        console.error(`❌ Error entrenando modelo para ${state.deviceUid}:`, err);
        state.isTraining = false;
        socketService.emit('training:error', { device_uid: state.deviceUid, error: err.message });
    } finally {
        tensorData.dispose();
    }
}

/**
 * Detecta anomalías calculando el error de reconstrucción (MSE)
 */
async function detectAnomaly(state, dataBatch) {
    if (!state.isModelReady || !state.model) return null;

    const inputTensor = tf.tensor2d([dataBatch], [1, state.maxSamples]);
    try {
        const reconstruction = state.model.predict(inputTensor);
        const mseTensor = tf.losses.meanSquaredError(inputTensor, reconstruction);
        const mseValues = await mseTensor.data();
        const mse = mseValues[0];
        
        return {
            isAnomaly: mse > ANOMALY_THRESHOLD,
            loss: mse.toFixed(6),
            threshold: ANOMALY_THRESHOLD
        };
    } finally {
        tf.dispose(inputTensor);
    }
}

/**
 * Carga un modelo desde disco para un dispositivo
 */
async function loadModel(deviceUid) {
    const state = getDeviceState(deviceUid);
    try {
        const activeModel = await ModeloEntrenado.getActiveModel(deviceUid);
        if (!activeModel) return false;

        const modelPath = activeModel.model_path;
        if (!fs.existsSync(path.join(modelPath, 'model.json'))) {
            console.warn(`⚠️ Archivos de modelo no encontrados en ${modelPath}`);
            return false;
        }

        state.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
        state.model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
        
        // Ajustar MAX_SAMPLES según el modelo cargado (input shape)
        const inputShape = state.model.layers[0].batchInputShape;
        const previousMax = state.maxSamples;
        state.maxSamples = inputShape[1];
        
        if (previousMax !== state.maxSamples) {
            console.log(`⚠️  [AI] ${deviceUid}: Usando ventana de ${state.maxSamples} (El modelo entrenado requiere este tamaño).`);
            console.log(`💡 Para usar la nueva ventana de 5, borra el modelo antiguo de la tabla 'modelo_entrenado'.`);
        }
        
        state.isModelReady = true;
        return true;
    } catch (err) {
        console.error(`❌ Error cargando modelo para ${deviceUid}:`, err);
        return false;
    }
}

/**
 * PUNTO DE ENTRADA: Procesa una muestra de un dispositivo
 */
async function addSample(safeRawValue, deviceUid) {
    if (!deviceUid) return null;
    
    const state = getDeviceState(deviceUid);
    const dbDeviceId = await getDeviceId(deviceUid);

    // Intentar cargar modelo si no se ha intentado antes
    if (!state.isModelReady && !state.isTraining && !state.modelCheckAttempted && state.trainingData.length === 0) {
        state.modelCheckAttempted = true; // Solo intentar una vez al inicio
        await loadModel(deviceUid);
    }
    
    // Normalizar (0.0 - 1.0)
    const clampedValue = Math.max(0, Math.min(MAX_ADC_VALUE, safeRawValue));
    const normalizedValue = parseFloat((clampedValue / MAX_ADC_VALUE).toFixed(4));

    // 2. Buffers
    state.sampleBuffer.push(normalizedValue);
    state.rawBuffer.push(safeRawValue);

    // LOG DE ESTADO REDUCIDO (Evitar CPU innecesario)
    // const phaseLabel = state.isModelReady ? "INFERENCIA" : (state.isTraining ? "ENTRENANDO" : "COLECTANDO");
    // console.log(`[!!! DEBUG !!!] ${deviceUid} [${phaseLabel}] | Buff: ${state.sampleBuffer.length}/${state.maxSamples} | Val: ${clampedValue}`);

    // 3. Procesar lote lleno
    if (state.sampleBuffer.length >= state.maxSamples) {
        const fullWindow = [...state.sampleBuffer];
        const fullRawWindow = [...state.rawBuffer];
        state.sampleBuffer = [];
        state.rawBuffer = [];

        // --- LÓGICA IA ---
        if (!state.isModelReady && !state.isTraining) {
            // Fase Recolección
            state.trainingData.push(fullWindow);
            console.log(`📊 [AI] ${deviceUid} Recolectando: ${state.trainingData.length}/${state.batchesRequired}`);

            const avg = fullRawWindow.reduce((a, b) => a + b, 0) / fullRawWindow.length;
            const resSnapshot = {
                phase: "collecting",
                count: state.trainingData.length,
                rawValues: fullRawWindow,
                timestamp: Date.now()
            };

            socketService.emit('mqtt:data:update', { ...resSnapshot, device_uid: deviceUid, id: Date.now() });
            const savedRecord = await DatosModel.create(deviceUid, resSnapshot, avg, dbDeviceId);

            if (state.trainingData.length >= state.batchesRequired) {
                trainModel(state);
            }
            return { status: "collecting", count: state.trainingData.length, savedRecord };
        } 
        
        if (state.isModelReady) {
            // Fase Inferencia
            const result = await detectAnomaly(state, fullWindow);
            if (!result) return null;

            const avg = fullRawWindow.reduce((a, b) => a + b, 0) / fullRawWindow.length;
            const resSnapshot = {
                phase: "inference",
                loss: result.loss,
                isAnomaly: result.isAnomaly,
                rawValues: fullRawWindow,
                timestamp: Date.now()
            };

            socketService.emit('mqtt:data:update', { ...resSnapshot, device_uid: deviceUid, id: Date.now() });
            const savedRecord = await DatosModel.create(deviceUid, resSnapshot, avg, dbDeviceId);

            console.log(`${result.isAnomaly ? '🚨' : '💚'} [AI] ${deviceUid} | Loss: ${result.loss}`);
            return { status: "inference", result, savedRecord };
        }
    }

    return null;
}

/**
 * Entrenamiento Manual
 */
async function startManualTraining(deviceUid, maxSamples, batchesRequired) {
    const state = getDeviceState(deviceUid);
    
    state.trainingData = [];
    state.sampleBuffer = [];
    state.rawBuffer = [];
    state.isModelReady = false;
    state.isTraining = false;
    state.isManualTraining = true;
    state.maxSamples = parseInt(maxSamples);
    state.batchesRequired = parseInt(batchesRequired);

    if (state.model) {
        state.model.dispose();
        state.model = null;
    }
    
    state.model = buildModel(state.maxSamples);

    console.log(`🚀 [AI] Entrenamiento MANUAL para ${deviceUid} iniciado (${state.maxSamples}x${state.batchesRequired})`);

    return {
        ok: true,
        device_uid: deviceUid,
        message: 'Sistema reiniciado para entrenamiento manual. Envía datos.'
    };
}

module.exports = { addSample, startManualTraining };
