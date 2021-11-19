/**
 * geo.js
 * GPS tracking and distance helpers.
 * Works with the HTML5 Geolocation API in the browser and with
 * cordova-plugin-geolocation on the phone (same navigator.geolocation API).
 */

const Geo = (() => {

    let watchId = null;
    let lastPos = null;
    const listeners = [];

    const ERRORS = {
        1: 'Location permission denied',
        2: 'Location unavailable',
        3: 'GPS timed out'
    };

    const toRad = (deg) => deg * Math.PI / 180;

    // Haversine formula - distance in metres between two lat/lng points
    const distance = (a, b) => {
        const R = 6371000;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };

    // initial bearing from a to b in degrees (0 = north, 90 = east)
    const bearing = (a, b) => {
        const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
        const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
                  Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    };

    const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
    const compass = (deg) => COMPASS[Math.round(deg / 45) % 8];

    const formatDistance =(m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

    // rough walking time at 1.3 m/s
    const walkTime = (m) => {
        const mins = Math.round(m / 1.3 / 60);
        return mins < 1 ? '< 1 min' : `${mins} min`;
    };

    const notify = (err = null) => listeners.forEach((fn) => fn(lastPos, err));

    const start = () => {
        if (!('geolocation' in navigator)) {
            notify({ message: 'GPS not supported on this device' });
            return;
        }
        if (watchId !== null) return;

        // fixed test location from config.js (no real GPS)
        if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TEST_LOCATION) {
            lastPos = APP_CONFIG.TEST_LOCATION;
            setTimeout(() => notify(), 0);
            return;
        }

        watchId = navigator.geolocation.watchPosition(
            ({ coords }) => {
                lastPos = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
                notify();
            },
            (e) => notify({ message: ERRORS[e.code] || 'GPS error' }),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
        );
    };

    const stop = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    };

    return {
        start,
        stop,
        onUpdate: (fn) => listeners.push(fn),
        position: () => lastPos,
        distance,
        bearing,
        compass,
        formatDistance,
        walkTime
    };

})();

// allow unit tests (Node / Jest) to import the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Geo;
}
