/**
 * export.js - Data Export (Improved Version)
 * Handles CSV, JSON, and image export for multiple measurements
 * Supports AirDrop via Web Share API on iOS
 */

class ExportManager {
    constructor() {
        this.sessionData = null;
        this.measurements = [];
    }

    /**
     * Check if Web Share API is available (for AirDrop on iOS)
     */
    canShare() {
        return navigator.share && navigator.canShare;
    }

    /**
     * Set current measurement data
     */
    setData(sessionData, measurements) {
        this.sessionData = sessionData;
        this.measurements = measurements || [];
    }

    /**
     * Sanitize filename to remove invalid characters
     */
    sanitizeFilename(str) {
        return str.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /**
     * Export all measurements as CSV
     */
    exportCSV() {
        if (!this.sessionData || this.measurements.length === 0) {
            alert('エクスポートするデータがありません');
            return;
        }

        // Get checklist fidelity data
        const checklist = this.sessionData.checklist || {};

        // CSV header (including fidelity checklist)
        const headers = [
            'session_id',
            'subject_id',
            'operator_id',
            'side',
            'mode',
            'measurement_type',
            'measurement_num',
            'point1_label',
            'point1_x',
            'point1_y',
            'point2_label',
            'point2_x',
            'point2_y',
            'point3_label',
            'point3_x',
            'point3_y',
            'angle_value',
            'fidelity_side_view',
            'fidelity_whole_foot',
            'fidelity_no_distortion',
            'fidelity_distance_ok',
            'timestamp',
            'device_info'
        ];

        // CSV rows
        const rows = this.measurements.map((m, index) => {
            return [
                this.sessionData.session_id,
                this.sessionData.subject_id,
                this.sessionData.operator_id || '',
                this.sessionData.side,
                this.sessionData.mode || 'realtime',
                this.sessionData.measurement_type,
                index + 1,
                m.points[0]?.label || '',
                m.points[0]?.x || '',
                m.points[0]?.y || '',
                m.points[1]?.label || '',
                m.points[1]?.x || '',
                m.points[1]?.y || '',
                m.points[2]?.label || '',
                m.points[2]?.x || '',
                m.points[2]?.y || '',
                m.angle_value,
                checklist.side_view ? 'Yes' : 'No',
                checklist.whole_foot ? 'Yes' : 'No',
                checklist.no_distortion ? 'Yes' : 'No',
                checklist.distance_ok ? 'Yes' : 'No',
                m.timestamp || this.sessionData.timestamp,
                this.sessionData.device_info
            ];
        });

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(value => `"${value}"`).join(','))
        ].join('\n');

