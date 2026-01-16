/**
 * import.js - Photo Import Management (Improved Version)
 * Handles file loading, EXIF orientation correction, and downsampling
 * Fixed: Uses correct file input ID 'file-input'
 */

const MAX_IMAGE_DIMENSION = 2048;

class ImportManager {
    constructor() {
        this.fileInput = null; // Will be set in init()
        this.previewCanvas = null;
        this.checklist = {
            side_view: false,
            whole_foot: false,
            no_distortion: false
        };
        this.importedImage = null;
    }

    /**
     * Initialize import manager
     */
    init() {
        // Fixed: Use correct ID 'file-input' (matches HTML)
        this.fileInput = document.getElementById('file-input');
        this.previewCanvas = document.getElementById('modal-preview-canvas');

        if (!this.fileInput) {
            console.error('File input element not found (id: file-input)');
            return;
        }

        // Add file selection listener
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Setup checklist listeners
        const checks = ['check-side-view', 'check-whole-foot', 'check-no-distortion'];
        checks.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.validateChecklist());
            }
        });

        const btnCancel = document.getElementById('btn-cancel-import');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => this.cancelImport());
        }

        const btnConfirm = document.getElementById('btn-confirm-import');
        if (btnConfirm) {
            btnConfirm.addEventListener('click', () => this.confirmImport());
        }

        console.log('ImportManager initialized');
    }

    /**
     * Trigger file selection
     */
    selectFile() {
        if (this.fileInput) {
            this.fileInput.click();
        } else {
            console.error('File input not initialized');
            alert('ファイル入力が初期化されていません');
        }
    }

    /**
     * Handle file selection result
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return null;

        try {
            // Get EXIF orientation
            const orientation = await this.getExifOrientation(file);
            console.log('Detected orientation:', orientation);

            // Load and process image
            this.importedImage = await this.loadImage(file, orientation);

            // Show preview
            this.showPreview(this.importedImage);

            // Show modal
            this.showModal();

            return true;
        } catch (error) {
            console.error('Import failed:', error);
            alert('画像の読み込みに失敗しました。');
            return false;
        } finally {
            // Reset input so same file can be selected again
            this.fileInput.value = '';
        }
    }

    /**
     * Load image, fix orientation, and downsample
     */
    loadImage(file, orientation) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions (downsampling)
                let width = img.width;
                let height = img.height;

                if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                    const ratio = Math.min(
                        MAX_IMAGE_DIMENSION / width,
                        MAX_IMAGE_DIMENSION / height
                    );
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                // Create canvas for drawing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Handle orientation
                if (4 < orientation && orientation < 9) {
                    canvas.width = height;
                    canvas.height = width;
                } else {
                    canvas.width = width;
                    canvas.height = height;
                }

                // Transform context based on orientation
                switch (orientation) {
                    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
                    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
                    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
                    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
                    case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
                    case 7: ctx.transform(0, -1, -1, 0, height, width); break;
                    case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
                    default: break;
                }

                // Draw image
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas);
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Parse EXIF orientation from file (First 64kb)
     */
    getExifOrientation(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const view = new DataView(e.target.result);

                if (view.getUint16(0, false) != 0xFFD8) {
                    resolve(-1); // Not JPEG
                    return;
                }

                const length = view.byteLength;
                let offset = 2;

                while (offset < length) {
                    const marker = view.getUint16(offset, false);
                    offset += 2;

                    if (marker == 0xFFE1) {
                        if (view.getUint32(offset + 2, false) != 0x45786966) {
                            resolve(-1); // Not Exif
                            return;
                        }

                        const little = view.getUint16(offset + 8, false) == 0x4949;
                        offset += 8;
                        const ifdOffset = view.getUint32(offset + 4, little);
                        const tags = view.getUint16(offset + ifdOffset, little);

                        for (let i = 0; i < tags; i++) {
                            const current = offset + ifdOffset + 2 + (i * 12);
                            if (view.getUint16(current, little) == 0x0112) {
                                resolve(view.getUint16(current + 8, little));
                                return;
                            }
                        }
                    } else if ((marker & 0xFF00) != 0xFF00) {
                        break;
                    } else {
                        offset += view.getUint16(offset, false);
                    }
                }

                resolve(-1);
            };

            // Read first 64KB (usually enough for EXIF)
            reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
        });
    }

    /**
     * Show preview in modal
     */
    showPreview(imgCanvas) {
        if (!this.previewCanvas) {
            this.previewCanvas = document.getElementById('modal-preview-canvas');
        }
        
        if (!this.previewCanvas) return;

        const container = this.previewCanvas.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const ratio = imgCanvas.height / imgCanvas.width;

        this.previewCanvas.width = Math.min(rect.width, 400);
        this.previewCanvas.height = this.previewCanvas.width * ratio;

        const ctx = this.previewCanvas.getContext('2d');
        ctx.drawImage(imgCanvas, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
    }

    /**
     * Show quality checklist modal
     */
    showModal() {
        const modal = document.getElementById('import-quality-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.resetChecklist();
        }
    }

    /**
     * Hide quality checklist modal
     */
    hideModal() {
        const modal = document.getElementById('import-quality-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Reset checklist state
     */
    resetChecklist() {
        this.checklist = {
            side_view: false,
            whole_foot: false,
            no_distortion: false
        };

        ['check-side-view', 'check-whole-foot', 'check-no-distortion'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });

        this.validateChecklist();
    }

    /**
     * Validate checklist to enable confirm button
     */
    validateChecklist() {
        this.checklist = {
            side_view: document.getElementById('check-side-view')?.checked || false,
            whole_foot: document.getElementById('check-whole-foot')?.checked || false,
            no_distortion: document.getElementById('check-no-distortion')?.checked || false
        };

        const allChecked = Object.values(this.checklist).every(v => v);
        const btn = document.getElementById('btn-confirm-import');
        if (btn) {
            btn.disabled = !allChecked;
        }
    }

    /**
     * Confirm import and proceed
     */
    confirmImport() {
        this.hideModal();

        // Notify app to proceed to measurement
        if (window.app) {
            window.app.handleImportComplete(this.importedImage, this.checklist);
        }
    }

    /**
     * Cancel import
     */
    cancelImport() {
        this.hideModal();
        this.importedImage = null;
    }
}

// Global instance
const importManager = new ImportManager();
