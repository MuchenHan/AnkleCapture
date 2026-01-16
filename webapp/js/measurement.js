/**
 * measurement.js - Angle Measurement (Improved Version)
 * Handles 3-point marking, angle calculation, and overlay image generation
 */

class MeasurementManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.points = [];
        this.maxPoints = 3;
        this.angleValue = null;
        this.isDragging = false;
        this.dragPointIndex = -1;
        this.pointRadius = 15;
    }

    /**
     * Initialize measurement canvas
     */
    init(canvasElement, imageCanvas) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.image = imageCanvas;

        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;

        this.draw();
        this.addEventListeners();

        this.points = [];
        this.angleValue = null;
    }

    /**
     * Add event listeners for point marking
     */
    addEventListeners() {
        // Remove existing listeners first
        this.canvas.removeEventListener('touchstart', this.boundTouchStart);
        this.canvas.removeEventListener('touchmove', this.boundTouchMove);
        this.canvas.removeEventListener('touchend', this.boundTouchEnd);
        this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        this.canvas.removeEventListener('mouseup', this.boundMouseUp);

        // Create bound handlers
        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);

        // Touch events (mobile)
        this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false });

        // Mouse events (desktop)
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('mouseup', this.boundMouseUp);
    }

    /**
     * Get coordinates from event
     */
    getEventCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        let clientX, clientY;

        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleTouchStart(event) {
        event.preventDefault();
        const coords = this.getEventCoordinates(event);
        this.handlePointerDown(coords.x, coords.y);
    }

    handleTouchMove(event) {
        event.preventDefault();
        const coords = this.getEventCoordinates(event);
        this.handlePointerMove(coords.x, coords.y);
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.handlePointerUp();
    }

    handleMouseDown(event) {
        const coords = this.getEventCoordinates(event);
        this.handlePointerDown(coords.x, coords.y);
    }

    handleMouseMove(event) {
        const coords = this.getEventCoordinates(event);
        this.handlePointerMove(coords.x, coords.y);
    }

    handleMouseUp(event) {
        this.handlePointerUp();
    }

    /**
     * Handle pointer down (unified for touch and mouse)
     */
    handlePointerDown(x, y) {
        // Check if clicking on existing point for dragging
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
            if (distance < this.pointRadius * 2) {
                this.isDragging = true;
                this.dragPointIndex = i;
                return;
            }
        }

        // Add new point if not at max
        if (this.points.length < this.maxPoints) {
            this.points.push({ x, y });
            this.updatePointLabels();
            this.draw();

            if (this.points.length === this.maxPoints) {
                this.calculateAngle();
            }
        }
    }

    handlePointerMove(x, y) {
        if (this.isDragging && this.dragPointIndex >= 0) {
            this.points[this.dragPointIndex] = { x, y };
            this.draw();

            if (this.points.length === this.maxPoints) {
                this.calculateAngle();
            }
        }
    }

    handlePointerUp() {
        this.isDragging = false;
        this.dragPointIndex = -1;
    }

    /**
     * Calculate angle from 3 points
     */
    calculateAngle() {
        if (this.points.length !== 3) {
            return null;
        }

        const [p1, p2, p3] = this.points;

        // Vectors from p2 (vertex) to p1 and p3
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        // Dot product
        const dot = v1.x * v2.x + v1.y * v2.y;

        // Magnitudes
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        // Angle in radians
        const cosAngle = dot / (mag1 * mag2);
        const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

        // Convert to degrees (3 decimal places for precision)
        this.angleValue = Math.round(angleRad * (180 / Math.PI) * 1000) / 1000;

        this.updateAngleDisplay();
        return this.angleValue;
    }

    /**
     * Update angle display in UI
     */
    updateAngleDisplay() {
        const resultEl = document.getElementById('angle-result');
        const valueEl = document.getElementById('angle-value');
        const btnAdd = document.getElementById('btn-add-measurement');

        if (this.angleValue !== null) {
            if (valueEl) valueEl.textContent = this.angleValue.toFixed(3);
            if (resultEl) resultEl.classList.remove('hidden');
            if (btnAdd) btnAdd.disabled = false;
            
            // Notify app that measurement is complete
            if (window.app) {
                window.app.enableAddMeasurementButton(true);
            }
        } else {
            if (resultEl) resultEl.classList.add('hidden');
            if (btnAdd) btnAdd.disabled = true;

            if (window.app) {
                window.app.enableAddMeasurementButton(false);
            }
        }
    }

    /**
     * Update point labels in instruction list
     */
    updatePointLabels() {
        const listItems = document.querySelectorAll('#point-labels li');
        listItems.forEach((item, index) => {
            if (index < this.points.length) {
                item.classList.add('completed');
            } else {
                item.classList.remove('completed');
            }
        });
    }

    /**
     * Draw canvas (image + points + lines)
     */
    draw() {
        if (!this.ctx || !this.image) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0);

        // Draw lines between points
        if (this.points.length >= 2) {
            this.ctx.strokeStyle = '#2563EB';
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                this.ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            this.ctx.stroke();
        }

        // Draw points
        this.points.forEach((point, index) => {
            this.ctx.fillStyle = '#EF4444';
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;

            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, this.pointRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Label
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText((index + 1).toString(), point.x, point.y);
        });

        // Draw angle arc if all points exist
        if (this.points.length === 3 && this.angleValue !== null) {
            this.drawAngleArc();
        }
    }

    /**
     * Draw angle arc
     */
    drawAngleArc() {
        const [p1, p2, p3] = this.points;

        const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

        const arcRadius = 50;

        this.ctx.strokeStyle = '#10B981';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(p2.x, p2.y, arcRadius, angle1, angle2, false);
        this.ctx.stroke();

        // Draw angle text
        const midAngle = (angle1 + angle2) / 2;
        const textX = p2.x + Math.cos(midAngle) * (arcRadius + 25);
        const textY = p2.y + Math.sin(midAngle) * (arcRadius + 25);

        this.ctx.fillStyle = '#10B981';
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.angleValue.toFixed(3)}°`, textX, textY);
    }

    /**
     * Generate overlay image with points and angle
     * Returns a new canvas with the annotated image
     */
    generateOverlayImage() {
        if (!this.image || this.points.length !== 3 || !this.angleValue) {
            return null;
        }

        // Create a new canvas for the overlay
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = this.image.width;
        overlayCanvas.height = this.image.height;
        const ctx = overlayCanvas.getContext('2d');

        // Draw original image
        ctx.drawImage(this.image, 0, 0);

        // Draw lines between points
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        ctx.lineTo(this.points[1].x, this.points[1].y);
        ctx.lineTo(this.points[2].x, this.points[2].y);
        ctx.stroke();

        // Draw points with labels
        const labels = ['P1', 'P2', 'P3'];
        const labelNames = ['腓骨頭', '外果', '第5中足骨頭'];

        this.points.forEach((point, index) => {
            // Outer circle
            ctx.fillStyle = '#EF4444';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Point number
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[index], point.x, point.y);

            // Label name (offset from point)
            ctx.fillStyle = '#1F2937';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.font = 'bold 14px sans-serif';
            
            const offsetY = index === 1 ? 35 : -35; // P2 below, others above
            ctx.strokeText(labelNames[index], point.x, point.y + offsetY);
            ctx.fillText(labelNames[index], point.x, point.y + offsetY);
        });

        // Draw angle arc
        const [p1, p2, p3] = this.points;
        const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        const arcRadius = 60;

        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, arcRadius, angle1, angle2, false);
        ctx.stroke();

        // Draw angle value with background
        const midAngle = (angle1 + angle2) / 2;
        const textX = p2.x + Math.cos(midAngle) * (arcRadius + 40);
        const textY = p2.y + Math.sin(midAngle) * (arcRadius + 40);

        const angleText = `${this.angleValue.toFixed(3)}°`;
        ctx.font = 'bold 24px sans-serif';
        const textMetrics = ctx.measureText(angleText);
        const padding = 8;

        // Background rectangle
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.beginPath();
        ctx.roundRect(
            textX - textMetrics.width / 2 - padding,
            textY - 14 - padding,
            textMetrics.width + padding * 2,
            28 + padding * 2,
            5
        );
        ctx.fill();

        // Angle text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(angleText, textX, textY);

        // Add timestamp watermark
        const timestamp = new Date().toLocaleString('ja-JP');
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.strokeText(timestamp, this.image.width - 10, this.image.height - 10);
        ctx.fillText(timestamp, this.image.width - 10, this.image.height - 10);

        return overlayCanvas;
    }

    /**
     * Reset points
     */
    reset() {
        this.points = [];
        this.angleValue = null;
        this.updateAngleDisplay();
        this.updatePointLabels();
        this.draw();
    }

    /**
     * Get measurement data
     */
    getMeasurementData() {
        const labels = ['fibular_head', 'lateral_malleolus', '5th_metatarsal'];

        return {
            points: this.points.map((point, index) => ({
                label: labels[index] || `point_${index + 1}`,
                x: Math.round(point.x),
                y: Math.round(point.y)
            })),
            angle_value: this.angleValue
        };
    }
}

// Global instance
const measurement = new MeasurementManager();
