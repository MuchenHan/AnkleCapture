/**
 * ui.js - UI Utilities
 * Toast notifications, screen transitions, haptic wrappers
 */
class UIManager {
    constructor() {
        this.toastContainer = null;
        this.init();
    }

    init() {
        // Create toast container
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    /**
     * Show toast notification (replaces alert() for non-critical messages)
     * @param {string} message
     * @param {'success'|'error'|'info'} type
     * @param {number} duration - ms
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = { success: '✓', error: '✕', info: 'ℹ' };
        toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span class="toast-message">${message}</span>`;

        this.toastContainer.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('toast-show'));

        setTimeout(() => {
            toast.classList.remove('toast-show');
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Haptic feedback wrapper (delegates to NativeBridge)
     */
    async haptic(type = 'light') {
        if (window.NativeBridge) {
            await NativeBridge.haptic(type);
        }
    }
}

const ui = new UIManager();
