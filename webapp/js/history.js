/**
 * history.js - History Management
 * Browse, filter, delete, and re-export past measurement sessions
 */

class HistoryManager {
    constructor() {
        this.sessions = [];
        this.filteredSessions = [];
        this.selectedIds = new Set();
        this.currentFilter = { side: 'all', dateRange: 'all', query: '' };
        // Track blob URLs for cleanup
        this._blobUrls = [];
    }

    /**
     * Load all sessions from IndexedDB, sorted by timestamp desc
     */
    async loadSessions() {
        try {
            const all = await storage.getAllMeasurements();
            this.sessions = all.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            this.applyFilters();
        } catch (err) {
            console.error('Failed to load sessions:', err);
            this.sessions = [];
            this.filteredSessions = [];
            this.renderList([]);
        }
    }

    /**
     * Create a safe object URL from a Blob and track it for cleanup
     */
    blobToImageUrl(blob) {
        if (!blob || !(blob instanceof Blob)) return null;
        const url = URL.createObjectURL(blob);
        this._blobUrls.push(url);
        return url;
    }

    /**
     * Revoke all tracked blob URLs
     */
    cleanup() {
        this._blobUrls.forEach(url => URL.revokeObjectURL(url));
        this._blobUrls = [];
    }

    /**
     * Format date for Japanese display
     */
    formatDate(timestamp) {
        const d = new Date(timestamp);
        return d.toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    /**
     * Calculate mean angle from measurements array
     */
    calcMeanAngle(measurements) {
        if (!measurements || measurements.length === 0) return '--';
        const angles = measurements.map(m => m.angle_value).filter(v => typeof v === 'number');
        if (angles.length === 0) return '--';
        return (angles.reduce((a, b) => a + b, 0) / angles.length).toFixed(1);
    }

    /**
     * Render the session list
     */
    renderList(sessions) {
        // Cleanup previous blob URLs
        this.cleanup();

        const listEl = document.getElementById('history-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        if (sessions.length === 0) {
            listEl.innerHTML = `
                <div class="history-empty">
                    <div class="history-empty-icon">📋</div>
                    <div class="history-empty-text">測定履歴がありません</div>
                    <div class="history-empty-sub">測定を完了するとここに表示されます</div>
                </div>
            `;
            this.updateBatchBar();
            this.updateStats(0);
            return;
        }

        this.updateStats(sessions.length);

        sessions.forEach(session => {
            const card = document.createElement('div');
            card.className = 'session-card' + (this.selectedIds.has(session.session_id) ? ' selected' : '');
            card.dataset.sessionId = session.session_id;

            const measurements = session.measurements || [];
            const meanAngle = this.calcMeanAngle(measurements);
            const sideClass = session.side === 'L' ? 'side-l' : 'side-r';
            const sideLabel = session.side === 'L' ? 'L' : 'R';

            // Thumbnail: use first measurement's thumbnail_image or overlay_image
            let thumbHtml;
            const thumbBlob = measurements[0]?.thumbnail_image || measurements[0]?.overlay_image;
            if (thumbBlob && thumbBlob instanceof Blob) {
                const url = this.blobToImageUrl(thumbBlob);
                thumbHtml = `<img class="session-card-thumb" src="${url}" alt="thumbnail" loading="lazy">`;
            } else {
                thumbHtml = `<div class="session-card-thumb no-image">📷</div>`;
            }

            card.innerHTML = `
                <div class="session-card-main">
                    ${thumbHtml}
                    <div class="session-card-info">
                        <div class="session-card-top">
                            <span class="session-card-subject">${this.escapeHtml(session.subject_id)}</span>
                            <span class="side-badge ${sideClass}">${sideLabel}</span>
                        </div>
                        <div class="session-card-date">${this.formatDate(session.timestamp)}</div>
                        <div class="session-card-meta">
                            <span>${measurements.length}回測定</span>
                            <span>平均 ${meanAngle}°</span>
                        </div>
                        <div class="session-card-expand-hint">
                            <span class="expand-indicator">▸</span> 詳細
                        </div>
                    </div>
                    <div class="session-card-actions">
                        <input type="checkbox" class="session-card-checkbox"
                            ${this.selectedIds.has(session.session_id) ? 'checked' : ''}
                            title="選択">
                    </div>
                </div>
                <div class="session-card-detail" id="detail-${session.session_id}"></div>
            `;

            // Click card to expand detail
            card.querySelector('.session-card-main').addEventListener('click', (e) => {
                // Don't expand if clicking checkbox
                if (e.target.classList.contains('session-card-checkbox')) return;
                this.viewDetail(session.session_id);
            });

            // Checkbox for selection
            card.querySelector('.session-card-checkbox').addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSelect(session.session_id);
            });

            listEl.appendChild(card);
        });

