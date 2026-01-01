/**
 * Cache Management Module
 * Handles IndexedDB operations for persistent storage of map data, routes, and preferences
 */

const CacheManager = (function() {
    const DB_NAME = 'GeoCacheDB';
    const DB_VERSION = 1;
    const STORES = {
        TILES: 'map_tiles',
        ROUTES: 'routes',
        WAYPOINTS: 'waypoints',
        PREFERENCES: 'preferences'
    };
    const TILE_DOWNLOAD_DELAY_MS = 100; // Delay between tile downloads to avoid overwhelming the server

    let db = null;

    /**
     * Initialize IndexedDB
     */
    async function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB initialization failed:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                db = event.target.result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.TILES)) {
                    const tilesStore = db.createObjectStore(STORES.TILES, { keyPath: 'url' });
                    tilesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.ROUTES)) {
                    const routesStore = db.createObjectStore(STORES.ROUTES, { keyPath: 'id', autoIncrement: true });
                    routesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.WAYPOINTS)) {
                    const waypointsStore = db.createObjectStore(STORES.WAYPOINTS, { keyPath: 'id', autoIncrement: true });
                    waypointsStore.createIndex('coordinates', 'coordinates', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
                    db.createObjectStore(STORES.PREFERENCES, { keyPath: 'key' });
                }

                console.log('IndexedDB schema created');
            };
        });
    }

    /**
     * Save a map tile to cache
     */
    async function saveTile(url, blob) {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TILES], 'readwrite');
            const store = transaction.objectStore(STORES.TILES);

            const data = {
                url: url,
                blob: blob,
                timestamp: Date.now()
            };

            const request = store.put(data);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a cached tile
     */
    async function getTile(url) {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TILES], 'readonly');
            const store = transaction.objectStore(STORES.TILES);
            const request = store.get(url);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a route
     */
    async function saveRoute(route) {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.ROUTES], 'readwrite');
            const store = transaction.objectStore(STORES.ROUTES);

            const data = {
                ...route,
                timestamp: Date.now()
            };

            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all saved routes
     */
    async function getRoutes() {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.ROUTES], 'readonly');
            const store = transaction.objectStore(STORES.ROUTES);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a waypoint
     */
    async function saveWaypoint(waypoint) {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.WAYPOINTS], 'readwrite');
            const store = transaction.objectStore(STORES.WAYPOINTS);

            const request = store.add(waypoint);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all waypoints
     */
    async function getWaypoints() {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.WAYPOINTS], 'readonly');
            const store = transaction.objectStore(STORES.WAYPOINTS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a preference
     */
    async function savePreference(key, value) {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PREFERENCES], 'readwrite');
            const store = transaction.objectStore(STORES.PREFERENCES);

            const data = { key, value };
            const request = store.put(data);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a preference
     */
    async function getPreference(key) {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.PREFERENCES], 'readonly');
            const store = transaction.objectStore(STORES.PREFERENCES);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get cache size estimate
     */
    async function getCacheSize() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usageMB = (estimate.usage / 1024 / 1024).toFixed(2);
            const quotaMB = (estimate.quota / 1024 / 1024).toFixed(2);
            return { usage: usageMB, quota: quotaMB };
        }
        return { usage: 0, quota: 0 };
    }

    /**
     * Clear all cached data
     */
    async function clearCache() {
        if (!db) await init();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.TILES, STORES.ROUTES], 'readwrite');

            const tilesClear = transaction.objectStore(STORES.TILES).clear();
            const routesClear = transaction.objectStore(STORES.ROUTES).clear();

            transaction.oncomplete = () => {
                console.log('Cache cleared successfully');
                resolve(true);
            };

            transaction.onerror = () => {
                console.error('Error clearing cache:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    /**
     * Cache tiles for a specific area
     * @param {Array} bounds - [[south, west], [north, east]]
     * @param {Number} zoom - Zoom level
     */
    async function downloadArea(bounds, zoom) {
        const tiles = getTilesForBounds(bounds, zoom);
        const total = tiles.length;
        let cached = 0;

        for (const tile of tiles) {
            try {
                const url = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
                
                // Check if already cached
                const existing = await getTile(url);
                if (existing) {
                    cached++;
                    continue;
                }

                // Fetch and cache
                const response = await fetch(url);
                if (response.ok) {
                    const blob = await response.blob();
                    await saveTile(url, blob);
                    cached++;
                }

                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, TILE_DOWNLOAD_DELAY_MS));
            } catch (error) {
                console.error('Error caching tile:', error);
            }
        }

        return { total, cached };
    }

    /**
     * Calculate tile coordinates for a given bounds and zoom
     */
    function getTilesForBounds(bounds, zoom) {
        const tiles = [];
        const [[south, west], [north, east]] = bounds;

        const minTile = latLngToTile(north, west, zoom);
        const maxTile = latLngToTile(south, east, zoom);

        for (let x = minTile.x; x <= maxTile.x; x++) {
            for (let y = minTile.y; y <= maxTile.y; y++) {
                tiles.push({ x, y, z: zoom });
            }
        }

        return tiles;
    }

    /**
     * Convert lat/lng to tile coordinates using Web Mercator projection
     * @param {Number} lat - Latitude in degrees
     * @param {Number} lng - Longitude in degrees
     * @param {Number} zoom - Zoom level
     * @returns {Object} Tile coordinates {x, y}
     */
    function latLngToTile(lat, lng, zoom) {
        // Convert longitude to tile X coordinate
        // Formula: x = floor((lng + 180) / 360 * 2^zoom)
        const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
        
        // Convert latitude to tile Y coordinate using Mercator projection
        // This uses the inverse Gudermannian function: ln(tan(π/4 + φ/2)) where φ is latitude in radians
        // Simplified as: ln(tan(φ) + sec(φ)) which accounts for Earth's spherical nature
        const latRad = lat * Math.PI / 180;
        const mercatorY = Math.log(Math.tan(latRad) + 1 / Math.cos(latRad));
        const y = Math.floor((1 - mercatorY / Math.PI) / 2 * Math.pow(2, zoom));
        
        return { x, y };
    }

    // Public API
    return {
        init,
        saveTile,
        getTile,
        saveRoute,
        getRoutes,
        saveWaypoint,
        getWaypoints,
        savePreference,
        getPreference,
        getCacheSize,
        clearCache,
        downloadArea
    };
})();
