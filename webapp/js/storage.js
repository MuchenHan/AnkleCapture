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
     * Save single measurement data (legacy)
     */
    async saveMeasurement(data) {
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
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}

// Global instance
const storage = new StorageManager();
