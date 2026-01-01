# GeoCache: Intelligent Hybrid Offline Navigator 

**Team:** The Deadlocks (Divya Golakiya, Megh Patel, Kavan Trivedi)

## The Problem
48% of urban navigation is interrupted in "Micro-zones" like basements, metro tunnels, and hilly areas where 4G/5G signals fail. This leads to the "Grey Screen" crisis.

## Our Solution: GeoCache
GeoCache is a privacy-first, ultra-efficient navigator designed for low-connectivity environments.

### Key Features:
* **Ultra-Light:** Reduces map data footprint by 90% (500MB compressed to ~25MB) using Vector Tiles (.PBF format).
* **Edge Computing:** Routing logic (A* Search Algorithm) happens entirely on the device—zero server latency.
* **Smart Cache:** Uses Service Workers and IndexedDB to keep maps permanent and accessible offline.
* **Google Integration:** Uses Google Static Maps API for landmark snapshots and Material Design 3 for the UI.

## Technical Architecture
1. **Data Layer:** OpenStreetMap (OSM) + Vector PBF Tiles.
2. **Logic Layer:** Service Workers + A* Search Algorithm for local pathfinding.
3. **UI Layer:** Leaflet.js + Material Design 3 for instant rendering.
