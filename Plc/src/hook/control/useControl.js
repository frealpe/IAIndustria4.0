import { ControlStore } from '../../store/control/control.store';

export const useControl = () => {
    const caracterizacionData = ControlStore(state => state.caracterizacionData);
    const comparacionData = ControlStore(state => state.comparacionData);
    const dataloggerData = ControlStore(state => state.dataloggerData);
    const anomaliasData = ControlStore(state => state.anomaliasData);
    const devices = ControlStore(state => state.devices);
    const addAnomaly = ControlStore(state => state.addAnomaly);
    const loadInitialData = ControlStore(state => state.loadInitialData);

    return {
        caracterizacionData,
        comparacionData,
        dataloggerData,
        anomaliasData,
        devices,
        addAnomaly,
        loadInitialData
    };
};
