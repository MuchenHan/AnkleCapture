/**
 * app.js - Main Application Controller
 * Orchestrates all modules and handles navigation
 */

class AnkleCaptureApp {
    constructor() {
        this.currentScreen = 'subject';
        this.sessionData = {
            session_id: null,
            subject_id: '',
            operator_id: '',
            side: 'L',
            mode: 'realtime', // 'realtime' or 'import'
            posture: 'sitting',
            distance_m: 3.0,
            measurement_type: 'ankle_dorsiflexion',
            checklist: {},
            device_orientation: {},
            points: [],
            angle_value: null,
            timestamp: null,
            device_info: '',
            original_photo: '',
            overlay_photo: ''
        };
        this.capturedImages = null;
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('AnkleCapture initializing...');

        // Check browser support for all required features
        const missingFeatures = [];

        if (!CameraManager.isSupported()) {
            missingFeatures.push('カメラAPI');
        }
        if (!OrientationManager.isSupported()) {
            missingFeatures.push('傾き検出API');
        }
        if (!window.indexedDB) {
            missingFeatures.push('ローカルストレージ (IndexedDB)');
        }

        if (missingFeatures.length > 0) {
            alert(`このブラウザは以下の機能をサポートしていません:\n- ${missingFeatures.join('\n- ')}\n\niPhone Safari 13以降を推奨します。`);
            return;
        }

        // Initialize storage
        try {
            await storage.init();
        } catch (error) {
            console.error('Storage initialization failed:', error);
        }



        // Initialize import manager
        if (window.importManager) {
            importManager.init();

            // Listen for file selection
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => importManager.handleFileSelect(e));
            }
        }

        // Set up event listeners
        this.setupEventListeners();

        // Get device info
        this.sessionData.device_info = this.getDeviceInfo();

        console.log('AnkleCapture ready');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Subject form
        const subjectForm = document.getElementById('subject-form');
        if (subjectForm) {
            subjectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubjectFormSubmit();
            });
        }

        // Camera screen buttons
        const btnBackToSubject = document.getElementById('btn-back-to-subject');
        if (btnBackToSubject) {
            btnBackToSubject.addEventListener('click', () => this.navigateToScreen('subject'));
        }

        const btnToggleSide = document.getElementById('btn-toggle-side');
        if (btnToggleSide) {
            btnToggleSide.addEventListener('click', () => this.toggleSide());
        }

        const btnEnableOrientation = document.getElementById('btn-enable-orientation');
        if (btnEnableOrientation) {
            btnEnableOrientation.addEventListener('click', () => this.enableOrientation());
        }

        const btnStepConfirm = document.getElementById('btn-step-confirm');
        if (btnStepConfirm) {
            btnStepConfirm.addEventListener('click', () => capture.confirmStep());
        }

        const btnCapture = document.getElementById('btn-capture');
        if (btnCapture) {
            btnCapture.addEventListener('click', () => this.handleCapture());
        }

        // Distance modal
        const distanceOptions = document.querySelectorAll('.distance-option');
        distanceOptions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.dataset.distance;
                capture.setDistanceConfirmation(value);
            });
        });

        // Measurement screen buttons
        const btnBackToCamera = document.getElementById('btn-back-to-camera');
        if (btnBackToCamera) {
            btnBackToCamera.addEventListener('click', () => this.navigateToScreen('camera'));
        }

        const btnResetPoints = document.getElementById('btn-reset-points');
        if (btnResetPoints) {
            btnResetPoints.addEventListener('click', () => measurement.reset());
        }

        const btnSaveMeasurement = document.getElementById('btn-save-measurement');
        if (btnSaveMeasurement) {
            btnSaveMeasurement.addEventListener('click', () => this.handleSaveMeasurement());
        }

        // Export screen buttons
        const btnExportCSV = document.getElementById('btn-export-csv');
        if (btnExportCSV) {
            btnExportCSV.addEventListener('click', () => exportManager.exportCSV());
        }

        const btnExportJSON = document.getElementById('btn-export-json');
        if (btnExportJSON) {
            btnExportJSON.addEventListener('click', () => exportManager.exportJSON());
        }

        const btnExportImages = document.getElementById('btn-export-images');
        if (btnExportImages) {
            btnExportImages.addEventListener('click', () => {
                if (this.capturedImages) {
                    exportManager.exportImages(
                        this.capturedImages.original,
                        this.capturedImages.overlay
                    );
                }
            });
        }

        const btnNewMeasurement = document.getElementById('btn-new-measurement');
        if (btnNewMeasurement) {
            btnNewMeasurement.addEventListener('click', () => this.startNewMeasurement());
        }
    }

    /**
     * Handle subject form submission
     */
    async handleSubjectFormSubmit() {
        // Get form data
        this.sessionData.subject_id = document.getElementById('subject-id').value;
        this.sessionData.operator_id = document.getElementById('operator-id').value;
        this.sessionData.side = document.querySelector('input[name="side"]:checked').value;

        // Get mode
        const modeEl = document.querySelector('input[name="mode"]:checked');
        this.sessionData.mode = modeEl ? modeEl.value : 'realtime';

        this.sessionData.measurement_type = document.getElementById('measurement-type').value;
        this.sessionData.session_id = storage.generateSessionId();

        // Handle based on mode
        if (this.sessionData.mode === 'import') {
            // Trigger file selection
            importManager.selectFile();
        } else {
            // Navigate to camera screen (Real-time)
            await this.navigateToScreen('camera');
        }
    }

    /**
     * Handle completed import (called from ImportManager)
     */
    handleImportComplete(imageCanvas, checklist) {
        // Save checklist
        this.sessionData.checklist = checklist;

        // Store image
        this.capturedImages = {
            original: imageCanvas,
            overlay: imageCanvas // For import, overlay is same as original initially
        };

        this.sessionData.timestamp = new Date().toISOString();

        // Go to measurement
        this.navigateToMeasurementScreen();
    }

    /**
     * Navigate to screen
     */
    async navigateToScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(`screen-${screenName}`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        this.currentScreen = screenName;

        // Screen-specific initialization
        if (screenName === 'camera') {
            await this.initCameraScreen();
        } else if (screenName === 'subject') {
            this.cleanupCameraScreen();
        }
    }

    /**
     * Initialize camera screen
     */
    async initCameraScreen() {
        const video = document.getElementById('camera-preview');
        const canvas = document.getElementById('overlay-canvas');

        // Initialize camera
        const success = await camera.init(video);
        if (!success) {
            this.navigateToScreen('subject');
            return;
        }

        // Initialize overlay
        overlay.init(canvas, video);

        // Initialize capture manager
        capture.init();

        // Update foot guide
        this.updateFootGuide();

        // Update side display
        const sideDisplay = document.getElementById('current-side-display');
        if (sideDisplay) {
            sideDisplay.textContent = this.sessionData.side === 'L' ? '左脚' : '右脚';
        }
    }

    /**
     * Cleanup camera screen
     */
    cleanupCameraScreen() {
        camera.stop();
        orientation.stop();
    }

    /**
     * Toggle side (left/right)
     */
    toggleSide() {
        this.sessionData.side = this.sessionData.side === 'L' ? 'R' : 'L';

        const sideDisplay = document.getElementById('current-side-display');
        if (sideDisplay) {
            sideDisplay.textContent = this.sessionData.side === 'L' ? '左脚' : '右脚';
        }

        this.updateFootGuide();
    }

    /**
     * Update foot guide SVG
     */
    updateFootGuide() {
        const footGuide = document.getElementById('foot-guide');
        if (footGuide) {
            const svgPath = this.sessionData.side === 'L' ?
                'assets/foot-left.svg' : 'assets/foot-right.svg';
            footGuide.src = svgPath;
        }
    }

    /**
     * Enable orientation tracking
     */
    async enableOrientation() {
        const success = await orientation.start((data) => {
            this.updateLevelIndicator(data);
        });

        if (success) {
            const btn = document.getElementById('btn-enable-orientation');
            if (btn) {
                btn.style.display = 'none';
            }
        }
    }

    /**
     * Update level indicator UI
     */
    updateLevelIndicator(data) {
        const indicator = document.getElementById('level-indicator');
        const textEl = document.getElementById('level-text');
        const markerEl = document.getElementById('roll-marker');

        if (!indicator || !textEl) return;

        if (data.is_level) {
            indicator.className = 'level-indicator level-ok';
            textEl.textContent = '✓ 水平';
        } else {
            indicator.className = 'level-indicator level-warning';

            // Direction arrows
            const pitchDir = data.pitch_deg > 5 ? '↓' : data.pitch_deg < -5 ? '↑' : '';
            const rollDir = data.roll_deg > 5 ? '→' : data.roll_deg < -5 ? '←' : '';

            textEl.textContent = `${pitchDir}${rollDir} 調整してください`;
        }

        // Update marker position
        if (markerEl && data.roll_deg !== null) {
            const maxOffset = 100; // pixels
            const offset = Math.max(-maxOffset, Math.min(maxOffset, data.roll_deg * 10));
            markerEl.style.transform = `translate(-50%, -50%) translateX(${offset}px)`;
        }
    }

    /**
     * Handle capture button
     */
    handleCapture() {
        // Capture images
        this.capturedImages = capture.capture();

        if (!this.capturedImages) {
            return;
        }

        // Save checklist data
        this.sessionData.checklist = capture.getChecklistData();

        // Save orientation data
        this.sessionData.device_orientation = orientation.getCurrentOrientation();

        // Set timestamp
        this.sessionData.timestamp = new Date().toISOString();

        // Navigate to measurement screen
        this.navigateToMeasurementScreen();
    }

    /**
     * Navigate to measurement screen
     */
    navigateToMeasurementScreen() {
        this.navigateToScreen('measurement');

        // Initialize measurement canvas
        const measurementCanvas = document.getElementById('measurement-canvas');
        if (measurementCanvas && this.capturedImages) {
            measurement.init(measurementCanvas, this.capturedImages.original);
        }
    }

    /**
     * Handle save measurement
     */
    async handleSaveMeasurement() {
        // Get measurement data
        const measurementData = measurement.getMeasurementData();
        this.sessionData.points = measurementData.points;
        this.sessionData.angle_value = measurementData.angle_value;

        // Save to IndexedDB
        try {
            await storage.saveMeasurement(this.sessionData);
            console.log('Measurement saved to IndexedDB');
        } catch (error) {
            console.error('Failed to save measurement:', error);
        }

        // Set export data
        exportManager.setData(this.sessionData);

        // Navigate to export screen
        this.navigateToExportScreen();
    }

    /**
     * Navigate to export screen
     */
    navigateToExportScreen() {
        this.navigateToScreen('export');

        // Update summary display
        document.getElementById('export-subject-id').textContent = this.sessionData.subject_id;
        document.getElementById('export-side').textContent =
            this.sessionData.side === 'L' ? '左脚 (L)' : '右脚 (R)';
        document.getElementById('export-angle').textContent = this.sessionData.angle_value;
        document.getElementById('export-timestamp').textContent =
            exportManager.formatTimestampForDisplay(this.sessionData.timestamp);
    }

    /**
     * Start new measurement
     */
    startNewMeasurement() {
        // Reset session data
        this.sessionData = {
            session_id: null,
            subject_id: '',
            operator_id: '',
            side: 'L',
            mode: 'realtime',
            posture: 'sitting',
            distance_m: 3.0,
            measurement_type: 'ankle_dorsiflexion',
            checklist: {},
            device_orientation: {},
            points: [],
            angle_value: null,
            timestamp: null,
            device_info: this.getDeviceInfo(),
            original_photo: '',
            overlay_photo: ''
        };

        this.capturedImages = null;

        // Navigate to subject screen
        this.navigateToScreen('subject');
    }

    /**
     * Get device info
     */
    getDeviceInfo() {
        return `${navigator.userAgent}`;
    }
}

// Initialize app when DOM is ready
let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = new AnkleCaptureApp();
    await app.init();
});
