/**
 * app.js - Main Application Controller (Improved Version)
 * Supports multiple measurements per session
 */

class AnkleCaptureApp {
    constructor() {
        this.currentScreen = 'subject';
        
        // Session data with support for multiple measurements
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
            timestamp: null,
            device_info: ''
        };
        
        // Array to store multiple measurements
        this.measurements = [];
        
        // Current captured image (shared across measurements in import mode)
        this.capturedImages = null;
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('AnkleCapture (Improved) initializing...');

        // Check browser support
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

        // NEW: Add measurement button
        const btnAddMeasurement = document.getElementById('btn-add-measurement');
        if (btnAddMeasurement) {
            btnAddMeasurement.addEventListener('click', () => this.handleAddMeasurement());
        }

        // NEW: Finish measurements button
        const btnFinishMeasurements = document.getElementById('btn-finish-measurements');
        if (btnFinishMeasurements) {
            btnFinishMeasurements.addEventListener('click', () => this.handleFinishMeasurements());
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
            btnExportImages.addEventListener('click', () => exportManager.exportAllImages());
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
        
        const modeEl = document.querySelector('input[name="mode"]:checked');
        this.sessionData.mode = modeEl ? modeEl.value : 'realtime';
        this.sessionData.measurement_type = document.getElementById('measurement-type').value;
        this.sessionData.session_id = storage.generateSessionId();
        this.sessionData.timestamp = new Date().toISOString();

        // Reset measurements array
        this.measurements = [];

        // Handle based on mode
        if (this.sessionData.mode === 'import') {
            importManager.selectFile();
        } else {
            await this.navigateToScreen('camera');
        }
    }

    /**
     * Handle completed import (called from ImportManager)
     */
    handleImportComplete(imageCanvas, checklist) {
        this.sessionData.checklist = checklist;
        
        this.capturedImages = {
            original: imageCanvas,
            overlay: imageCanvas
        };

        this.navigateToMeasurementScreen();
    }

    /**
     * Navigate to screen
     */
    async navigateToScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const targetScreen = document.getElementById(`screen-${screenName}`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        this.currentScreen = screenName;

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

        const success = await camera.init(video);
        if (!success) {
            this.navigateToScreen('subject');
            return;
        }

        overlay.init(canvas, video);
        capture.init();
        this.updateFootGuide();

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
            const svgPath = this.sessionData.side === 'L' 
                ? 'assets/foot-left.svg' 
                : 'assets/foot-right.svg';
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
            const pitchDir = data.pitch_deg > 5 ? '↓' : data.pitch_deg < -5 ? '↑' : '';
            const rollDir = data.roll_deg > 5 ? '→' : data.roll_deg < -5 ? '←' : '';
            textEl.textContent = `${pitchDir}${rollDir} 調整してください`;
        }

