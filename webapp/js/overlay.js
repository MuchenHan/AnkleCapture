/**
 * overlay.js - Canvas Overlay Rendering
 * Handles grid, reference lines, and crosshair
 */

class OverlayManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Initialize overlay canvas
     */
    init(canvasElement, videoElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.video = videoElement;

        // Set canvas size to match video
        this.resize();

        // Resize on window resize
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Resize canvas to match container
     */
    resize() {
        if (!this.canvas || !this.video) return;

        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;

        // Redraw after resize
        this.draw();
    }

    /**
     * Draw all overlays
     */
    draw() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw components
        this.drawGrid();
        this.drawHorizontalReference();
        this.drawCrosshair();
    }

    /**
     * Draw 9-grid (九宮格)
     */
    drawGrid() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        // Vertical lines (2)
        this.ctx.moveTo(w / 3, 0);
        this.ctx.lineTo(w / 3, h);
        this.ctx.moveTo((w * 2) / 3, 0);
        this.ctx.lineTo((w * 2) / 3, h);

        // Horizontal lines (2)
        this.ctx.moveTo(0, h / 3);
        this.ctx.lineTo(w, h / 3);
        this.ctx.moveTo(0, (h * 2) / 3);
        this.ctx.lineTo(w, (h * 2) / 3);

        this.ctx.stroke();
    }

    /**
     * Draw horizontal reference line
     */
    drawHorizontalReference() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerY = h / 2;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 5]);

        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(w, centerY);
        this.ctx.stroke();

        this.ctx.setLineDash([]); // Reset dash
    }

    /**
     * Draw center crosshair
     */
    drawCrosshair() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const centerX = w / 2;
        const centerY = h / 2;
        const lineLength = Math.min(w, h) * 0.1; // 10% of smaller dimension

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();

        // Vertical line
        this.ctx.moveTo(centerX, centerY - lineLength / 2);
        this.ctx.lineTo(centerX, centerY + lineLength / 2);

        // Horizontal line
        this.ctx.moveTo(centerX - lineLength / 2, centerY);
        this.ctx.lineTo(centerX + lineLength / 2, centerY);

        this.ctx.stroke();
    }

    /**
     * Update overlay (call when video dimensions change)
     */
    update() {
        this.draw();
    }
}

// Global instance
const overlay = new OverlayManager();