        this.updateBatchBar();
    }

    /**
     * Update stats display
     */
    updateStats(count) {
        const el = document.getElementById('history-stats-count');
        if (el) el.textContent = `${count}件`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    /**
     * Escape value for CSV: double internal quotes, prefix formula-triggering chars
     */
    escapeCsvValue(value) {
        let str = String(value);
        str = str.replace(/"/g, '""');
        if (/^[=+\-@\t\r]/.test(str)) {
            str = "'" + str;
        }
        return `"${str}"`;
    }

    // ---- Filters ----

    filterByQuery(query) {
        this.currentFilter.query = (query || '').trim().toLowerCase();
        this.applyFilters();
    }

    filterBySide(side) {
        this.currentFilter.side = side;
        this.applyFilters();
    }

    filterByDateRange(range) {
        this.currentFilter.dateRange = range;
        this.applyFilters();
    }

    applyFilters() {
        let result = [...this.sessions];

        // Query filter: subject_id or operator_id
        if (this.currentFilter.query) {
            const q = this.currentFilter.query;
            result = result.filter(s =>
                (s.subject_id || '').toLowerCase().includes(q) ||
                (s.operator_id || '').toLowerCase().includes(q)
            );
        }

        // Side filter
        if (this.currentFilter.side !== 'all') {
            result = result.filter(s => s.side === this.currentFilter.side);
        }

        // Date range filter
        if (this.currentFilter.dateRange !== 'all') {
            const now = new Date();
            let cutoff;
            switch (this.currentFilter.dateRange) {
                case 'today':
                    cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }
            if (cutoff) {
                result = result.filter(s => new Date(s.timestamp) >= cutoff);
            }
        }

        this.filteredSessions = result;
        this.renderList(result);
    }

    // ---- Selection ----

    toggleSelect(sessionId) {
        if (this.selectedIds.has(sessionId)) {
            this.selectedIds.delete(sessionId);
        } else {
            this.selectedIds.add(sessionId);
        }

        // Update card visual
        const card = document.querySelector(`.session-card[data-session-id="${sessionId}"]`);
        if (card) {
            card.classList.toggle('selected', this.selectedIds.has(sessionId));
            const cb = card.querySelector('.session-card-checkbox');
            if (cb) cb.checked = this.selectedIds.has(sessionId);
        }
        this.updateBatchBar();
    }

    clearSelection() {
        this.selectedIds.clear();
        document.querySelectorAll('.session-card.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.session-card-checkbox').forEach(cb => cb.checked = false);
        this.updateBatchBar();
    }

    updateBatchBar() {
        const bar = document.getElementById('batch-bar');
        if (!bar) return;
        const count = this.selectedIds.size;
        bar.classList.toggle('visible', count > 0);
        const countEl = document.getElementById('batch-count');
        if (countEl) countEl.textContent = `${count}件選択中`;
        // Sync list padding so content isn't hidden behind batch bar
        const listEl = document.getElementById('history-list');
        if (listEl) listEl.classList.toggle('has-batch-bar', count > 0);
    }

    // ---- Actions ----

    /**
     * Expand card to show individual measurements
     */
    viewDetail(sessionId) {
        const detailEl = document.getElementById(`detail-${sessionId}`);
        if (!detailEl) return;

        // Toggle
        const card = document.querySelector(`.session-card[data-session-id="${sessionId}"]`);
        if (detailEl.classList.contains('open')) {
            detailEl.classList.remove('open');
            detailEl.innerHTML = '';
            if (card) card.querySelector('.expand-indicator').textContent = '▸';
            return;
        }

        // Close other open details
        document.querySelectorAll('.session-card-detail.open').forEach(el => {
            el.classList.remove('open');
            el.innerHTML = '';
        });
        document.querySelectorAll('.expand-indicator').forEach(el => el.textContent = '▸');

        const session = this.sessions.find(s => s.session_id === sessionId);
        if (!session) return;

        const measurements = session.measurements || [];

        let tableRows = measurements.map((m, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${m.angle_value}°</td>
                <td>${m.timestamp ? this.formatDate(m.timestamp) : '--'}</td>
            </tr>
        `).join('');

        detailEl.innerHTML = `
            <table class="detail-measurements-table">
                <thead>
                    <tr><th>#</th><th>角度</th><th>時刻</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="detail-actions">
                <button class="btn btn-small btn-primary" data-action="csv">CSV再出力</button>
                <button class="btn btn-small btn-secondary" data-action="json">JSON再出力</button>
                <button class="btn btn-small btn-danger" data-action="delete">削除</button>
            </div>
        `;

        // Bind detail action buttons
        detailEl.querySelector('[data-action="csv"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.reExportCSV(sessionId);
        });
        detailEl.querySelector('[data-action="json"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.reExportJSON(sessionId);
        });
        detailEl.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSession(sessionId);
        });

        detailEl.classList.add('open');
        if (card) card.querySelector('.expand-indicator').textContent = '▾';
    }

    /**
     * Delete a single session
     */
    async deleteSession(sessionId) {
        const session = this.sessions.find(s => s.session_id === sessionId);
        const label = session ? session.subject_id : sessionId;
        if (!confirm(`「${label}」の測定データを削除しますか？この操作は元に戻せません。`)) return;

        try {
            await storage.deleteMeasurement(sessionId);
            this.selectedIds.delete(sessionId);
            await this.loadSessions();
        } catch (err) {
            console.error('Delete failed:', err);
            ui.showToast('削除に失敗しました', 'error');
        }
    }

    /**
     * Batch delete selected sessions
     */
    async deleteSelected() {
        const count = this.selectedIds.size;
        if (count === 0) return;
        if (!confirm(`${count}件の測定データを削除しますか？この操作は元に戻せません。`)) return;

        try {
            const ids = [...this.selectedIds];
            await storage.batchDeleteMeasurements(ids);
            this.selectedIds.clear();
            await this.loadSessions();
        } catch (err) {
            console.error('Batch delete failed:', err);
            ui.showToast('一部の削除に失敗しました', 'error');
            await this.loadSessions();
        }
    }

    /**
     * Re-export CSV from stored session data
     */
    reExportCSV(sessionId) {
        const session = this.sessions.find(s => s.session_id === sessionId);
        if (!session) return;

        // Reuse ExportManager
        exportManager.setData(session, session.measurements || []);
        exportManager.exportCSV();
    }

    /**
     * Re-export JSON from stored session data
     */
    reExportJSON(sessionId) {
        const session = this.sessions.find(s => s.session_id === sessionId);
        if (!session) return;

        exportManager.setData(session, session.measurements || []);
        exportManager.exportJSON();
    }

    // ---- Batch Export ----

    /**
     * Get selected sessions in timestamp order (oldest first)
     */
    getSelectedSessions() {
        return this.sessions
            .filter(s => this.selectedIds.has(s.session_id))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    /**
     * Batch export selected sessions as CSV (same 24-col format as single export).
     * Mixed import/realtime modes → separate CSV files per mode.
     */
    batchExportCSV() {
        const selected = this.getSelectedSessions();
        if (selected.length === 0) return;

        // Group by mode (import vs realtime) for separate fidelity column names
        const groups = {};
        selected.forEach(s => {
            const mode = s.mode || 'realtime';
            if (!groups[mode]) groups[mode] = [];
            groups[mode].push(s);
        });

        const dateStr = this.formatDateShort(new Date().toISOString());
        let fileCount = 0;

        for (const [mode, sessions] of Object.entries(groups)) {
            const isImportMode = mode === 'import';

            // Same 24 headers as ExportManager.exportCSV()
            const headers = [
                'session_id', 'subject_id', 'operator_id', 'side', 'mode',
                'imported_file_name', 'measurement_type', 'measurement_num',
                'point1_label', 'point1_x', 'point1_y',
                'point2_label', 'point2_x', 'point2_y',
                'point3_label', 'point3_x', 'point3_y',
                'angle_value',
                isImportMode ? 'fidelity_side_view' : 'fidelity_foot_in_frame',
                isImportMode ? 'fidelity_whole_foot' : 'fidelity_heel_on_ground',
                isImportMode ? 'fidelity_no_distortion' : 'fidelity_foot_flat',
                'fidelity_distance_ok',
                'timestamp', 'device_info'
            ];

            // Build rows: all sessions' measurements stacked vertically
            const rows = [];
            sessions.forEach(s => {
                const fidelity = exportManager.getNormalizedFidelity(s.checklist);
                (s.measurements || []).forEach((m, index) => {
                    rows.push([
                        s.session_id,
                        s.subject_id,
                        s.operator_id || '',
                        s.side,
                        s.mode || 'realtime',
                        s.imported_file_name || '',
                        s.measurement_type,
                        index + 1,
                        m.points[0]?.label || '', m.points[0]?.x ?? '', m.points[0]?.y ?? '',
                        m.points[1]?.label || '', m.points[1]?.x ?? '', m.points[1]?.y ?? '',
                        m.points[2]?.label || '', m.points[2]?.x ?? '', m.points[2]?.y ?? '',
                        m.angle_value,
                        fidelity.check1, fidelity.check2, fidelity.check3, fidelity.check4,
                        m.timestamp || s.timestamp,
                        s.device_info
                    ]);
                });
            });

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(v => this.escapeCsvValue(v)).join(','))
            ].join('\n');

            // Download with mode suffix when mixed
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
            const modeSuffix = Object.keys(groups).length > 1 ? `_${mode}` : '';
            const filename = `batch_export_${sessions.length}sessions${modeSuffix}_${dateStr}.csv`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            // Delay multiple downloads so browser doesn't block them
            setTimeout(() => { a.click(); URL.revokeObjectURL(url); }, fileCount * 300);
            fileCount++;
        }

        ui.showToast(`${selected.length}件のCSVを出力しました`, 'success');
    }

    /**
     * Batch export selected sessions as JSON (same paper-standard format as single export).
     */
    batchExportJSON() {
        const selected = this.getSelectedSessions();
        if (selected.length === 0) return;

        const output = {
            export_date: new Date().toISOString(),
            session_count: selected.length,
            sessions: selected.map(s => {
                const angles = (s.measurements || []).map(m => m.angle_value).filter(v => typeof v === 'number');
                const mean = angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : null;
                const variance = angles.length ? angles.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / angles.length : null;
                return {
                    session_id: s.session_id,
                    subject_id: s.subject_id,
                    operator_id: s.operator_id,
                    side: s.side,
                    mode: s.mode,
                    imported_file_name: s.imported_file_name || null,
                    measurement_type: s.measurement_type,
                    checklist: s.checklist,
                    device_orientation: s.device_orientation,
                    timestamp: s.timestamp,
                    device_info: s.device_info,
                    statistics: {
                        count: angles.length,
                        mean: mean !== null ? Math.round(mean * 1000) / 1000 : null,
                        sd: variance !== null ? Math.round(Math.sqrt(variance) * 1000) / 1000 : null,
                        min: angles.length ? Math.min(...angles) : null,
                        max: angles.length ? Math.max(...angles) : null
                    },
                    measurements: (s.measurements || []).map((m, i) => ({
                        measurement_num: i + 1,
                        points: m.points,
                        angle_value: m.angle_value,
                        timestamp: m.timestamp
                    }))
                };
            })
        };

        const jsonContent = JSON.stringify(output, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const filename = `batch_export_${selected.length}sessions_${this.formatDateShort(new Date().toISOString())}.json`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);

        ui.showToast(`${selected.length}件のJSONを出力しました`, 'success');
    }

    /**
     * Short date format for filenames: YYYYMMDD_HHmmss
     */
    formatDateShort(timestamp) {
        const d = new Date(timestamp);
        return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
    }

    /**
     * Initialize event listeners for history screen UI
     */
    initUI() {
        // Search input
        const searchInput = document.getElementById('history-search-input');
        const searchClear = document.getElementById('history-search-clear');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterByQuery(searchInput.value);
                if (searchClear) {
                    searchClear.classList.toggle('visible', searchInput.value.length > 0);
                }
            });
        }
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                searchClear.classList.remove('visible');
                this.filterByQuery('');
            });
        }

        // Side filter chips
        document.querySelectorAll('.filter-chip[data-side]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chip[data-side]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.filterBySide(chip.dataset.side);
            });
        });

        // Date range select
        const dateSelect = document.getElementById('history-date-filter');
        if (dateSelect) {
            dateSelect.addEventListener('change', () => {
                this.filterByDateRange(dateSelect.value);
            });
        }

        // Batch export buttons
        const batchCsvBtn = document.getElementById('btn-batch-csv');
        if (batchCsvBtn) {
            batchCsvBtn.addEventListener('click', () => this.batchExportCSV());
        }
        const batchJsonBtn = document.getElementById('btn-batch-json');
        if (batchJsonBtn) {
            batchJsonBtn.addEventListener('click', () => this.batchExportJSON());
        }

        // Batch delete button
        const batchDeleteBtn = document.getElementById('btn-batch-delete');
        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', () => this.deleteSelected());
        }

        // Batch clear selection
        const batchClearBtn = document.getElementById('btn-batch-clear');
        if (batchClearBtn) {
            batchClearBtn.addEventListener('click', () => this.clearSelection());
        }
    }
}

// Global instance
const historyManager = new HistoryManager();
