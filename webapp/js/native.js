/**
 * native.js - Capacitor Native Bridge
 * Provides native functionality with web fallbacks.
 * No import/export - loaded via script tag, plugins via Capacitor.Plugins.
 */
class NativeBridge {
    /**
     * Check if running in Capacitor native shell
     */
    static get isNative() {
        return window.Capacitor?.isNativePlatform?.() ?? false;
    }

    /**
     * Initialize native features (call from app.js init)
     */
    static async init() {
        if (!this.isNative) return;

        // Hide splash screen after app is ready
        try {
            const { SplashScreen } = Capacitor.Plugins;
            await SplashScreen.hide();
        } catch (e) {
            console.warn('SplashScreen hide failed:', e);
        }

        // Configure status bar (dark content on light bg)
        try {
            const { StatusBar } = Capacitor.Plugins;
            await StatusBar.setStyle({ style: 'DARK' });
        } catch (e) {
            console.warn('StatusBar setup failed:', e);
        }

        // Setup keyboard behavior
        try {
            const { Keyboard } = Capacitor.Plugins;
            // Keyboard events for scroll-into-view
        } catch (e) {
            console.warn('Keyboard setup failed:', e);
        }

        // Setup app lifecycle
        try {
            const { App } = Capacitor.Plugins;
            App.addListener('appStateChange', (state) => {
                if (!state.isActive && window.camera?.isInitialized) {
                    // Pause camera when app goes to background
                    console.log('App went to background, camera stream preserved');
                }
            });
        } catch (e) {
            console.warn('App lifecycle setup failed:', e);
        }
    }

    /**
     * Set status bar style for camera screen (light content on dark bg)
     */
    static async setStatusBarForCamera() {
        if (!this.isNative) return;
        try {
            const { StatusBar } = Capacitor.Plugins;
            await StatusBar.setStyle({ style: 'LIGHT' });
        } catch (e) {}
    }

    /**
     * Set status bar style for normal screens (dark content on light bg)
     */
    static async setStatusBarForContent() {
        if (!this.isNative) return;
        try {
            const { StatusBar } = Capacitor.Plugins;
            await StatusBar.setStyle({ style: 'DARK' });
        } catch (e) {}
    }

    /**
     * Haptic feedback
     * @param {'light'|'medium'|'heavy'|'success'|'warning'|'error'} type
     */
    static async haptic(type = 'light') {
        if (!this.isNative) return;
        try {
            const { Haptics } = Capacitor.Plugins;
            switch (type) {
                case 'light':
                    await Haptics.impact({ style: 'LIGHT' });
                    break;
                case 'medium':
                    await Haptics.impact({ style: 'MEDIUM' });
                    break;
                case 'heavy':
                    await Haptics.impact({ style: 'HEAVY' });
                    break;
                case 'success':
                    await Haptics.notification({ type: 'SUCCESS' });
                    break;
                case 'warning':
                    await Haptics.notification({ type: 'WARNING' });
                    break;
                case 'error':
                    await Haptics.notification({ type: 'ERROR' });
                    break;
            }
        } catch (e) {
            console.warn('Haptic feedback failed:', e);
        }
    }

    /**
     * Convert ArrayBuffer to base64 string in chunks to avoid stack overflow.
     * @param {ArrayBuffer} buffer
     * @returns {string}
     */
    static _arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        return btoa(binary);
    }

    /**
     * Share files using native share sheet.
     * Falls back to Web Share API.
     * @param {Object} options - { files: File[], title: string, text: string }
     */
    static async share(options) {
        if (this.isNative) {
            try {
                const { Share, Filesystem } = Capacitor.Plugins;

                // Write files to cache dir, then share URIs
                const urls = [];
                for (const file of (options.files || [])) {
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = NativeBridge._arrayBufferToBase64(arrayBuffer);
                    const result = await Filesystem.writeFile({
                        path: file.name,
                        data: base64,
                        directory: 'CACHE'
                    });
                    urls.push(result.uri);
                }

                await Share.share({
                    title: options.title || '',
                    text: options.text || '',
                    url: urls.length === 1 ? urls[0] : undefined,
                    files: urls.length > 0 ? urls : undefined
                });
                return true;
            } catch (e) {
                if (e.message?.includes('canceled') || e.message?.includes('cancelled')) {
                    return false; // User cancelled
                }
                console.error('Native share failed:', e);
                // Fall through to web share
            }
        }

        // Web fallback
        if (navigator.share && navigator.canShare) {
            try {
                if (navigator.canShare(options)) {
                    await navigator.share(options);
                    return true;
                }
            } catch (e) {
                if (e.name === 'AbortError') return false;
                console.error('Web share failed:', e);
            }
        }

        return false; // Share not available
    }

    /**
     * Download/save a file.
     * On native: write to Documents.
     * On web: trigger download via blob URL.
     */
    static async saveFile(blob, filename, mimeType) {
        if (this.isNative) {
            try {
                const { Filesystem } = Capacitor.Plugins;
                const arrayBuffer = await blob.arrayBuffer();
                const base64 = NativeBridge._arrayBufferToBase64(arrayBuffer);
                await Filesystem.writeFile({
                    path: filename,
                    data: base64,
                    directory: 'DOCUMENTS'
                });
                return true;
            } catch (e) {
                console.error('Native file save failed:', e);
            }
        }

        // Web fallback: download via link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }
}
