/**
 * Pathfinding Module
 * Implements A* Search Algorithm for on-device route calculation
 */

const Pathfinder = (function() {
    // Constants
    const AVERAGE_SPEED_KMH = 50; // Average traveling speed in km/h for time estimation

    /**
     * Node class for A* algorithm
     */
    class Node {
        constructor(lat, lng, id = null) {
            this.lat = lat;
            this.lng = lng;
            this.id = id || `${lat},${lng}`;
            this.g = 0; // Cost from start to this node
            this.h = 0; // Heuristic cost to goal
            this.f = 0; // Total cost (g + h)
            this.parent = null;
            this.neighbors = [];
        }

        /**
         * Calculate distance to another node
         */
        distanceTo(other) {
            return haversineDistance(this.lat, this.lng, other.lat, other.lng);
        }
    }

    /**
     * Graph class to represent the map
     */
    class Graph {
        constructor() {
            this.nodes = new Map();
        }

        /**
         * Add a node to the graph
         */
        addNode(lat, lng, id = null) {
            const node = new Node(lat, lng, id);
            this.nodes.set(node.id, node);
            return node;
        }

        /**
         * Get a node by ID
         */
        getNode(id) {
            return this.nodes.get(id);
        }

        /**
         * Add an edge between two nodes
         */
        addEdge(nodeId1, nodeId2) {
            const node1 = this.nodes.get(nodeId1);
            const node2 = this.nodes.get(nodeId2);

            if (node1 && node2) {
                node1.neighbors.push(node2);
                node2.neighbors.push(node1);
            }
        }

        /**
         * Create a grid graph for demonstration purposes
         * In a real application, this would be built from actual road network data
         */
        createGridGraph(center, radiusKm, gridSize = 10) {
            const nodes = [];
            const latStep = (radiusKm / 111) / gridSize; // Rough conversion
            const lngStep = (radiusKm / (111 * Math.cos(center.lat * Math.PI / 180))) / gridSize;

            // Create grid nodes
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    const lat = center.lat - (radiusKm / 111) / 2 + i * latStep;
                    const lng = center.lng - (radiusKm / (111 * Math.cos(center.lat * Math.PI / 180))) / 2 + j * lngStep;
                    const node = this.addNode(lat, lng, `${i},${j}`);
                    nodes.push({ node, i, j });
                }
            }

            // Connect neighboring nodes
            for (const { node, i, j } of nodes) {
                // Right neighbor
                if (j < gridSize - 1) {
                    this.addEdge(node.id, `${i},${j + 1}`);
                }
                // Down neighbor
                if (i < gridSize - 1) {
                    this.addEdge(node.id, `${i + 1},${j}`);
                }
                // Diagonal neighbors (optional)
                if (i < gridSize - 1 && j < gridSize - 1) {
                    this.addEdge(node.id, `${i + 1},${j + 1}`);
                }
                if (i < gridSize - 1 && j > 0) {
                    this.addEdge(node.id, `${i + 1},${j - 1}`);
                }
            }
        }

        /**
         * Find the closest node to a given coordinate
         */
        findClosestNode(lat, lng) {
            let closest = null;
            let minDistance = Infinity;

            for (const node of this.nodes.values()) {
                const distance = haversineDistance(lat, lng, node.lat, node.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    closest = node;
                }
            }

            return closest;
        }
    }

    /**
     * Calculate Haversine distance between two coordinates (in kilometers)
     */
    function haversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = toRadians(lat2 - lat1);
        const dLng = toRadians(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     */
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * A* Search Algorithm
     * @param {Node} start - Starting node
     * @param {Node} goal - Goal node
     * @returns {Array} - Array of nodes representing the path, or null if no path found
     */
    function aStar(start, goal) {
        if (!start || !goal) {
            console.error('Start or goal node is missing');
            return null;
        }

        // Initialize open and closed sets
        const openSet = [start];
        const closedSet = new Set();

        start.g = 0;
        start.h = start.distanceTo(goal);
        start.f = start.h;

        while (openSet.length > 0) {
            // Find node with lowest f score
            let current = openSet[0];
            let currentIndex = 0;

            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < current.f) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            // Goal reached
            if (current.id === goal.id) {
                return reconstructPath(current);
            }

            // Move current from open to closed
            openSet.splice(currentIndex, 1);
            closedSet.add(current.id);

            // Examine neighbors
            for (const neighbor of current.neighbors) {
                if (closedSet.has(neighbor.id)) {
                    continue;
                }

                const tentativeG = current.g + current.distanceTo(neighbor);

                const inOpenSet = openSet.find(n => n.id === neighbor.id);
                if (!inOpenSet) {
                    openSet.push(neighbor);
                } else if (tentativeG >= neighbor.g) {
                    continue;
                }

                // This path is the best so far
                neighbor.parent = current;
                neighbor.g = tentativeG;
                neighbor.h = neighbor.distanceTo(goal);
                neighbor.f = neighbor.g + neighbor.h;
            }
        }

        // No path found
        console.warn('No path found between start and goal');
        return null;
    }

    /**
     * Reconstruct path from goal to start
     */
    function reconstructPath(node) {
        const path = [];
        let current = node;

        while (current) {
            path.unshift({ lat: current.lat, lng: current.lng });
            current = current.parent;
        }

        return path;
    }

    /**
     * Calculate route between two points
     * @param {Object} origin - {lat, lng}
     * @param {Object} destination - {lat, lng}
     * @param {Graph} graph - Optional graph to use, creates new one if not provided
     * @returns {Object} - Route information including path and distance
     */
    async function calculateRoute(origin, destination, graph = null) {
        try {
            // Create or use existing graph
            if (!graph) {
                graph = new Graph();
                // Create a grid graph centered between origin and destination
                const centerLat = (origin.lat + destination.lat) / 2;
                const centerLng = (origin.lng + destination.lng) / 2;
                const distance = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
                const radius = Math.max(distance * 1.5, 5); // At least 5km radius
                
                graph.createGridGraph({ lat: centerLat, lng: centerLng }, radius, 15);
            }

            // Find closest nodes to origin and destination
            const startNode = graph.findClosestNode(origin.lat, origin.lng);
            const goalNode = graph.findClosestNode(destination.lat, destination.lng);

            if (!startNode || !goalNode) {
                throw new Error('Could not find route nodes');
            }

            // Run A* algorithm
            const path = aStar(startNode, goalNode);

            if (!path) {
                throw new Error('No path found');
            }

            // Calculate total distance
            let totalDistance = 0;
            for (let i = 1; i < path.length; i++) {
                totalDistance += haversineDistance(
                    path[i - 1].lat, path[i - 1].lng,
                    path[i].lat, path[i].lng
                );
            }

            // Estimate time based on average traveling speed
            const estimatedMinutes = Math.round((totalDistance / AVERAGE_SPEED_KMH) * 60);

            return {
                success: true,
                path: path,
                distance: totalDistance,
                distanceText: totalDistance < 1 
                    ? `${Math.round(totalDistance * 1000)} m` 
                    : `${totalDistance.toFixed(2)} km`,
                duration: estimatedMinutes,
                durationText: estimatedMinutes < 60 
                    ? `${estimatedMinutes} min` 
                    : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
            };
        } catch (error) {
            console.error('Route calculation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a simple direct path between two points (fallback)
     */
    function createDirectPath(origin, destination) {
        const path = [origin, destination];
        const distance = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
        const estimatedMinutes = Math.round((distance / AVERAGE_SPEED_KMH) * 60);

        return {
            success: true,
            path: path,
            distance: distance,
            distanceText: distance < 1 
                ? `${Math.round(distance * 1000)} m` 
                : `${distance.toFixed(2)} km`,
            duration: estimatedMinutes,
            durationText: estimatedMinutes < 60 
                ? `${estimatedMinutes} min` 
                : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
        };
    }

    // Public API
    return {
        Graph,
        Node,
        calculateRoute,
        createDirectPath,
        haversineDistance
    };
})();
