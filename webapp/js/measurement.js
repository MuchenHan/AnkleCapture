/**
 * measurement.js - Angle Measurement
 * Handles 3-point marking and angle calculation
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

        // Set canvas size to match image
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;

        // Draw initial image
        this.draw();

        // Add event listeners
        this.addEventListeners();

        // Reset points
        this.points = [];
        this.angleValue = null;
    }

    /**
     * Add event listeners for point marking
     */
    addEventListeners() {
        // Touch events (mobile)
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        // Mouse events (desktop)
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
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

    /**
     * Handle touch start
     */
    handleTouchStart(event) {
        event.preventDefault();
        const coords = this.getEventCoordinates(event);
        this.handlePointerDown(coords.x, coords.y);
    }

    /**
     * Handle touch move
     */
    handleTouchMove(event) {
        event.preventDefault();
        const coords = this.getEventCoordinates(event);
        this.handlePointerMove(coords.x, coords.y);
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(event) {
        event.preventDefault();
        this.handlePointerUp();
    }

    /**
     * Handle mouse down
     */
    handleMouseDown(event) {
        const coords = this.getEventCoordinates(event);
        this.handlePointerDown(coords.x, coords.y);
    }

    /**
     * Handle mouse move
     */
    handleMouseMove(event) {
        const coords = this.getEventCoordinates(event);
        this.handlePointerMove(coords.x, coords.y);
    }

    /**
     * Handle mouse up
     */
    handleMouseUp(event) {
        this.handlePointerUp();
    }

    /**
     * Handle pointer down (unified for touch and mouse)
     */
    handlePointerDown(x, y) {
        // Check if clicking on existing point
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

            // Calculate angle if all points are placed
            if (this.points.length === this.maxPoints) {
                this.calculateAngle();
            }
        }
    }

    /**
     * Handle pointer move
     */
    handlePointerMove(x, y) {
        if (this.isDragging && this.dragPointIndex >= 0) {
            this.points[this.dragPointIndex] = { x, y };
            this.draw();

            // Recalculate angle if all points exist
            if (this.points.length === this.maxPoints) {
                this.calculateAngle();
            }
        }
    }

    /**
     * Handle pointer up
     */
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

        // Convert to degrees and round to 1 decimal place
        this.angleValue = Math.round(angleRad * (180 / Math.PI) * 10) / 10;

        // Update UI
        this.updateAngleDisplay();

        return this.angleValue;
    }

    /**
     * Update angle display in UI
     */
    updateAngleDisplay() {
        const resultEl = document.getElementById('angle-result');
        const valueEl = document.getElementById('angle-value');
        const saveBtn = document.getElementById('btn-save-measurement');

        if (this.angleValue !== null) {
            if (valueEl) valueEl.textContent = this.angleValue;
            if (resultEl) resultEl.classList.remove('hidden');
            if (saveBtn) saveBtn.disabled = false;
        } else {
            if (resultEl) resultEl.classList.add('hidden');
            if (saveBtn) saveBtn.disabled = true;
        }
    }

    /**
     * Update point labels in instruction list
     */
    updatePointLabels() {
        const labels = ['腓骨頭', '外果', '第5中足骨頭'];
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

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image
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
            // Outer circle
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

        // Calculate angles
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
        const textX = p2.x + Math.cos(midAngle) * (arcRadius + 20);
        const textY = p2.y + Math.sin(midAngle) * (arcRadius + 20);

        this.ctx.fillStyle = '#10B981';
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.angleValue}°`, textX, textY);
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
