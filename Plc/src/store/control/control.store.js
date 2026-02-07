import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import ControlService from '../../service/control/control.service';

const controlApi = (set) => ({
    caracterizacionData: [],
    comparacionData: [],
    dataloggerData: [],
    anomaliasData: [],
    devices: [],

    addAnomaly: (newAnomaly) => {
        set((state) => ({
            anomaliasData: [newAnomaly, ...state.anomaliasData].slice(0, 100) // Mantener máx 100 y agregar al inicio
        }));
    },

    loadInitialData: async () => {
        try {
            const [caractRes, compRes, datalogRes, anomRes, devRes] = await Promise.all([
                ControlService.getCaracterizacion(),
                ControlService.getComparacion(),
                ControlService.getDatalogger(),
                ControlService.getAnomalias(),
                ControlService.getDevices()
            ]);

            set({
                caracterizacionData: caractRes.ok ? caractRes.data : [],
                comparacionData: compRes.ok ? compRes.data : [],
                dataloggerData: datalogRes.ok ? datalogRes.data : [],
                anomaliasData: anomRes.ok ? anomRes.data : [],
                devices: devRes.ok ? devRes.data : []
            });

            console.log("Datos iniciales cargados en Store (incluyendo anomalías y devices)");
            return true;
        } catch (error) {
            console.error("Error cargando datos iniciales en Store:", error);
            return false;
        }
    }
});

export const ControlStore = create(
    devtools(
        persist(
            controlApi,
            { name: 'control' }
        )
    )
);
