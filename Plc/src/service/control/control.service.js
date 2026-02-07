import { iotApi } from "../../api/iotApi";

class ControlService {
    static getCaracterizacion = async () => {
        try {
            const resp = await iotApi.get('/data/caracterizacion');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching caracterizacion:", error);
            return { ok: false, error: error.message };
        }
    };

    static getComparacion = async () => {
        try {
            const resp = await iotApi.get('/data/comparacion');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching comparacion:", error);
            return { ok: false, error: error.message };
        }
    };

    static getDatalogger = async () => {
        try {
            const resp = await iotApi.get('/data/datalogger');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching datalogger:", error);
            return { ok: false, error: error.message };
        }
    };

    static getAnomalias = async () => {
        try {
            const resp = await iotApi.get('/data/anomalias');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching anomalias:", error);
            return { ok: false, error: error.message };
        }
    };

    static getDevices = async () => {
        try {
            const resp = await iotApi.get('/data/devices');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching devices:", error);
            return { ok: false, error: error.message };
        }
    };

    static getLogsByDevices = async (devices) => {
        try {
            const resp = await iotApi.post('/data/logs-by-devices', { devices });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching logs by devices:", error);
            return { ok: false, error: error.message };
        }
    };

    static getTrainedModels = async (deviceUid = null) => {
        try {
            const url = deviceUid ? `/data/trained-models?device_uid=${deviceUid}` : '/data/trained-models';
            const resp = await iotApi.get(url);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching trained models:", error);
            return { ok: false, error: error.message };
        }
    };

    static activateModel = async (modelId) => {
        try {
            const resp = await iotApi.put(`/data/trained-models/${modelId}/activate`);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error activating model:", error);
            return { ok: false, error: error.message };
        }
    };

    static startManualTraining = async ({ device_uid, max_samples, batches_required }) => {
        try {
            const resp = await iotApi.post('/data/train-model', {
                device_uid,
                max_samples,
                batches_required
            });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error starting manual training:", error);
            throw error;
        }
    };
}

export default ControlService;
