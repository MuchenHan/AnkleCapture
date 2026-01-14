/**
 * app.js - Main Application Controller
 * Orchestrates all modules and handles navigation
 */

class AnkleCaptureApp {
    constructor() {
        this.currentScreen = 'subject';
        this.measurementMode = 'realtime'; // 'realtime' or 'import'
        this.sessionData = {
            session_id: null,
            subject_id: '',
            operator_id: '',
            side: 'L',
            posture: 'sitting',
            distance_m: 3.0,
            measurement_type: 'ankle_dorsiflexion',
            mode: 'realtime', // Add mode field
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
        this.pendingImportCanvas = null; // For import mode
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
            btnBackToSubject.addEventListener('click', () => {
                // Clean up import mode if active
                if (this.measurementMode === 'import') {
                    this.cleanupImportMode();
                    this.pendingImportCanvas = null;
                    importManager.reset();
                }
                this.navigateToScreen('subject');
            });
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

        // Import mode event listeners
        this.setupImportEventListeners();
    }

    /**
     * Setup import mode event listeners
     */
    setupImportEventListeners() {
        // File input change
        const photoInput = document.getElementById('photo-input');
        if (photoInput) {
            photoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.handlePhotoImport(file);
                }
                // Reset input to allow re-selecting same file
                photoInput.value = '';
            });
        }
    }

    // Import mode state
    importStep = 1;
    importTotalSteps = 3;

    /**
     * Handle subject form submission
     */
    async handleSubjectFormSubmit() {
        // Get form data
        this.sessionData.subject_id = document.getElementById('subject-id').value;
        this.sessionData.operator_id = document.getElementById('operator-id').value;
        this.sessionData.side = document.querySelector('input[name="side"]:checked').value;
        this.sessionData.measurement_type = document.getElementById('measurement-type').value;
        this.sessionData.session_id = storage.generateSessionId();

        // Get measurement mode
        const modeInput = document.querySelector('input[name="mode"]:checked');
        this.measurementMode = modeInput ? modeInput.value : 'realtime';
        this.sessionData.mode = this.measurementMode;

        // Handle based on mode
        if (this.measurementMode === 'import') {
            // Trigger file input for import mode
            importManager.triggerFileInput();
        } else {
            // Navigate to camera screen for realtime mode
            await this.navigateToScreen('camera');
        }
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
            sideDisplay.textContent = this.sessionData.side === 'L' ? '左足' : '右足';
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
            sideDisplay.textContent = this.sessionData.side === 'L' ? '左足' : '右足';
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
        const pitchValueEl = document.getElementById('pitch-value');
        const rollValueEl = document.getElementById('roll-value');

        if (!indicator || !textEl) return;

        // Update numeric values display
        if (pitchValueEl && data.pitch_deg !== null) {
            pitchValueEl.textContent = data.pitch_deg.toFixed(1);
        }
        if (rollValueEl && data.roll_deg !== null) {
            rollValueEl.textContent = data.roll_deg.toFixed(1);
        }

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

        // Set timestamp with timezone
        this.sessionData.timestamp = this.formatTimestampWithTimezone();

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
            this.sessionData.side === 'L' ? '左足 (L)' : '右足 (R)';
        document.getElementById('export-angle').textContent = this.sessionData.angle_value;
        document.getElementById('export-timestamp').textContent =
            exportManager.formatTimestampForDisplay(this.sessionData.timestamp);
    }

    /**
     * Start new measurement
     */
    startNewMeasurement() {
        // Clean up import mode if active
        this.cleanupImportMode();

        // Reset session data
        this.measurementMode = 'realtime';
        this.sessionData = {
            session_id: null,
            subject_id: '',
            operator_id: '',
            side: 'L',
            posture: 'sitting',
            distance_m: 3.0,
            measurement_type: 'ankle_dorsiflexion',
            mode: 'realtime',
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
        this.pendingImportCanvas = null;
        this.importStep = 1;

        // Reset import manager
        importManager.reset();

        // Navigate to subject screen
        this.navigateToScreen('subject');
    }

    /**
     * Get device info
     */
    getDeviceInfo() {
        return `${navigator.userAgent}`;
    }

    /**
     * Format timestamp with timezone (ISO 8601)
     * Returns format: 2026-01-14T14:32:15+09:00
     */
    formatTimestampWithTimezone() {
        const now = new Date();
        const offset = -now.getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
        const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
        return now.toISOString().slice(0, 19) + sign + hours + ':' + minutes;
    }

    // ========================================
    // Import Mode Methods
    // ========================================

    /**
     * Get import step instruction
     */
    getImportStepInstruction(step) {
        const instructions = {
            1: '撮影視角が真横であることを確認',
            2: '足部が完整に表示されていることを確認（膝下から足先まで）',
            3: '明らかな歪みがないことを確認'
        };
        return instructions[step] || '';
    }

    /**
     * Handle photo import - navigate to camera screen with imported photo
     */
    async handlePhotoImport(file) {
        const canvas = await importManager.handleFileSelect(file);
        if (canvas) {
            this.pendingImportCanvas = canvas;
            // Navigate to camera screen in import mode
            await this.initImportPreviewScreen();
        }
    }

    /**
     * Initialize import preview screen (reuses camera screen)
     */
    async initImportPreviewScreen() {
        // Navigate to camera screen
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const cameraScreen = document.getElementById('screen-camera');
        if (cameraScreen) {
            cameraScreen.classList.add('active');
        }
        this.currentScreen = 'camera';

        // Add import-mode class to camera container
        const container = document.getElementById('camera-container');
        if (container) {
            container.classList.add('import-mode');
        }

        // Hide video, show import preview canvas
        const video = document.getElementById('camera-preview');
        const importCanvas = document.getElementById('import-preview-canvas');

        if (video) video.classList.add('hidden');
        if (importCanvas) {
            importCanvas.classList.remove('hidden');
            // Draw imported photo to canvas
            this.drawImportPreview();
        }

        // Update side display
        const sideDisplay = document.getElementById('current-side-display');
        if (sideDisplay) {
            sideDisplay.textContent = this.sessionData.side === 'L' ? '左足' : '右足';
        }

        // Update toggle button to "写真を変更"
        const toggleBtn = document.getElementById('btn-toggle-side');
        if (toggleBtn) {
            toggleBtn.textContent = '写真を変更';
            toggleBtn.onclick = () => {
                importManager.triggerFileInput();
            };
        }

        // Initialize import step guidance
        this.importStep = 1;
        this.updateImportStepUI();

        // Update capture button to "測定に進む"
        const captureBtn = document.getElementById('btn-capture');
        if (captureBtn) {
            captureBtn.textContent = '📐 測定に進む';
            captureBtn.disabled = true;
            captureBtn.onclick = () => this.proceedToMeasurementFromImport();
        }

        // Update step confirm button for import mode
        const stepConfirmBtn = document.getElementById('btn-step-confirm');
        if (stepConfirmBtn) {
            stepConfirmBtn.onclick = () => this.confirmImportStep();
        }

        // Hide distance warning
        const distanceWarning = document.getElementById('distance-warning');
        if (distanceWarning) {
            distanceWarning.classList.add('hidden');
        }
    }

    /**
     * Draw imported photo to preview canvas
     */
    drawImportPreview() {
        const importCanvas = document.getElementById('import-preview-canvas');
        if (!importCanvas || !this.pendingImportCanvas) return;

        const container = document.getElementById('camera-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Set canvas size to match container
        importCanvas.width = containerWidth;
        importCanvas.height = containerHeight;

        const ctx = importCanvas.getContext('2d');
        const img = this.pendingImportCanvas;

        // Calculate aspect ratio fit
        const imgAspect = img.width / img.height;
        const containerAspect = containerWidth / containerHeight;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > containerAspect) {
            // Image is wider - fit to width
            drawWidth = containerWidth;
            drawHeight = containerWidth / imgAspect;
            drawX = 0;
            drawY = (containerHeight - drawHeight) / 2;
        } else {
            // Image is taller - fit to height
            drawHeight = containerHeight;
            drawWidth = containerHeight * imgAspect;
            drawX = (containerWidth - drawWidth) / 2;
            drawY = 0;
        }

        // Clear and draw
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, containerWidth, containerHeight);
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    /**
     * Update import step UI
     */
    updateImportStepUI() {
        const counterEl = document.getElementById('step-counter');
        const instructionEl = document.getElementById('step-instruction');
        const confirmBtn = document.getElementById('btn-step-confirm');
        const captureBtn = document.getElementById('btn-capture');

        if (counterEl) {
            counterEl.textContent = `ステップ ${this.importStep}/${this.importTotalSteps}`;
        }

        if (instructionEl) {
            instructionEl.textContent = this.getImportStepInstruction(this.importStep);
        }

        // Update step progress dots (only show 3 for import mode)
        this.updateImportStepProgressDots();

        // Show/hide confirm button
        if (confirmBtn) {
            confirmBtn.style.display = this.importStep <= this.importTotalSteps ? 'block' : 'none';
        }

        // Enable capture button only after all steps completed
        if (captureBtn) {
            captureBtn.disabled = this.importStep <= this.importTotalSteps;
        }
    }

    /**
     * Update import step progress dots
     */
    updateImportStepProgressDots() {
        const dots = document.querySelectorAll('.step-dot');
        dots.forEach((dot, index) => {
            const stepNum = index + 1;
            dot.classList.remove('active', 'completed');

            // Hide step 4 in import mode
            if (stepNum === 4) {
                dot.style.display = 'none';
                return;
            }

            if (stepNum < this.importStep) {
                dot.classList.add('completed');
            } else if (stepNum === this.importStep) {
                dot.classList.add('active');
            }
        });
    }

    /**
     * Confirm import step
     */
    confirmImportStep() {
        if (this.importStep < this.importTotalSteps) {
            this.importStep++;
            this.updateImportStepUI();
        } else if (this.importStep === this.importTotalSteps) {
            // Last step confirmed
            this.importStep++;
            this.updateImportStepUI();
        }
    }

    /**
     * Proceed to measurement from import mode
     */
    proceedToMeasurementFromImport() {
        if (!this.pendingImportCanvas) return;

        // Set captured images
        this.capturedImages = {
            original: this.pendingImportCanvas,
            overlay: this.pendingImportCanvas
        };

        // Set import mode checklist
        this.sessionData.checklist = importManager.getImportChecklist();

        // Set empty device orientation
        this.sessionData.device_orientation = {
            pitch_deg: null,
            roll_deg: null,
            is_level: null,
            level_tolerance_deg: 5.0
        };

        // Set timestamp
        this.sessionData.timestamp = this.formatTimestampWithTimezone();

        // Clean up import mode UI
        this.cleanupImportMode();

        // Navigate to measurement screen
        this.navigateToMeasurementScreen();
    }

    /**
     * Clean up import mode UI and restore realtime mode defaults
     */
    cleanupImportMode() {
        const container = document.getElementById('camera-container');
        if (container) {
            container.classList.remove('import-mode');
        }

        const importCanvas = document.getElementById('import-preview-canvas');
        if (importCanvas) {
            importCanvas.classList.add('hidden');
        }

        const video = document.getElementById('camera-preview');
        if (video) {
            video.classList.remove('hidden');
        }

        // Restore toggle button
        const toggleBtn = document.getElementById('btn-toggle-side');
        if (toggleBtn) {
            toggleBtn.textContent = '左右切替';
            toggleBtn.onclick = () => this.toggleSide();
        }

        // Restore capture button
        const captureBtn = document.getElementById('btn-capture');
        if (captureBtn) {
            captureBtn.textContent = '📸 撮影';
            captureBtn.onclick = () => this.handleCapture();
        }

        // Restore step confirm button
        const stepConfirmBtn = document.getElementById('btn-step-confirm');
        if (stepConfirmBtn) {
            stepConfirmBtn.onclick = () => capture.confirmStep();
        }

        // Show all step dots
        const dots = document.querySelectorAll('.step-dot');
        dots.forEach(dot => {
            dot.style.display = '';
        });
    }
}

// Initialize app when DOM is ready
let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = new AnkleCaptureApp();
    await app.init();
});
