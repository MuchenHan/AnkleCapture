/**
 * orientation.js - Device Orientation Tracking
 * Handles DeviceMotion API for level indicator
 */

const LEVEL_TOLERANCE_DEG = 5.0;

class OrientationManager {
    constructor() {
        this.isEnabled = false;
        this.currentOrientation = {
            pitch_deg: null,
            roll_deg: null,
            is_level: false,
            level_tolerance_deg: LEVEL_TOLERANCE_DEG
        };
        this.onUpdateCallback = null;
        this.boundHandleOrientation = null;
    }

    /**
     * Request permission (required for iOS 13+)
     */
    async requestPermission() {
        // Check if permission API exists (iOS 13+)
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                return permission === 'granted';
            } catch (error) {
                console.error('Motion permission error:', error);
                alert('デバイスの傾き検出の許可が必要です。');
                return false;
            }
        }

        // Non-iOS or older iOS versions
        return true;
    }

    /**
     * Start orientation tracking
     */
    async start(onUpdate) {
        const granted = await this.requestPermission();

        if (!granted) {
            return false;
        }

        this.onUpdateCallback = onUpdate;
        this.boundHandleOrientation = this.handleOrientation.bind(this);
        window.addEventListener('deviceorientation', this.boundHandleOrientation, true);
        this.isEnabled = true;

        console.log('Orientation tracking started');
        return true;
    }

    /**
     * Handle orientation event
     */
    handleOrientation(event) {
        // beta: front-to-back tilt (-180 to 180)
        // gamma: left-to-right tilt (-90 to 90)
        let pitch = event.beta;
        let roll = event.gamma;

        if (pitch === null || roll === null) {
            return;
        }

        // Adjust for landscape orientation (camera held horizontally)
        // When holding phone in landscape for rear camera, beta should be around 90
        const adjustedPitch = pitch - 90;

        // Check if level (within tolerance)
        const isLevel =
            Math.abs(adjustedPitch) <= LEVEL_TOLERANCE_DEG &&
            Math.abs(roll) <= LEVEL_TOLERANCE_DEG;

        // Update current orientation
        this.currentOrientation = {
            pitch_deg: Math.round(adjustedPitch * 10) / 10,
            roll_deg: Math.round(roll * 10) / 10,
            is_level: isLevel,
            level_tolerance_deg: LEVEL_TOLERANCE_DEG
        };

        // Call update callback
        if (this.onUpdateCallback) {
            this.onUpdateCallback(this.currentOrientation);
        }
    }

    /**
     * Stop orientation tracking
     */
    stop() {
        if (this.isEnabled && this.boundHandleOrientation) {
            window.removeEventListener('deviceorientation', this.boundHandleOrientation);
            this.boundHandleOrientation = null;
            this.isEnabled = false;
            console.log('Orientation tracking stopped');
        }
    }

    /**
     * Get current orientation data
     */
    getCurrentOrientation() {
        return { ...this.currentOrientation };
    }

    /**
     * Check if DeviceOrientation is supported
     */
    static isSupported() {
        return 'DeviceOrientationEvent' in window;
    }
}

// Global instance
const orientation = new OrientationManager();
