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

        // Lock to portrait orientation
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait').catch(() => {
                // Orientation lock not supported or not allowed
            });
        }

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
            ui.showToast(`未対応機能: ${missingFeatures.join(', ')}`, 'error', 5000);
            return;
        }

        // Initialize storage
        try {
            await storage.init();
        } catch (error) {
            console.error('Storage initialization failed:', error);
            ui.showToast('データベースの初期化に失敗しました。ブラウザの設定を確認してください。', 'error', 10000);
            // Don't return - app can still work for current session, just can't save
        }

        // Initialize native bridge
        await NativeBridge.init();

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
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
            btnBackToCamera.addEventListener('click', () => this.handleBackFromMeasurement());
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
        const btnShare = document.getElementById('btn-share');
        if (btnShare) {
            btnShare.addEventListener('click', () => exportManager.shareFiles());
        }

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

        // Undo point button
        const btnUndoPoint = document.getElementById('btn-undo-point');
        if (btnUndoPoint) {
            btnUndoPoint.addEventListener('click', () => measurement.undoLastPoint());
        }

        // History screen buttons
        const btnBackFromHistory = document.getElementById('btn-back-from-history');
        if (btnBackFromHistory) {
            btnBackFromHistory.addEventListener('click', () => this.navigateToScreen('subject'));
        }

        // Tab bar
        document.querySelectorAll('.tab-bar-item').forEach(tab => {
            tab.addEventListener('click', async () => {
                const screen = tab.dataset.screen;
                if (screen === 'history') {
                    await this.navigateToHistory();
                } else if (screen === 'subject') {
                    this.navigateToScreen('subject');
                }
            });
        });

        // Initialize history UI event listeners
        historyManager.initUI();

        // Browser back button support
        window.addEventListener('popstate', (e) => {
            const backMap = {
                'measurement': 'camera',
                'camera': 'subject',
                'export': 'subject',
                'history': 'subject'
            };
            const target = backMap[this.currentScreen] || 'subject';
            this.navigateToScreen(target);
        });
    }

    /**
     * Handle subject form submission
     */
    async handleSubjectFormSubmit() {
        NativeBridge.haptic('light');
        // Get form data (trim whitespace)
        this.sessionData.subject_id = document.getElementById('subject-id').value.trim();
        this.sessionData.operator_id = document.getElementById('operator-id').value.trim();
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
    handleImportComplete(imageCanvas, checklist, fileName) {
        this.sessionData.checklist = checklist;
        this.sessionData.imported_file_name = fileName || null;

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
        // Push browser history state for back button support
        history.pushState({ screen: screenName }, '', '');

        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const targetScreen = document.getElementById(`screen-${screenName}`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }

        this.currentScreen = screenName;

        // Update tab bar visibility and active state
        const tabBar = document.getElementById('tab-bar');
        if (tabBar) {
            // Hide tab bar on camera and measurement screens
            const hideOnScreens = ['camera', 'measurement'];
            tabBar.style.display = hideOnScreens.includes(screenName) ? 'none' : 'flex';

            // Update active tab
            document.querySelectorAll('.tab-bar-item').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.screen === screenName ||
                    (screenName === 'export' && tab.dataset.screen === 'subject'));
            });
        }

        // Add bottom padding for tab bar on screens where it's visible
        document.querySelectorAll('.screen .content').forEach(content => {
            content.style.paddingBottom = '';
        });
        if (!['camera', 'measurement'].includes(screenName)) {
            const activeContent = targetScreen ? targetScreen.querySelector('.content') : null;
            if (activeContent) {
                activeContent.style.paddingBottom = 'calc(80px + env(safe-area-inset-bottom, 0px))';
            }
        }

        // Switch status bar style based on screen
        if (screenName === 'camera') {
            NativeBridge.setStatusBarForCamera();
            await this.initCameraScreen();
        } else {
            NativeBridge.setStatusBarForContent();
            if (screenName === 'subject') {
                this.cleanupCameraScreen();
            }
        }
    }

    /**
     * Initialize camera screen
     */
    async initCameraScreen() {
        this.showLoading(true);

        const video = document.getElementById('camera-preview');
        const canvas = document.getElementById('overlay-canvas');

        const success = await camera.init(video);
        this.showLoading(false);
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
     * Handle back button from measurement screen
     * For import mode: re-select file, for realtime mode: go back to camera
     */
    handleBackFromMeasurement() {
        // Confirm if measurements exist
        if (this.measurements.length > 0) {
            if (!confirm('測定データが保存されていません。戻りますか？')) {
                return;
            }
        }

        // Reset current measurements
        this.measurements = [];

        if (this.sessionData.mode === 'import') {
            // For import mode, re-select a file
            importManager.selectFile();
        } else {
            // For realtime mode, go back to camera
            this.navigateToScreen('camera');
        }
    }

    /**
     * Handle capture button
     */
    handleCapture() {
        NativeBridge.haptic('medium');
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

        // Update back button text based on mode
        const btnBack = document.getElementById('btn-back-to-camera');
        if (btnBack) {
            btnBack.textContent = this.sessionData.mode === 'import'
                ? '← 画像を再選択'
                : '← 再撮影';
        }

        // Use requestAnimationFrame to ensure DOM is fully rendered before initializing
        requestAnimationFrame(() => {
            const measurementCanvas = document.getElementById('measurement-canvas');

            if (measurementCanvas && this.capturedImages) {
                measurement.init(measurementCanvas, this.capturedImages.original);
            }

            // Update measurement counter
            this.updateMeasurementCounter();
            this.updateMeasurementList();
            this.updateMeasurementButtons();
        });
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
                <span class="measurement-num">#${this.escapeHtml(String(index + 1))}</span>
                <span class="measurement-angle">${this.escapeHtml(String(m.angle_value))}°</span>
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
     * Convert a canvas element to a Blob
     */
    async canvasToBlob(canvas, type = 'image/png', quality = 1.0) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob returned null'));
                }
            }, type, quality);
        });
    }

    /**
     * Generate a thumbnail Blob from a canvas (200px wide, JPEG 0.8)
     */
    async generateThumbnail(canvas, maxWidth = 200) {
        const ratio = canvas.height / canvas.width;
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = maxWidth;
        thumbCanvas.height = Math.round(maxWidth * ratio);
        const ctx = thumbCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        return this.canvasToBlob(thumbCanvas, 'image/jpeg', 0.8);
    }

    /**
     * Handle adding current measurement to list (async for Blob conversion)
     */
    async handleAddMeasurement() {
        const measurementData = measurement.getMeasurementData();

        if (!measurementData.angle_value) {
            ui.showToast('測定が完了していません', 'error');
            return;
        }

        // Generate overlay image with points and angle
        const overlayCanvas = measurement.generateOverlayImage();

        // Convert canvas elements to Blobs for IndexedDB storage
        let originalBlob = null;
        let overlayBlob = null;
        let thumbnailBlob = null;

        try {
            originalBlob = await this.canvasToBlob(this.capturedImages.original);
        } catch (e) {
            console.warn('Failed to convert original image to Blob:', e);
            ui.showToast('元画像の変換に失敗しました', 'error');
        }

        try {
            overlayBlob = await this.canvasToBlob(overlayCanvas);
        } catch (e) {
            console.warn('Failed to convert overlay image to Blob:', e);
            ui.showToast('オーバーレイ画像の変換に失敗しました', 'error');
        }

        try {
            thumbnailBlob = await this.generateThumbnail(overlayCanvas);
        } catch (e) {
            console.warn('Failed to generate thumbnail:', e);
        }

        // Release overlay canvas memory after Blob conversion
        MeasurementManager.releaseCanvas(overlayCanvas);

        // Add to measurements array with Blobs (not canvas references)
        // Save even if images failed — angle data is still valuable
        this.measurements.push({
            measurement_num: this.measurements.length + 1,
            points: measurementData.points,
            angle_value: measurementData.angle_value,
            original_image: originalBlob,
            overlay_image: overlayBlob,
            thumbnail_image: thumbnailBlob,
            timestamp: new Date().toISOString()
        });

        // Reset for next measurement
        measurement.reset();

        // Update UI
        this.updateMeasurementCounter();
        this.updateMeasurementList();
        this.updateMeasurementButtons();

        ui.showToast(`測定 #${this.measurements.length} を追加 (${measurementData.angle_value}°)`, 'success');
        NativeBridge.haptic('medium');
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
            ui.showToast('少なくとも1回の測定が必要です', 'error');
            return;
        }

        // Show loading and disable finish button
        const btnFinish = document.getElementById('btn-finish-measurements');
        if (btnFinish) btnFinish.disabled = true;
        this.showLoading(true);

        // Save all measurements to IndexedDB
        try {
            await storage.saveMeasurementSession({
                ...this.sessionData,
                measurements: this.measurements
            });
            ui.showToast('データを保存しました', 'success');
            NativeBridge.haptic('success');
            console.log('All measurements saved to IndexedDB');
        } catch (error) {
            console.error('Failed to save measurements:', error);
            ui.showToast('保存に失敗しました', 'error');
        } finally {
            this.showLoading(false);
            if (btnFinish) btnFinish.disabled = false;
        }

        // Set export data (shallow copy to avoid holding live references)
        const sessionCopy = { ...this.sessionData };
        const measurementsCopy = this.measurements.map(m => ({ ...m }));
        exportManager.setData(sessionCopy, measurementsCopy);

        // Navigate to export screen
        this.navigateToExportScreen();
    }

    /**
     * Navigate to export screen
     */
    navigateToExportScreen() {
        this.navigateToScreen('export');

        // Update summary display (textContent is XSS-safe)
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
            const esc = (v) => this.escapeHtml(String(v));
            row.innerHTML = `
                <td>${esc(index + 1)}</td>
                <td>${esc(m.angle_value)}</td>
                <td>(${esc(m.points[0]?.x ?? '--')}, ${esc(m.points[0]?.y ?? '--')})</td>
                <td>(${esc(m.points[1]?.x ?? '--')}, ${esc(m.points[1]?.y ?? '--')})</td>
                <td>(${esc(m.points[2]?.x ?? '--')}, ${esc(m.points[2]?.y ?? '--')})</td>
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
        // Release captured image canvas memory before discarding reference
        if (this.capturedImages?.original) {
            this.capturedImages.original.width = 0;
            this.capturedImages.original.height = 0;
        }
        this.capturedImages = null;

        this.navigateToScreen('subject');
    }

    /**
     * Navigate to history screen and load sessions
     */
    async navigateToHistory() {
        await this.navigateToScreen('history');
        await historyManager.loadSessions();
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

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }
}

// Initialize app when DOM is ready
// Make app globally accessible via window.app
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new AnkleCaptureApp();
    await window.app.init();
});
