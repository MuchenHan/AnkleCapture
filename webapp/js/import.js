/**
 * import.js - Photo Import Manager
 * Handles photo import mode with EXIF orientation correction and smart downsampling
 */

class ImportManager {
    constructor() {
        this.importedCanvas = null;
        this.originalFile = null;
        this.maxDimension = 2048; // Maximum dimension to prevent browser crash
    }

    /**
     * Trigger file input
     */
    triggerFileInput() {
        const fileInput = document.getElementById('photo-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('有効な画像ファイルを選択してください');
            return null;
        }

        this.originalFile = file;

        try {
            // Read and process image
            const canvas = await this.processImage(file);
            this.importedCanvas = canvas;
            return canvas;
        } catch (error) {
            console.error('Image processing failed:', error);
            alert('画像の処理に失敗しました');
            return null;
        }
    }

    /**
     * Process image with EXIF orientation correction and downsampling
     */
    async processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const orientation = this.getExifOrientation(arrayBuffer);

                    // Create image from blob
                    const blob = new Blob([arrayBuffer], { type: file.type });
                    const imageUrl = URL.createObjectURL(blob);
                    const img = new Image();

                    img.onload = () => {
                        URL.revokeObjectURL(imageUrl);

                        // Calculate dimensions with downsampling
                        const { width, height } = this.calculateDimensions(img.width, img.height);

                        // Create canvas and apply EXIF orientation
                        const canvas = this.createOrientedCanvas(img, width, height, orientation);
                        resolve(canvas);
                    };

                    img.onerror = () => {
                        URL.revokeObjectURL(imageUrl);
                        reject(new Error('Failed to load image'));
                    };

                    img.src = imageUrl;
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Get EXIF orientation from image data
     * Returns orientation value 1-8, or 1 if not found
     */
    getExifOrientation(arrayBuffer) {
        const view = new DataView(arrayBuffer);

        // Check for JPEG magic bytes
        if (view.getUint16(0, false) !== 0xFFD8) {
            return 1;
        }

        const length = view.byteLength;
        let offset = 2;

        while (offset < length) {
            if (view.getUint16(offset, false) === 0xFFE1) {
                // Found EXIF marker
                const exifOffset = offset + 4;

                // Check for "Exif" string
                if (view.getUint32(exifOffset, false) !== 0x45786966) {
                    return 1;
                }

                const tiffOffset = exifOffset + 6;
                const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;

                const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian) + tiffOffset;
                const numEntries = view.getUint16(ifdOffset, littleEndian);

                for (let i = 0; i < numEntries; i++) {
                    const entryOffset = ifdOffset + 2 + i * 12;
                    const tag = view.getUint16(entryOffset, littleEndian);

                    if (tag === 0x0112) {
                        // Orientation tag
                        return view.getUint16(entryOffset + 8, littleEndian);
                    }
                }

                return 1;
            }

            offset += 2 + view.getUint16(offset + 2, false);
        }

        return 1;
    }

    /**
     * Calculate dimensions with smart downsampling
     */
    calculateDimensions(originalWidth, originalHeight) {
        const maxDim = this.maxDimension;

        if (originalWidth <= maxDim && originalHeight <= maxDim) {
            return { width: originalWidth, height: originalHeight };
        }

        const ratio = Math.min(maxDim / originalWidth, maxDim / originalHeight);
        return {
            width: Math.round(originalWidth * ratio),
            height: Math.round(originalHeight * ratio)
        };
    }

    /**
     * Create canvas with EXIF orientation correction applied
     */
    createOrientedCanvas(img, width, height, orientation) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Swap dimensions for orientations 5-8
        if (orientation >= 5 && orientation <= 8) {
            canvas.width = height;
            canvas.height = width;
        } else {
            canvas.width = width;
            canvas.height = height;
        }

        // Apply transformation based on orientation
        switch (orientation) {
            case 2: // Horizontal flip
                ctx.scale(-1, 1);
                ctx.translate(-width, 0);
                break;
            case 3: // 180° rotation
                ctx.rotate(Math.PI);
                ctx.translate(-width, -height);
                break;
            case 4: // Vertical flip
                ctx.scale(1, -1);
                ctx.translate(0, -height);
                break;
            case 5: // 90° CW + horizontal flip
                ctx.rotate(0.5 * Math.PI);
                ctx.scale(1, -1);
                break;
            case 6: // 90° CW
                ctx.rotate(0.5 * Math.PI);
                ctx.translate(0, -height);
                break;
            case 7: // 90° CCW + horizontal flip
                ctx.rotate(-0.5 * Math.PI);
                ctx.translate(-width, 0);
                ctx.scale(1, -1);
                break;
            case 8: // 90° CCW
                ctx.rotate(-0.5 * Math.PI);
                ctx.translate(-width, 0);
                break;
            default: // Normal (1)
                break;
        }

        ctx.drawImage(img, 0, 0, width, height);
        return canvas;
    }

    /**
     * Get imported canvas
     */
    getImportedCanvas() {
        return this.importedCanvas;
    }

    /**
     * Create checklist data for import mode
     * All checks are marked as confirmed since user manually verified
     */
    getImportChecklist() {
        return {
            foot_in_frame: true,
            heel_on_ground: true,
            foot_flat: true,
            distance_confirmed: 'import_mode'
        };
    }

    /**
     * Reset import manager
     */
    reset() {
        this.importedCanvas = null;
        this.originalFile = null;
    }
}

// Global instance
const importManager = new ImportManager();
