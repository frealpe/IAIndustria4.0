const { Router } = require('express');
const { getCaracterizacion, getComparacion, getDatalogger, getAnomalias, getDevices, getLogsByDevices, getTrainedModels, activateModel, manualTrain } = require('../controllers/DataController');

const router = Router();

router.get('/caracterizacion', getCaracterizacion);
router.get('/comparacion', getComparacion);
router.get('/datalogger', getDatalogger);
router.get('/anomalias', getAnomalias);
router.get('/devices', getDevices);
router.post('/logs-by-devices', getLogsByDevices);
router.get('/trained-models', getTrainedModels);
router.put('/trained-models/:model_id/activate', activateModel);
router.post('/train-model', manualTrain);

module.exports = router;
