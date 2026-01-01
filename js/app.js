/**
 * Main Application Logic
 * Coordinates all modules and handles user interactions
 */

(function() {
    'use strict';

    // UI Elements
    let elements = {};

    /**
     * Initialize the application
     */
    async function init() {
        console.log('Initializing GeoCache...');

        // Cache UI elements
        cacheElements();

        // Initialize modules
        await initializeModules();

        // Setup event listeners
        setupEventListeners();

        // Setup online/offline detection
        setupOnlineOfflineDetection();

        // Initialize cache size display
        updateCacheSize();

        console.log('GeoCache initialized successfully');
    }

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            // Status
            onlineStatus: document.getElementById('onlineStatus'),
            
            // Control Panel
            controlPanel: document.getElementById('controlPanel'),
            panelContent: document.getElementById('panelContent'),
            togglePanel: document.getElementById('togglePanel'),
            
            // Inputs
            originInput: document.getElementById('originInput'),
            destinationInput: document.getElementById('destinationInput'),
            
            // Buttons
            useCurrentLocation: document.getElementById('useCurrentLocation'),
            calculateRoute: document.getElementById('calculateRoute'),
            clearRoute: document.getElementById('clearRoute'),
            locateButton: document.getElementById('locateButton'),
            downloadArea: document.getElementById('downloadArea'),
            clearCache: document.getElementById('clearCache'),
            
            // Route Info
            routeInfo: document.getElementById('routeInfo'),
            routeDistance: document.getElementById('routeDistance'),
            routeTime: document.getElementById('routeTime'),
            
            // Cache Info
            cacheSize: document.getElementById('cacheSize'),
            
            // Toast & Loading
            toast: document.getElementById('toast'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };
    }

    /**
     * Initialize all modules
     */
    async function initializeModules() {
        try {
            // Initialize IndexedDB
            await CacheManager.init();
            console.log('Cache Manager initialized');

            // Initialize Map
            MapManager.init('map');
            console.log('Map Manager initialized');
        } catch (error) {
            console.error('Module initialization error:', error);
            showToast('Error initializing app: ' + error.message);
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Toggle panel
        elements.togglePanel.addEventListener('click', togglePanel);

        // Use current location button
        elements.useCurrentLocation.addEventListener('click', useCurrentLocation);

        // Calculate route button
        elements.calculateRoute.addEventListener('click', calculateRoute);

        // Clear route button
        elements.clearRoute.addEventListener('click', clearRoute);

        // Locate button (FAB)
        elements.locateButton.addEventListener('click', () => {
            MapManager.centerOnCurrentLocation();
        });

        // Download area button
        elements.downloadArea.addEventListener('click', downloadArea);

        // Clear cache button
        elements.clearCache.addEventListener('click', clearCacheHandler);

        // Input change handlers
        elements.originInput.addEventListener('input', handleInputChange);
        elements.destinationInput.addEventListener('input', handleInputChange);
    }

    /**
     * Toggle control panel
     */
    function togglePanel() {
        elements.controlPanel.classList.toggle('collapsed');
    }

    /**
     * Use current location as origin
     */
    function useCurrentLocation() {
        const location = MapManager.currentLocation;
        
        if (location) {
            MapManager.setOriginMarker(location, 'Current Location');
            elements.originInput.value = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
            showToast('Using current location as origin');
        } else {
            showToast('Current location not available');
            MapManager.getCurrentLocation();
        }
    }

    /**
     * Calculate route between origin and destination
     */
    async function calculateRoute() {
        const origin = MapManager.getOrigin();
        const destination = MapManager.getDestination();

        if (!origin) {
            showToast('Please set an origin point (click on map)');
            return;
        }

        if (!destination) {
            showToast('Please set a destination point (click on map)');
            return;
        }

        // Show loading overlay
        showLoading(true);

        try {
            console.log('Calculating route from', origin, 'to', destination);

            // Calculate route using A* algorithm
            const result = await Pathfinder.calculateRoute(origin, destination);

            if (result.success) {
                // Draw route on map
                MapManager.drawRoute(result.path);

                // Update route info
                elements.routeDistance.textContent = `Distance: ${result.distanceText}`;
                elements.routeTime.textContent = `Est. Time: ${result.durationText}`;
                elements.routeInfo.style.display = 'block';

                // Save route to cache
                try {
                    await CacheManager.saveRoute({
                        origin: origin,
                        destination: destination,
                        path: result.path,
                        distance: result.distance,
                        duration: result.duration
                    });
                    console.log('Route saved to cache');
                } catch (error) {
                    console.warn('Failed to save route:', error);
                }

                showToast(`Route calculated: ${result.distanceText}`);
            } else {
                showToast('Could not calculate route: ' + result.error);
            }
        } catch (error) {
            console.error('Route calculation error:', error);
            showToast('Error calculating route');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Clear route and markers
     */
    function clearRoute() {
        MapManager.clearAll();
        elements.originInput.value = '';
        elements.destinationInput.value = '';
        elements.routeInfo.style.display = 'none';
        showToast('Route cleared');
    }

    /**
     * Download current map area for offline use
     */
    async function downloadArea() {
        const bounds = MapManager.getBounds();
        const zoom = MapManager.getZoom();

        if (!bounds) {
            showToast('Map not ready');
            return;
        }

        showLoading(true);

        try {
            showToast('Downloading map tiles... This may take a moment.');
            
            const result = await CacheManager.downloadArea(bounds, zoom);
            
            showToast(`Downloaded ${result.cached} of ${result.total} tiles`);
            await updateCacheSize();
        } catch (error) {
            console.error('Download area error:', error);
            showToast('Error downloading area');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Clear cache handler
     */
    async function clearCacheHandler() {
        if (!confirm('Are you sure you want to clear all cached data?')) {
            return;
        }

        showLoading(true);

        try {
            await CacheManager.clearCache();
            await updateCacheSize();
            showToast('Cache cleared successfully');
        } catch (error) {
            console.error('Clear cache error:', error);
            showToast('Error clearing cache');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Update cache size display
     */
    async function updateCacheSize() {
        try {
            const size = await CacheManager.getCacheSize();
            elements.cacheSize.textContent = `Cache: ${size.usage} MB`;
        } catch (error) {
            console.error('Error getting cache size:', error);
        }
    }

    /**
     * Handle input changes
     */
    function handleInputChange() {
        // In a real app, you might implement geocoding here
        // For now, we rely on map clicks to set coordinates
    }

    /**
     * Setup online/offline detection
     */
    function setupOnlineOfflineDetection() {
        updateOnlineStatus();

        window.addEventListener('online', () => {
            updateOnlineStatus();
            showToast('Back online');
        });

        window.addEventListener('offline', () => {
            updateOnlineStatus();
            showToast('You are offline. Using cached data.');
        });
    }

    /**
     * Update online status indicator
     */
    function updateOnlineStatus() {
        const online = navigator.onLine;
        const statusIcon = elements.onlineStatus.querySelector('.status-icon');
        const statusText = elements.onlineStatus.querySelector('.status-text');

        if (online) {
            elements.onlineStatus.classList.remove('offline');
            statusIcon.textContent = 'wifi';
            statusText.textContent = 'Online';
        } else {
            elements.onlineStatus.classList.add('offline');
            statusIcon.textContent = 'wifi_off';
            statusText.textContent = 'Offline';
        }
    }

    /**
     * Show toast notification
     */
    function showToast(message, duration = 3000) {
        elements.toast.textContent = message;
        elements.toast.classList.add('show');

        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, duration);
    }

    /**
     * Show/hide loading overlay
     */
    function showLoading(show) {
        elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    // Make showToast available globally for other modules
    window.showToast = showToast;

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
