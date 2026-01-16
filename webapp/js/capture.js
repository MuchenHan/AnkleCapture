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
            4: '距離が適切（1.5〜2m程度）であることを確認'
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
            counterEl.textContent = `ステップ ${this.currentStep}/${this.totalSteps}`;
        }

        if (instructionEl) {
            instructionEl.textContent = this.getStepInstruction(this.currentStep);
        }

        this.updateStepProgressDots();

        if (confirmBtn) {
            confirmBtn.style.display = this.currentStep === 4 ? 'none' : 'block';
        }

        if (captureBtn) {
            const allStepsComplete = this.currentStep >= this.totalSteps;
            const distanceConfirmed = this.checklist.distance_confirmed !== null;
            captureBtn.disabled = !(allStepsComplete && distanceConfirmed);
        }
    }

    /**
     * Update step progress dots
     */
    updateStepProgressDots() {
        const dots = document.querySelectorAll('.step-dot');
        dots.forEach((dot, index) => {
            const stepNum = index + 1;
            dot.classList.remove('active', 'completed');

            if (stepNum < this.currentStep) {
                dot.classList.add('completed');
            } else if (stepNum === this.currentStep) {
                dot.classList.add('active');
            }
        });

        if (this.checklist.distance_confirmed !== null) {
            const dot4 = document.querySelector('.step-dot[data-step="4"]');
            if (dot4) {
                dot4.classList.remove('active');
                dot4.classList.add('completed');
            }
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
                return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepUI();

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
        this.updateDistanceWarning(value);
        this.updateStepUI();
    }

    /**
     * Update distance warning display
     */
    updateDistanceWarning(value) {
        const warningEl = document.getElementById('distance-warning');
        if (!warningEl) return;

        if (value && value !== 'appropriate') {
            warningEl.classList.remove('hidden');
            const warningText = value === 'too_close' 
                ? '距離が近すぎます' 
                : '距離が遠すぎます';
            warningEl.textContent = warningText;
        } else {
            warningEl.classList.add('hidden');
        }
    }

    /**
     * Capture image from camera
     */
    capture() {
        this.capturedCanvas = camera.captureImage();

        if (!this.capturedCanvas) {
            alert('画像のキャプチャに失敗しました');
            return null;
        }

        this.overlayCanvas = this.generateOverlayImage();
        console.log('Image captured');

        return {
            original: this.capturedCanvas,
            overlay: this.overlayCanvas
        };
    }

    /**
     * Generate overlay image with grid and metadata
     */
    generateOverlayImage() {
        const canvas = document.createElement('canvas');
        canvas.width = this.capturedCanvas.width;
        canvas.height = this.capturedCanvas.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.capturedCanvas, 0, 0);
        this.drawGridOnCanvas(ctx, canvas.width, canvas.height);
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
        ctx.moveTo(w / 3, 0);
        ctx.lineTo(w / 3, h);
        ctx.moveTo((w * 2) / 3, 0);
        ctx.lineTo((w * 2) / 3, h);
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
        const fontSize = Math.max(16, w / 60);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, h - 100, w, 100);

        ctx.fillStyle = 'white';
        ctx.fillText(`足配置: ${this.checklist.foot_in_frame ? 'OK' : 'NG'}`, 20, h - 70);
        ctx.fillText(`踵接地: ${this.checklist.heel_on_ground ? 'OK' : 'NG'}`, 20, h - 45);
        ctx.fillText(`足平坦: ${this.checklist.foot_flat ? 'OK' : 'NG'}`, 20, h - 20);
        ctx.fillText(`距離: ${this.checklist.distance_confirmed || 'N/A'}`, w / 2, h - 45);
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
