/**
 * export.js - Data Export
 * Handles CSV, JSON, and image export
 */

class ExportManager {
    constructor() {
        this.currentData = null;
    }

    /**
     * Set current measurement data
     */
    setData(data) {
        this.currentData = data;
    }

    /**
     * Export as CSV
     */
    exportCSV(data = this.currentData) {
        if (!data) {
            alert('エクスポートするデータがありません');
            return;
        }

        // CSV header
        const headers = [
            'session_id',
            'subject_id',
            'operator_id',
            'side',
            'posture',
            'distance_m',
            'measurement_type',
            'foot_in_frame',
            'heel_on_ground',
            'foot_flat',
            'distance_confirmed',
            'pitch_deg',
            'roll_deg',
            'is_level',
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
            'timestamp',
            'device_info'
        ];

        // CSV row
        const row = [
            data.session_id,
            data.subject_id,
            data.operator_id || '',
            data.side,
            data.posture,
            data.distance_m,
            data.measurement_type,
            data.checklist.foot_in_frame,
            data.checklist.heel_on_ground,
            data.checklist.foot_flat,
            data.checklist.distance_confirmed || '',
            data.device_orientation?.pitch_deg || '',
            data.device_orientation?.roll_deg || '',
            data.device_orientation?.is_level || '',
            data.points[0]?.label || '',
            data.points[0]?.x || '',
            data.points[0]?.y || '',
            data.points[1]?.label || '',
            data.points[1]?.x || '',
            data.points[1]?.y || '',
            data.points[2]?.label || '',
            data.points[2]?.x || '',
            data.points[2]?.y || '',
            data.angle_value,
            data.timestamp,
            data.device_info
        ];

        // Create CSV content
        const csvContent = [
            headers.join(','),
            row.map(value => `"${value}"`).join(',')
        ].join('\n');

        // Download
        const filename = `${data.subject_id}_${data.side}_${this.formatTimestampForFilename(data.timestamp)}.csv`;
        this.downloadFile(csvContent, filename, 'text/csv');
    }

    /**
     * Export as JSON
     */
    exportJSON(data = this.currentData) {
        if (!data) {
            alert('エクスポートするデータがありません');
            return;
        }

        const jsonContent = JSON.stringify(data, null, 2);
        const filename = `${data.subject_id}_${data.side}_${this.formatTimestampForFilename(data.timestamp)}.json`;
        this.downloadFile(jsonContent, filename, 'application/json');
    }

    /**
     * Export images
     */
    exportImages(originalCanvas, overlayCanvas, data = this.currentData) {
        if (!originalCanvas || !overlayCanvas || !data) {
            alert('エクスポートする画像がありません');
            return;
        }

        const baseFilename = `${data.subject_id}_${data.side}_${this.formatTimestampForFilename(data.timestamp)}`;

        // Export original image
        originalCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseFilename}_raw.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');

        // Export overlay image (with delay to avoid browser blocking)
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
        const blob = new Blob([content], { type: mimeType });
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
}

// Global instance
const exportManager = new ExportManager();
