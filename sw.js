/**
 * Service Worker
 * Handles offline support and caching strategies
 */

const CACHE_VERSION = 'geocache-v1';
const CACHE_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/map.js',
    '/js/cache.js',
    '/js/pathfinding.js',
    '/js/sw-register.js',
    '/manifest.json'
];

const TILE_CACHE = 'geocache-tiles-v1';

// Offline tile placeholder
const OFFLINE_TILE_SVG = '<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#f0f0f0"/><text x="128" y="128" text-anchor="middle" font-family="Arial" font-size="16" fill="#999">Offline</text></svg>';

/**
 * Install event - cache core assets
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('Caching app assets');
                return cache.addAll(CACHE_ASSETS);
            })
            .then(() => {
                console.log('Service Worker installed');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Cache installation failed:', error);
            })
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name !== CACHE_VERSION && name !== TILE_CACHE;
                        })
                        .map((name) => {
                            console.log('Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - serve from cache with network fallback
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle map tiles separately - exact hostname match for security
    if (url.hostname === 'tile.openstreetmap.org' || 
        url.hostname.endsWith('.tile.openstreetmap.org')) {
        event.respondWith(handleTileRequest(request));
        return;
    }

    // Handle Leaflet and external resources - exact hostname matches for security
    if (url.hostname === 'unpkg.com' || 
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com') {
        event.respondWith(handleExternalResource(request));
        return;
    }

    // Handle app resources
    event.respondWith(handleAppResource(request));
});

/**
 * Handle map tile requests
 * Strategy: Cache first, then network
 */
async function handleTileRequest(request) {
    try {
        // Try cache first
        const cache = await caches.open(TILE_CACHE);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Not in cache, fetch from network
        const networkResponse = await fetch(request);

        // Cache the tile for future use
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('Tile fetch error:', error);
        
        // Return a placeholder tile if offline
        return new Response(OFFLINE_TILE_SVG, {
            headers: { 'Content-Type': 'image/svg+xml' }
        });
    }
}

/**
 * Handle external resources (Leaflet, fonts, etc.)
 * Strategy: Network first, then cache
 */
async function handleExternalResource(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // No cache available
        return new Response('Resource unavailable offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Handle app resources
 * Strategy: Cache first, then network
 */
async function handleAppResource(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // If requesting HTML, return offline page
        if (request.destination === 'document') {
            const cache = await caches.open(CACHE_VERSION);
            const cachedIndex = await cache.match('/index.html');
            
            if (cachedIndex) {
                return cachedIndex;
            }
        }
        
        return new Response('Offline - Resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

/**
 * Background sync for failed requests (future enhancement)
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-routes') {
        event.waitUntil(syncRoutes());
    }
});

/**
 * Sync routes when back online
 */
async function syncRoutes() {
    console.log('Syncing routes...');
    // Future: Implement route syncing logic
}

/**
 * Handle push notifications (future enhancement)
 */
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification('GeoCache', options)
    );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});
