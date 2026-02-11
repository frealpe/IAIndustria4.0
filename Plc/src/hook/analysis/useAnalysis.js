import { useState, useEffect, useCallback, useContext } from 'react';
import ControlService from '../../service/control/control.service';
import { SocketContext } from '../../context/SocketContext';

/**
 * Custom hook to manage analysis data (logs, models, activations)
 * Centralizes all fetch logic from AnalisisBlock component
 */
export const useAnalysis = (selectedDevices = []) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [trainedModels, setTrainedModels] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const { socket } = useContext(SocketContext) || {};

    /**
     * Fetch logs for selected devices
     */
    const fetchLogs = useCallback(async () => {
        if (!selectedDevices.length) {
            setLogs([]);
            return;
        }

        setLoading(true);

        // Safety timeout
        const timeoutId = setTimeout(() => {
            setLoading((current) => {
                if (current) {
                    console.warn("useAnalysis: Timeout fetching logs");
                    return false;
                }
                return false;
            });
        }, 10000);

        try {
            console.log("useAnalysis: Fetching logs for...", selectedDevices);
            const resp = await ControlService.getLogsByDevices(selectedDevices);
            console.log("useAnalysis: Response received:", resp);

            if (resp.ok) {
                setLogs(resp.data);
            } else {
                console.error("useAnalysis: Error fetching:", resp.error);
                setLogs([]);
            }
        } catch (error) {
            console.error("useAnalysis: Catch Error:", error);
            setLogs([]);
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    }, [selectedDevices]);

    /**
     * Fetch all trained models
     */
    const fetchTrainedModels = useCallback(async (deviceUid = null) => {
        setLoadingModels(true);
        try {
            // Priority: Argument > First Selected Device > null (All)
            const targetDevice = deviceUid || (selectedDevices.length > 0 ? selectedDevices[0] : null);
            const resp = await ControlService.getTrainedModels(targetDevice);
            if (resp.ok) {
                setTrainedModels(resp.data);
            }
        } catch (error) {
            console.error("useAnalysis: Error fetching trained models:", error);
        } finally {
            setLoadingModels(false);
        }
    }, [selectedDevices]);

    /**
     * Activate a specific model
     */
    const activateModel = useCallback(async (modelId) => {
        try {
            const resp = await ControlService.activateModel(modelId);
            if (resp.ok) {
                await fetchTrainedModels(); // Refresh list after activation
                return { ok: true };
            }
            return { ok: false, error: resp.error };
        } catch (error) {
            console.error("useAnalysis: Error activating model:", error);
            return { ok: false, error: error.message };
        }
    }, [fetchTrainedModels]);

    /**
     * Delete a model
     */
    const deleteModel = useCallback(async (modelId) => {
        try {
            const resp = await ControlService.deleteModel(modelId);
            if (resp.ok) {
                await fetchTrainedModels(); // Refresh list
                return { ok: true };
            }
            return { ok: false, error: resp.error };
        } catch (error) {
             return { ok: false, error: error.message };
        }
    }, [fetchTrainedModels]);

    /**
     * Auto-fetch logs when selectedDevices changes
     */
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    /**
     * Socket Listener for Real-time Updates
     */
    useEffect(() => {
        if (!socket || !selectedDevices.length) return;

        const handleNewData = (newLog) => {
            // Check if log belongs to selected devices
            if (selectedDevices.includes(newLog.device_uid)) {
                console.log("⚡ [useAnalysis] New data received:", newLog.id);
                setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 500)); // Max 500
            }
        };

        socket.on('mqtt:data:update', handleNewData);

        return () => {
            socket.off('mqtt:data:update', handleNewData);
        };
    }, [socket, selectedDevices]);

    return {
        // State
        logs,
        loading,
        trainedModels,
        loadingModels,
        
        // Actions
        fetchLogs,
        fetchTrainedModels,
        activateModel,
        deleteModel,
    };
};
