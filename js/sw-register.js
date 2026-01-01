/**
 * Service Worker Registration
 * Registers the service worker for offline support
 */

(function() {
    'use strict';

    /**
     * Register service worker
     */
    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                console.log('Service Worker registered successfully:', registration);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('Service Worker update found');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('New Service Worker available. Refresh to update.');
                            
                            // Optionally show a notification to the user
                            if (typeof window.showToast === 'function') {
                                window.showToast('New version available. Please refresh.', 5000);
                            }
                        }
                    });
                });

                // Handle controller change
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('Service Worker controller changed');
                });

                return registration;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                return null;
            }
        } else {
            console.warn('Service Workers are not supported in this browser');
            return null;
        }
    }

    /**
     * Check if app is running in standalone mode (installed as PWA)
     */
    function checkStandaloneMode() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                          || window.navigator.standalone 
                          || document.referrer.includes('android-app://');

        if (isStandalone) {
            console.log('App is running in standalone mode (PWA)');
        } else {
            console.log('App is running in browser mode');
        }

        return isStandalone;
    }

    /**
     * Show install prompt for PWA
     */
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        
        // Save the event so it can be triggered later
        deferredPrompt = e;
        
        console.log('Install prompt available');
        
        // Optionally show a custom install button
        showInstallButton();
    });

    /**
     * Show install button
     */
    function showInstallButton() {
        // Create install button if it doesn't exist
        let installBtn = document.getElementById('installBtn');
        
        if (!installBtn && !checkStandaloneMode()) {
            installBtn = document.createElement('button');
            installBtn.id = 'installBtn';
            installBtn.className = 'secondary-button';
            installBtn.innerHTML = '<span class="material-icons">download</span> Install App';
            installBtn.style.margin = '12px 0';
            
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    // Show the install prompt
                    deferredPrompt.prompt();
                    
                    // Wait for the user's response
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`User ${outcome} the install prompt`);
                    
                    // Clear the deferred prompt
                    deferredPrompt = null;
                    
                    // Hide the install button
                    installBtn.style.display = 'none';
                }
            });
            
            // Add to cache section
            const cacheInfo = document.querySelector('.cache-info');
            if (cacheInfo) {
                cacheInfo.appendChild(installBtn);
            }
        }
    }

    /**
     * Handle successful installation
     */
    window.addEventListener('appinstalled', () => {
        console.log('GeoCache PWA installed successfully');
        
        if (typeof window.showToast === 'function') {
            window.showToast('GeoCache installed successfully!');
        }
        
        // Clear the deferred prompt
        deferredPrompt = null;
        
        // Hide install button
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    });

    // Register service worker when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            registerServiceWorker();
            checkStandaloneMode();
        });
    } else {
        registerServiceWorker();
        checkStandaloneMode();
    }
})();