        // Download
        const filename = `${this.sanitizeFilename(this.sessionData.subject_id)}_${this.sessionData.side}_${this.formatTimestampForFilename(this.sessionData.timestamp)}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8');

        console.log(`CSV exported: ${this.measurements.length} measurements`);
    }

    /**
     * Export as JSON (paper-standard format)
     */
    exportJSON() {
        if (!this.sessionData || this.measurements.length === 0) {
            alert('エクスポートするデータがありません');
            return;
        }

        // Calculate statistics
        const angles = this.measurements.map(m => m.angle_value);
        const mean = angles.reduce((a, b) => a + b, 0) / angles.length;
        const variance = angles.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / angles.length;
        const sd = Math.sqrt(variance);

        // Paper-standard format
        const standardFormat = {
            session_id: this.sessionData.session_id,
            subject_id: this.sessionData.subject_id,
            operator_id: this.sessionData.operator_id,
            side: this.sessionData.side,
            mode: this.sessionData.mode,
            measurement_type: this.sessionData.measurement_type,
            checklist: this.sessionData.checklist,
            device_orientation: this.sessionData.device_orientation,
            timestamp: this.sessionData.timestamp,
            device_info: this.sessionData.device_info,
            statistics: {
                count: this.measurements.length,
                mean: Math.round(mean * 1000) / 1000,
                sd: Math.round(sd * 1000) / 1000,
                min: Math.min(...angles),
                max: Math.max(...angles)
            },
            measurements: this.measurements.map((m, index) => ({
                measurement_num: index + 1,
                points: m.points,
                angle_value: m.angle_value,
                timestamp: m.timestamp
            }))
        };

        const jsonContent = JSON.stringify(standardFormat, null, 2);
        const filename = `${this.sanitizeFilename(this.sessionData.subject_id)}_${this.sessionData.side}_${this.formatTimestampForFilename(this.sessionData.timestamp)}.json`;
        this.downloadFile(jsonContent, filename, 'application/json');

        console.log(`JSON exported: ${this.measurements.length} measurements`);
    }

    /**
     * Export all overlay images
     */
    async exportAllImages() {
        if (!this.sessionData || this.measurements.length === 0) {
            alert('エクスポートする画像がありません');
            return;
        }

        const baseFilename = `${this.sanitizeFilename(this.sessionData.subject_id)}_${this.sessionData.side}_${this.formatTimestampForFilename(this.sessionData.timestamp)}`;

        // Export each measurement's overlay image
        for (let i = 0; i < this.measurements.length; i++) {
            const m = this.measurements[i];
            
            if (m.overlay_image) {
                await this.exportSingleImage(
                    m.overlay_image,
                    `${baseFilename}_measurement${i + 1}_overlay.png`,
                    i * 300 // Delay to prevent browser blocking
                );
            }
        }

        // Also export original image (just the first one if multiple)
        if (this.measurements[0]?.original_image) {
            await this.exportSingleImage(
                this.measurements[0].original_image,
                `${baseFilename}_original.png`,
                this.measurements.length * 300
            );
        }

        console.log(`Images exported: ${this.measurements.length} overlay images + 1 original`);
    }

    /**
     * Export single image with delay
     */
    exportSingleImage(canvas, filename, delay = 0) {
        return new Promise((resolve) => {
            setTimeout(() => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                    resolve();
                }, 'image/png');
            }, delay);
        });
    }

    /**
     * Export images (legacy interface)
     */
    exportImages(originalCanvas, overlayCanvas) {
        if (!originalCanvas || !overlayCanvas || !this.sessionData) {
            alert('エクスポートする画像がありません');
            return;
        }

        const baseFilename = `${this.sanitizeFilename(this.sessionData.subject_id)}_${this.sessionData.side}_${this.formatTimestampForFilename(this.sessionData.timestamp)}`;

        // Export original image
        originalCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseFilename}_raw.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');

        // Export overlay image (with delay)
        setTimeout(() => {
            overlayCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${baseFilename}_overlay.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        }, 500);
    }

    /**
     * Download file helper
     */
    downloadFile(content, filename, mimeType) {
        const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        const blob = new Blob([BOM + content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Format timestamp for filename
     */
    formatTimestampForFilename(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
    }

    /**
     * Format timestamp for display
     */
    formatTimestampForDisplay(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Share files via Web Share API (AirDrop on iOS)
     */
    async shareFiles() {
        if (!this.sessionData || this.measurements.length === 0) {
            alert('共有するデータがありません');
            return;
        }

        if (!this.canShare()) {
            alert('このブラウザは共有機能をサポートしていません。ダウンロードボタンをお使いください。');
            return;
        }

        try {
            const files = [];
            const baseFilename = `${this.sanitizeFilename(this.sessionData.subject_id)}_${this.sessionData.side}_${this.formatTimestampForFilename(this.sessionData.timestamp)}`;

            // Create CSV file
            const checklist = this.sessionData.checklist || {};
            const csvHeaders = [
                'session_id', 'subject_id', 'operator_id', 'side', 'mode', 'measurement_type',
                'measurement_num', 'point1_label', 'point1_x', 'point1_y',
                'point2_label', 'point2_x', 'point2_y', 'point3_label', 'point3_x', 'point3_y',
                'angle_value', 'fidelity_side_view', 'fidelity_whole_foot',
                'fidelity_no_distortion', 'fidelity_distance_ok', 'timestamp', 'device_info'
            ];
            const csvRows = this.measurements.map((m, index) => [
                this.sessionData.session_id, this.sessionData.subject_id,
                this.sessionData.operator_id || '', this.sessionData.side,
                this.sessionData.mode || 'realtime', this.sessionData.measurement_type,
                index + 1, m.points[0]?.label || '', m.points[0]?.x || '', m.points[0]?.y || '',
                m.points[1]?.label || '', m.points[1]?.x || '', m.points[1]?.y || '',
                m.points[2]?.label || '', m.points[2]?.x || '', m.points[2]?.y || '',
                m.angle_value, checklist.side_view ? 'Yes' : 'No',
                checklist.whole_foot ? 'Yes' : 'No', checklist.no_distortion ? 'Yes' : 'No',
                checklist.distance_ok ? 'Yes' : 'No',
                m.timestamp || this.sessionData.timestamp, this.sessionData.device_info
            ]);
            const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows.map(row => row.map(v => `"${v}"`).join(','))].join('\n');
            const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const csvFile = new File([csvBlob], `${baseFilename}.csv`, { type: 'text/csv' });
            files.push(csvFile);

            // Create image files
            for (let i = 0; i < this.measurements.length; i++) {
                const m = this.measurements[i];
                if (m.overlay_image) {
                    const imageBlob = await new Promise(resolve => m.overlay_image.toBlob(resolve, 'image/png'));
                    const imageFile = new File([imageBlob], `${baseFilename}_measurement${i + 1}.png`, { type: 'image/png' });
                    files.push(imageFile);
                }
            }

            // Check if we can share these files
            if (navigator.canShare && navigator.canShare({ files })) {
                await navigator.share({
                    files: files,
                    title: `AnkleCapture - ${this.sessionData.subject_id}`,
                    text: `足関節角度測定データ (${this.measurements.length}回測定)`
                });
                console.log('Files shared successfully via AirDrop/Share');
            } else {
                alert('このファイル形式は共有できません。ダウンロードボタンをお使いください。');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                alert('共有に失敗しました。ダウンロードボタンをお使いください。');
            }
        }
    }
}

// Global instance
const exportManager = new ExportManager();
