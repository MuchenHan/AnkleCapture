/**
 * storage.js - IndexedDB Data Persistence (Improved)
 * Handles storing and retrieving measurement data
 */

const DB_NAME = 'AnkleCaptureDB';
const DB_VERSION = 2;
const STORE_NAME = 'measurements';

class StorageManager {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, {
                        keyPath: 'session_id'
                    });

                    objectStore.createIndex('subject_id', 'subject_id', { unique: false });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('side', 'side', { unique: false });

                    console.log('Object store created');
                }
            };
        });
    }

    /**
     * Ensure database is initialized before use
     */
    _ensureDB() {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
    }

    /**
     * Save single measurement data (legacy)
     */
    async saveMeasurement(data) {
        this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.put(data);

            request.onsuccess = () => {
                console.log('Measurement saved:', data.session_id);
                resolve(data.session_id);
            };

            request.onerror = () => {
                console.error('Save error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Save measurement session with multiple measurements (NEW)
     */
    async saveMeasurementSession(sessionData) {
        this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            
            const data = {
                ...sessionData,
                measurement_count: sessionData.measurements?.length || 0
            };

            const request = objectStore.put(data);

            request.onsuccess = () => {
                console.log('Measurement session saved:', data.session_id);
                resolve(data.session_id);
            };

            request.onerror = () => {
                console.error('Save error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get measurement by session ID
     */
    async getMeasurement(sessionId) {
        this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.get(sessionId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Get all measurements
     */
    async getAllMeasurements() {
        this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Delete measurement
     */
    async deleteMeasurement(sessionId) {
        this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.delete(sessionId);

            request.onsuccess = () => {
                console.log('Measurement deleted:', sessionId);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Batch delete measurements in a single transaction (atomic)
     */
    async batchDeleteMeasurements(ids) {
        this._ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            ids.forEach(id => store.delete(id));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        const all = await this.getAllMeasurements();
        // Rough size estimate: serialize to JSON and count bytes
        let estimatedSizeBytes = 0;
        try {
            // Count Blob sizes in measurements
            for (const session of all) {
                const measurements = session.measurements || [];
                for (const m of measurements) {
                    if (m.original_image instanceof Blob) estimatedSizeBytes += m.original_image.size;
                    if (m.overlay_image instanceof Blob) estimatedSizeBytes += m.overlay_image.size;
                    if (m.thumbnail_image instanceof Blob) estimatedSizeBytes += m.thumbnail_image.size;
                }
                // Add ~1KB for metadata per session
                estimatedSizeBytes += 1024;
            }
        } catch (e) {
            console.warn('Could not estimate storage size:', e);
        }
        return {
            sessionCount: all.length,
            estimatedSizeBytes
        };
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}

// Global instance
const storage = new StorageManager();
