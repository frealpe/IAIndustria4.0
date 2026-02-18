const { Router } = require('express');
const { 
    getCaracterizacion, 
    getComparacion, 
    getDatalogger,
    getRecentLogs,
    getAnomalias,
    getDeviceLogs,
    getDevices, 
    getLogsByDevices, 
    getTrainedModels, 
    activateModel, 
    deleteModel, 
    manualTrain,
    getAllDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    getProjectStructure
} = require('../controllers/DataController');

const router = Router();

router.get('/caracterizacion', getCaracterizacion);
router.get('/comparacion', getComparacion);
router.get('/datalogger', getDatalogger);
router.get('/recent-logs', getRecentLogs); // Get recent historical logs
router.get('/anomalias', getAnomalias);
router.get('/device-logs/:device_uid', getDeviceLogs); // Get all logs for a device
router.get('/devices', getDevices); // Get simple list (active UIDs only)
router.get('/devices/all', getAllDevices); // Get all devices with full info
router.post('/devices', createDevice);
router.put('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);
router.post('/logs-by-devices', getLogsByDevices);
router.get('/trained-models', getTrainedModels);
router.put('/trained-models/:model_id/activate', activateModel);
router.delete('/trained-models/:model_id', deleteModel);
router.post('/train-model', manualTrain);
router.get('/project-structure', getProjectStructure);

module.exports = router;
