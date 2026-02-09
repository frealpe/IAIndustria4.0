import { iotApi } from "../../api/iotApi";

/**
 * Service for fetching and formatting device data for dc.js charts
 */
class DeviceChartsService {
    /**
     * Get all device logs with optional limit
     * Returns data formatted for dc.js/crossfilter consumption
     */
    static async getAllDeviceLogs(limit = 2000) {
        try {
            const resp = await iotApi.get('/data/recent-logs', { 
                params: { limit } 
            });
            
            if (!resp.data || resp.data.length === 0) {
                console.warn('⚠️ No device logs found');
                return { ok: true, data: [] };
            }

            // Format data for dc.js
            const formattedData = resp.data.map((log, index) => {
                // Parse resultado if it's a string
                let resultado = log.resultado;
                if (typeof resultado === 'string') {
                    try {
                        resultado = JSON.parse(resultado);
                    } catch (e) {
                        console.warn(`Failed to parse resultado for log ${log.id}:`, e);
                        resultado = {};
                    }
                }

                // Create Date object for proper time-based filtering
                const timestamp = new Date(log.created_at);

                return {
                    id: log.id || index,
                    deviceUid: log.device_uid || 'Unknown',
                    voltage: parseFloat(log.mean) || 0,
                    timestamp: timestamp,
                    isAnomaly: resultado?.isAnomaly || false,
                    createdAt: log.created_at,
                    // Add additional fields for detailed analysis
                    reconstruction_error: resultado?.reconstruction_error || 0,
                    threshold: resultado?.threshold || 0
                };
            });

            console.log(`📊 DeviceChartsService: Formatted ${formattedData.length} logs for dc.js`);
            
            return { ok: true, data: formattedData };
        } catch (error) {
            console.error("❌ Error fetching device logs:", error);
            return { ok: false, error: error.message, data: [] };
        }
    }

    /**
     * Get logs for a specific device
     */
    static async getDeviceLogsByUid(device_uid, limit = 2000) {
        try {
            const resp = await iotApi.get('/data/recent-logs', { 
                params: { limit, device_uid } 
            });
            
            if (!resp.data || resp.data.length === 0) {
                console.warn(`⚠️ No logs found for device: ${device_uid}`);
                return { ok: true, data: [] };
            }

            // Format data for dc.js
            const formattedData = resp.data.map((log, index) => {
                let resultado = log.resultado;
                if (typeof resultado === 'string') {
                    try {
                        resultado = JSON.parse(resultado);
                    } catch (e) {
                        resultado = {};
                    }
                }

                const timestamp = new Date(log.created_at);

                return {
                    id: log.id || index,
                    deviceUid: log.device_uid || 'Unknown',
                    voltage: parseFloat(log.mean) || 0,
                    timestamp: timestamp,
                    isAnomaly: resultado?.isAnomaly || false,
                    createdAt: log.created_at,
                    reconstruction_error: resultado?.reconstruction_error || 0,
                    threshold: resultado?.threshold || 0
                };
            });

            console.log(`📊 DeviceChartsService: Formatted ${formattedData.length} logs for device ${device_uid}`);
            
            return { ok: true, data: formattedData };
        } catch (error) {
            console.error(`❌ Error fetching logs for device ${device_uid}:`, error);
            return { ok: false, error: error.message, data: [] };
        }
    }

    /**
     * Get statistics about the dataset
     */
    static getDatasetStats(data) {
        if (!data || data.length === 0) {
            return {
                total: 0,
                anomalies: 0,
                normal: 0,
                devices: [],
                dateRange: { min: null, max: null }
            };
        }

        const anomalies = data.filter(d => d.isAnomaly).length;
        const normal = data.length - anomalies;
        const devices = [...new Set(data.map(d => d.deviceUid))];
        
        const timestamps = data.map(d => d.timestamp).filter(t => t instanceof Date && !isNaN(t));
        const dateRange = {
            min: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
            max: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null
        };

        return {
            total: data.length,
            anomalies,
            normal,
            devices,
            dateRange
        };
    }
}

export default DeviceChartsService;
