/**
 * Map Module
 * Handles Leaflet.js integration and map interactions
 */

const MapManager = (function() {
    let map = null;
    let currentLocationMarker = null;
    let originMarker = null;
    let destinationMarker = null;
    let routePolyline = null;
    let currentLocation = null;

    // Default location (San Francisco)
    const DEFAULT_LOCATION = { lat: 37.7749, lng: -122.4194 };
    const DEFAULT_ZOOM = 13;

    /**
     * Initialize the map
     */
    function init(containerId = 'map') {
        try {
            // Create map instance
            map = L.map(containerId, {
                center: [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng],
                zoom: DEFAULT_ZOOM,
                zoomControl: true
            });

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                minZoom: 3
            }).addTo(map);

            // Try to get user's current location
            getCurrentLocation();

            // Setup map click handler for setting origin/destination
            setupMapClickHandler();

            console.log('Map initialized successfully');
            return map;
        } catch (error) {
            console.error('Failed to initialize map:', error);
            return null;
        }
    }

    /**
     * Get current location using Geolocation API
     */
    function getCurrentLocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    // Center map on current location
                    map.setView([currentLocation.lat, currentLocation.lng], DEFAULT_ZOOM);

                    // Add current location marker
                    showCurrentLocationMarker(currentLocation);

                    console.log('Current location obtained:', currentLocation);
                },
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    showToast('Unable to get your location. Using default location.');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            console.warn('Geolocation not supported');
            showToast('Geolocation not supported by your browser');
        }
    }

    /**
     * Show current location marker
     */
    function showCurrentLocationMarker(location) {
        if (currentLocationMarker) {
            map.removeLayer(currentLocationMarker);
        }

        const blueIcon = L.divIcon({
            className: 'current-location-marker',
            html: '<div style="background-color: #1976d2; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        currentLocationMarker = L.marker([location.lat, location.lng], {
            icon: blueIcon,
            title: 'Current Location'
        }).addTo(map);

        currentLocationMarker.bindPopup('You are here').openPopup();
    }

    /**
     * Center map on current location
     */
    function centerOnCurrentLocation() {
        if (currentLocation) {
            map.setView([currentLocation.lat, currentLocation.lng], DEFAULT_ZOOM);
            if (currentLocationMarker) {
                currentLocationMarker.openPopup();
            }
        } else {
            getCurrentLocation();
        }
    }

    /**
     * Setup map click handler
     */
    function setupMapClickHandler() {
        let clickCount = 0;

        map.on('click', (e) => {
            const { lat, lng } = e.latlng;

            if (clickCount === 0) {
                // First click: set origin
                setOriginMarker({ lat, lng });
                clickCount = 1;
                showToast('Origin set. Click again to set destination.');
            } else if (clickCount === 1) {
                // Second click: set destination
                setDestinationMarker({ lat, lng });
                clickCount = 0;
                showToast('Destination set. Click "Calculate Route" to proceed.');
            }
        });
    }

    /**
     * Set origin marker
     */
    function setOriginMarker(location, address = null) {
        if (originMarker) {
            map.removeLayer(originMarker);
        }

        const greenIcon = L.divIcon({
            className: 'origin-marker',
            html: '<span style="color: #2e7d32; font-size: 32px;">📍</span>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        originMarker = L.marker([location.lat, location.lng], {
            icon: greenIcon,
            title: 'Origin'
        }).addTo(map);

        const popupContent = address || 'Starting Point';
        originMarker.bindPopup(popupContent);

        return originMarker;
    }

    /**
     * Set destination marker
     */
    function setDestinationMarker(location, address = null) {
        if (destinationMarker) {
            map.removeLayer(destinationMarker);
        }

        const redIcon = L.divIcon({
            className: 'destination-marker',
            html: '<span style="color: #ba1a1a; font-size: 32px;">📍</span>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        destinationMarker = L.marker([location.lat, location.lng], {
            icon: redIcon,
            title: 'Destination'
        }).addTo(map);

        const popupContent = address || 'Destination';
        destinationMarker.bindPopup(popupContent);

        return destinationMarker;
    }

    /**
     * Draw route on map
     */
    function drawRoute(path, color = '#1976d2') {
        // Remove existing route
        clearRoute();

        if (!path || path.length < 2) {
            console.warn('Invalid path for drawing');
            return;
        }

        // Convert path to Leaflet LatLng array
        const latLngs = path.map(point => [point.lat, point.lng]);

        // Create polyline
        routePolyline = L.polyline(latLngs, {
            color: color,
            weight: 5,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map);

        // Fit map to route bounds
        map.fitBounds(routePolyline.getBounds(), {
            padding: [50, 50]
        });

        console.log('Route drawn on map');
    }

    /**
     * Clear route from map
     */
    function clearRoute() {
        if (routePolyline) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }
    }

    /**
     * Clear all markers and routes
     */
    function clearAll() {
        clearRoute();

        if (originMarker) {
            map.removeLayer(originMarker);
            originMarker = null;
        }

        if (destinationMarker) {
            map.removeLayer(destinationMarker);
            destinationMarker = null;
        }
    }

    /**
     * Get origin coordinates
     */
    function getOrigin() {
        if (originMarker) {
            const latLng = originMarker.getLatLng();
            return { lat: latLng.lat, lng: latLng.lng };
        }
        return null;
    }

    /**
     * Get destination coordinates
     */
    function getDestination() {
        if (destinationMarker) {
            const latLng = destinationMarker.getLatLng();
            return { lat: latLng.lat, lng: latLng.lng };
        }
        return null;
    }

    /**
     * Get current map bounds
     */
    function getBounds() {
        if (!map) return null;

        const bounds = map.getBounds();
        return [
            [bounds.getSouth(), bounds.getWest()],
            [bounds.getNorth(), bounds.getEast()]
        ];
    }

    /**
     * Get current zoom level
     */
    function getZoom() {
        return map ? map.getZoom() : DEFAULT_ZOOM;
    }

    /**
     * Get map center
     */
    function getCenter() {
        if (!map) return null;

        const center = map.getCenter();
        return { lat: center.lat, lng: center.lng };
    }

    /**
     * Show toast notification (requires app.js implementation)
     */
    function showToast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else {
            console.log('Toast:', message);
        }
    }

    // Public API
    return {
        init,
        getCurrentLocation,
        centerOnCurrentLocation,
        setOriginMarker,
        setDestinationMarker,
        drawRoute,
        clearRoute,
        clearAll,
        getOrigin,
        getDestination,
        getBounds,
        getZoom,
        getCenter,
        get map() { return map; },
        get currentLocation() { return currentLocation; }
    };
})();