        if (markerEl && data.roll_deg !== null) {
            const maxOffset = 100;
            const offset = Math.max(-maxOffset, Math.min(maxOffset, data.roll_deg * 10));
            markerEl.style.transform = `translate(-50%, -50%) translateX(${offset}px)`;
        }
    }

    /**
     * Handle capture button
     */
    handleCapture() {
        this.capturedImages = capture.capture();

        if (!this.capturedImages) {
            return;
        }

        this.sessionData.checklist = capture.getChecklistData();
        this.sessionData.device_orientation = orientation.getCurrentOrientation();

        this.navigateToMeasurementScreen();
    }

    /**
     * Navigate to measurement screen
     */
    navigateToMeasurementScreen() {
        this.navigateToScreen('measurement');

        const measurementCanvas = document.getElementById('measurement-canvas');
        if (measurementCanvas && this.capturedImages) {
            measurement.init(measurementCanvas, this.capturedImages.original);
        }

        // Update measurement counter
        this.updateMeasurementCounter();
        this.updateMeasurementList();
        this.updateMeasurementButtons();
    }

    /**
     * Update measurement counter display
     */
    updateMeasurementCounter() {
        const counterEl = document.getElementById('current-measurement-num');
        if (counterEl) {
            counterEl.textContent = this.measurements.length + 1;
        }
    }

    /**
     * Update measurement list display
     */
    updateMeasurementList() {
        const listEl = document.getElementById('measurement-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        this.measurements.forEach((m, index) => {
            const item = document.createElement('div');
            item.className = 'measurement-item';
            item.innerHTML = `
                <span class="measurement-num">#${index + 1}</span>
                <span class="measurement-angle">${m.angle_value}°</span>
                <button class="btn btn-small btn-danger" data-index="${index}">削除</button>
            `;
            
            // Add delete handler
            item.querySelector('button').addEventListener('click', () => {
                this.deleteMeasurement(index);
            });

            listEl.appendChild(item);
        });
    }

    /**
     * Update measurement control buttons state
     */
    updateMeasurementButtons() {
        const btnAdd = document.getElementById('btn-add-measurement');
        const btnFinish = document.getElementById('btn-finish-measurements');

        // Add button: enabled when current measurement is complete
        if (btnAdd) {
            btnAdd.disabled = true; // Will be enabled by measurement.js when points are complete
        }

        // Finish button: enabled when at least one measurement exists
        if (btnFinish) {
            btnFinish.disabled = this.measurements.length === 0;
        }
    }

    /**
     * Handle adding current measurement to list
     */
    handleAddMeasurement() {
        const measurementData = measurement.getMeasurementData();
        
        if (!measurementData.angle_value) {
            alert('測定が完了していません');
            return;
        }

        // Generate overlay image with points and angle
        const overlayCanvas = measurement.generateOverlayImage();

        // Add to measurements array
        this.measurements.push({
            measurement_num: this.measurements.length + 1,
            points: measurementData.points,
            angle_value: measurementData.angle_value,
            original_image: this.capturedImages.original,
            overlay_image: overlayCanvas,
            timestamp: new Date().toISOString()
        });

        // Reset for next measurement
        measurement.reset();
        
        // Update UI
        this.updateMeasurementCounter();
        this.updateMeasurementList();
        this.updateMeasurementButtons();

        console.log(`Measurement #${this.measurements.length} added: ${measurementData.angle_value}°`);
    }

    /**
     * Delete a measurement from list
     */
    deleteMeasurement(index) {
        if (confirm(`測定 #${index + 1} を削除しますか？`)) {
            this.measurements.splice(index, 1);
            
            // Renumber remaining measurements
            this.measurements.forEach((m, i) => {
                m.measurement_num = i + 1;
            });

            this.updateMeasurementCounter();
            this.updateMeasurementList();
            this.updateMeasurementButtons();
        }
    }

    /**
     * Handle finishing all measurements
     */
    async handleFinishMeasurements() {
        if (this.measurements.length === 0) {
            alert('少なくとも1回の測定が必要です');
            return;
        }

        // Save all measurements to IndexedDB
        try {
            await storage.saveMeasurementSession({
                ...this.sessionData,
                measurements: this.measurements
            });
            console.log('All measurements saved to IndexedDB');
        } catch (error) {
            console.error('Failed to save measurements:', error);
        }

        // Set export data
        exportManager.setData(this.sessionData, this.measurements);

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
        document.getElementById('export-count').textContent = this.measurements.length;
        document.getElementById('export-timestamp').textContent = 
            exportManager.formatTimestampForDisplay(this.sessionData.timestamp);

        // Populate results table
        this.populateExportResultsTable();
    }

    /**
     * Populate export results table
     */
    populateExportResultsTable() {
        const tbody = document.getElementById('export-results-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.measurements.forEach((m, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${m.angle_value}</td>
                <td>(${m.points[0]?.x || '--'}, ${m.points[0]?.y || '--'})</td>
                <td>(${m.points[1]?.x || '--'}, ${m.points[1]?.y || '--'})</td>
                <td>(${m.points[2]?.x || '--'}, ${m.points[2]?.y || '--'})</td>
            `;
            tbody.appendChild(row);
        });

        // Calculate and display statistics
        const angles = this.measurements.map(m => m.angle_value);
        const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
        const variance = angles.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / angles.length;
        const sd = Math.sqrt(variance);

        document.getElementById('export-mean').textContent = mean.toFixed(1);
        document.getElementById('export-sd').textContent = sd.toFixed(2);
    }

    /**
     * Start new measurement session
     */
    startNewMeasurement() {
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
            timestamp: null,
            device_info: this.getDeviceInfo()
        };

        this.measurements = [];
        this.capturedImages = null;

        this.navigateToScreen('subject');
    }

    /**
     * Get device info
     */
    getDeviceInfo() {
        return `${navigator.userAgent}`;
    }

    /**
     * Enable add measurement button (called from measurement.js)
     */
    enableAddMeasurementButton(enabled) {
        const btnAdd = document.getElementById('btn-add-measurement');
        if (btnAdd) {
            btnAdd.disabled = !enabled;
        }
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', async () => {
    app = new AnkleCaptureApp();
    await app.init();
});
