const { executeDanfoCode } = require('../helpers/analysisHelper');

class RuntimeAnalysisEngine {
    constructor() {
        this.SAMPLING_THRESHOLD = 50000;
        this.MAX_ROWS_AFTER_SAMPLING = 10000;
        this.EXECUTION_TIMEOUT_MS = 5000;
    }

    /**
     * Adaptively samples data if it exceeds the threshold.
     * @param {Array} rows - The raw data rows.
     * @returns {Array} - The sampled (or original) data rows.
     */
    sampleData(rows) {
        if (!Array.isArray(rows)) return rows;
        
        const count = rows.length;
        if (count <= this.SAMPLING_THRESHOLD) {
            return rows;
        }

        console.log(`[RuntimeAnalysisEngine] Data size (${count}) exceeds threshold (${this.SAMPLING_THRESHOLD}). Sampling to ~${this.MAX_ROWS_AFTER_SAMPLING}...`);
        
        const samplingRate = this.MAX_ROWS_AFTER_SAMPLING / count;
        const sampled = [];
        
        // Random Uniform Sampling
        for (let i = 0; i < count; i++) {
            if (Math.random() < samplingRate) {
                sampled.push(rows[i]);
            }
        }

        console.log(`[RuntimeAnalysisEngine] Sampling complete. New size: ${sampled.length}`);
        return sampled;
    }

    /**
     * Executes analysis code with safety wrappers (timeout, error handling).
     * @param {Array} data - The data to analyze.
     * @param {string} code - The Danfo.js code to execute.
     * @returns {Object} - The result of the analysis.
     */
    executeSafeAnalysis(data, code) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Analysis execution timed out after ${this.EXECUTION_TIMEOUT_MS}ms`));
            }, this.EXECUTION_TIMEOUT_MS);

            try {
                // Ensure data is not massive before passing to Danfo (double check)
                const safeData = this.sampleData(data);
                
                // Execute logic
                const result = executeDanfoCode(safeData, code);
                
                clearTimeout(timer);
                resolve(result);
            } catch (err) {
                clearTimeout(timer);
                reject(err);
            }
        });
    }
}

module.exports = new RuntimeAnalysisEngine();
