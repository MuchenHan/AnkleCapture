/**
 * camera.js - Camera Management
 * Handles video stream initialization and management
 */

class CameraManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.isInitialized = false;
    }

    /**
     * Initialize camera with getUserMedia
     */
    async init(videoElement) {
        this.video = videoElement;

        const constraints = {
            video: {
                facingMode: { ideal: 'environment' }, // Rear camera
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        try {
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            this.isInitialized = true;
            console.log('Camera initialized');
            return true;

        } catch (error) {
            console.error('Camera access error:', error);

            // User-friendly error messages
            let message = 'カメラにアクセスできませんでした。';

            if (error.name === 'NotAllowedError') {
                message = 'カメラの使用が許可されていません。ブラウザの設定を確認してください。';
            } else if (error.name === 'NotFoundError') {
                message = 'カメラが見つかりませんでした。';
            } else if (error.name === 'NotReadableError') {
                message = 'カメラは他のアプリケーションで使用中です。';
            }

            alert(message);
            return false;
        }
    }

    /**
     * Get video dimensions
     */
    getVideoDimensions() {
        if (!this.video) return { width: 0, height: 0 };

        return {
            width: this.video.videoWidth,
            height: this.video.videoHeight
        };
    }

    /**
     * Capture still image from video stream
     */
    captureImage() {
        if (!this.isInitialized || !this.video) {
            console.error('Camera not initialized');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);

        return canvas;
    }

    /**
     * Stop camera stream
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.isInitialized = false;
            console.log('Camera stopped');
        }
    }

    /**
     * Check if camera is supported
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
}

// Global instance
const camera = new CameraManager();
