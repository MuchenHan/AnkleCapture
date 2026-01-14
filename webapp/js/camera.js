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

        // First try rear camera, then fallback to any camera
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        try {
            console.log('Requesting camera access...');
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera stream obtained:', this.stream);

            this.video.srcObject = this.stream;

            // Ensure video plays
            this.video.setAttribute('playsinline', 'true');
            this.video.setAttribute('muted', 'true');
            this.video.setAttribute('autoplay', 'true');

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video metadata timeout'));
                }, 10000);

                this.video.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    console.log('Video metadata loaded, dimensions:', this.video.videoWidth, 'x', this.video.videoHeight);
                    this.video.play()
                        .then(() => {
                            console.log('Video playing');
                            resolve();
                        })
                        .catch(err => {
                            console.error('Video play error:', err);
                            resolve(); // Still resolve, autoplay might work
                        });
                };

                this.video.onerror = (err) => {
                    clearTimeout(timeout);
                    reject(err);
                };
            });

            this.isInitialized = true;
            console.log('Camera initialized successfully');
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
            } else if (error.name === 'OverconstrainedError') {
                // Try again with simpler constraints
                console.log('Retrying with simpler constraints...');
                try {
                    this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    this.video.srcObject = this.stream;
                    await this.video.play();
                    this.isInitialized = true;
                    return true;
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                    message = 'カメラの初期化に失敗しました。';
                }
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
