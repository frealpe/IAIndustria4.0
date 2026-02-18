const crypto = require('crypto');

class CacheService {
    constructor(maxSize = 100, defaultTtl = 600) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTtl = defaultTtl; // seconds
        console.log(`[CacheService] Initialized with maxSize=${maxSize}, defaultTtl=${defaultTtl}s`);
    }

    /**
     * Generates a hash key for a given string (e.g., SQL query).
     * @param {string} data 
     * @returns {string} MD5 hash
     */
    generateKey(data) {
        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * Retrieves a value from the cache.
     * @param {string} key 
     * @returns {any | null} value or null if not found or expired
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        const now = Date.now();
        if (now > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        // LRU: Refresh position
        this.cache.delete(key);
        this.cache.set(key, item);

        return item.value;
    }

    /**
     * Sets a value in the cache.
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttlSeconds (optional)
     */
    set(key, value, ttlSeconds = null) {
        const ttl = (ttlSeconds || this.defaultTtl) * 1000;
        const expiry = Date.now() + ttl;

        if (this.cache.size >= this.maxSize) {
            // Remove oldest (first item in Map)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, { value, expiry });
    }

    /**
     * Clears the entire cache.
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Returns stats about the cache.
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }
}

// Singleton instance
module.exports = new CacheService();
