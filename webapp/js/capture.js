/**
 * capture.js - Image Capture & Step Guidance
 * Handles 4-step workflow and image capture
 */

class CaptureManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.checklist = {
            foot_in_frame: false,
            heel_on_ground: false,
            foot_flat: false,
            distance_confirmed: null
        };
        this.capturedCanvas = null;
        this.overlayCanvas = null;
    }

    /**
     * Initialize capture manager
     */
    init() {
        this.currentStep = 1;
        this.resetChecklist();
        this.updateStepUI();
    }

    /**
     * Reset checklist
     */
    resetChecklist() {
        this.checklist = {
            foot_in_frame: false,
            heel_on_ground: false,
            foot_flat: false,
            distance_confirmed: null
        };
    }

    /**
     * Get step instruction text
     */
    getStepInstruction(step) {
        const instructions = {
            1: '足をガイド枠内に配置してください',
            2: '踵が床に接地していることを確認',
            3: '足が平らになっていることを確認',
            4: '被験者との距離が3mであることを確認'
        };
        return instructions[step] || '';
    }

    /**
     * Update step UI
     */
    updateStepUI() {
        const counterEl = document.getElementById('step-counter');
        const instructionEl = document.getElementById('step-instruction');
        const confirmBtn = document.getElementById('btn-step-confirm');
        const captureBtn = document.getElementById('btn-capture');

        if (counterEl) {
            counterEl.textContent = `Step ${this.currentStep}/${this.totalSteps}`;
        }

        if (instructionEl) {
            instructionEl.textContent = this.getStepInstruction(this.currentStep);
        }

        // Show/hide confirm button for step 4 (distance uses modal)
        if (confirmBtn) {
            confirmBtn.style.display = this.currentStep === 4 ? 'none' : 'block';
        }

        // Enable capture button only after all steps completed
        if (captureBtn) {
            captureBtn.disabled = this.currentStep < this.totalSteps ||
                this.checklist.distance_confirmed === null;
        }
    }

    /**
     * Confirm current step
     */
    confirmStep() {
        switch (this.currentStep) {
            case 1:
                this.checklist.foot_in_frame = true;
                break;
            case 2:
                this.checklist.heel_on_ground = true;
                break;
            case 3:
                this.checklist.foot_flat = true;
                break;
            case 4:
                // Distance confirmation handled by modal
                return;
        }

        // Move to next step
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepUI();

            // Show distance modal on step 4
            if (this.currentStep === 4) {
                this.showDistanceModal();
            }
        }
    }

    /**
     * Show distance confirmation modal
     */
    showDistanceModal() {
        const modal = document.getElementById('distance-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Hide distance confirmation modal
     */
    hideDistanceModal() {
        const modal = document.getElementById('distance-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Set distance confirmation
     */
    setDistanceConfirmation(value) {
        this.checklist.distance_confirmed = value;
        this.hideDistanceModal();
        this.updateStepUI();
    }

    /**
     * Capture image from camera
     */
    capture() {
        // Capture original image
        this.capturedCanvas = camera.captureImage();

        if (!this.capturedCanvas) {
            alert('画像のキャプチャに失敗しました');
            return null;
        }

        // Generate overlay image
        this.overlayCanvas = this.generateOverlayImage();

        console.log('Image captured');
        return {
            original: this.capturedCanvas,
            overlay: this.overlayCanvas
        };
    }

    /**
     * Generate overlay image with grid, guides, and metadata
     */
    generateOverlayImage() {
        const canvas = document.createElement('canvas');
        canvas.width = this.capturedCanvas.width;
        canvas.height = this.capturedCanvas.height;

        const ctx = canvas.getContext('2d');

        // Draw original image
        ctx.drawImage(this.capturedCanvas, 0, 0);

        // Draw grid
        this.drawGridOnCanvas(ctx, canvas.width, canvas.height);

        // Draw metadata text
        this.drawMetadataOnCanvas(ctx, canvas.width, canvas.height);

        return canvas;
    }

    /**
     * Draw grid on canvas
     */
    drawGridOnCanvas(ctx, w, h) {
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();

        // Vertical lines
        ctx.moveTo(w / 3, 0);
        ctx.lineTo(w / 3, h);
        ctx.moveTo((w * 2) / 3, 0);
        ctx.lineTo((w * 2) / 3, h);

        // Horizontal lines
        ctx.moveTo(0, h / 3);
        ctx.lineTo(w, h / 3);
        ctx.moveTo(0, (h * 2) / 3);
        ctx.lineTo(w, (h * 2) / 3);

        ctx.stroke();
    }

    /**
     * Draw metadata on canvas
     */
    drawMetadataOnCanvas(ctx, w, h) {
        const padding = 20;
        const fontSize = Math.max(16, w / 60);

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, h - 100, w, 100);

        ctx.fillStyle = 'white';
        ctx.fillText(`✓ 足配置: ${this.checklist.foot_in_frame ? 'OK' : 'NG'}`, padding, h - 70);
        ctx.fillText(`✓ 踵接地: ${this.checklist.heel_on_ground ? 'OK' : 'NG'}`, padding, h - 45);
        ctx.fillText(`✓ 足平坦: ${this.checklist.foot_flat ? 'OK' : 'NG'}`, padding, h - 20);

        const distanceText = this.checklist.distance_confirmed || 'N/A';
        ctx.fillText(`✓ 距離: ${distanceText}`, w / 2, h - 45);
    }

    /**
     * Get captured images
     */
    getCapturedImages() {
        return {
            original: this.capturedCanvas,
            overlay: this.overlayCanvas
        };
    }

    /**
     * Get checklist data
     */
    getChecklistData() {
        return { ...this.checklist };
    }
}

// Global instance
const capture = new CaptureManager();
