/**
 * map.js
 * Leaflet + OpenStreetMap - map, markers, user position and
 * walking directions (OSRM routing service).
 * No API key needed.
 */

const CampusMap = (() => {

    let map = null;
    let markers = new Map();
    let userMarker = null;
    let accuracyCircle = null;
    let pathLine = null;
    let onInfoClick = null;

    // resolves once init() has created the map
    let readyResolve;
    const ready = new Promise((r) => { readyResolve = r; });

    const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const init = async (elementId) => {
        if (typeof L === 'undefined') {
            throw new Error('Could not load the map. Check your internet connection.');
        }

        map = L.map(elementId).setView(
            [APP_CONFIG.CAMPUS_CENTER.lat, APP_CONFIG.CAMPUS_CENTER.lng],
            APP_CONFIG.DEFAULT_ZOOM
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        readyResolve();

        // clicks on the link inside the popup
        document.getElementById(elementId).addEventListener('click', (e) => {
            const link = e.target.closest('.iw-link');
            if (link && onInfoClick) onInfoClick(link.dataset.id);
        });
    };

    const isReady = () => map !== null;

    const popupHtml = (b) => `
        <div class="iw-title">${esc(b.name)} (${esc(b.code)})</div>
        <div>${esc(b.category)}</div>
        <button class="iw-link" data-id="${esc(b.id)}">Details &amp; directions</button>`;

    const addBuildings = (list) => {
        if (!isReady()) return;
        markers.forEach((m) => map.removeLayer(m));
        markers = new Map();

        list.forEach((b) => {
            const m = L.marker([b.lat, b.lng], { title: b.name })
                .addTo(map)
                .bindPopup(popupHtml(b));
            markers.set(b.id, m);
        });
    };

    const focus = (b) => {
        if (!isReady() || !markers.has(b.id)) return;
        map.setView([b.lat, b.lng], 19);
        markers.get(b.id).openPopup();
    };

    const updateUser = (pos) => {
        if (!isReady() || !pos) return;
        const latLng = [pos.lat, pos.lng];

        if (!userMarker) {
            userMarker = L.circleMarker(latLng, {
                radius: 8,
                color: '#ffffff',
                weight: 2,
                fillColor: '#4285f4',
                fillOpacity: 1
            }).addTo(map).bindTooltip('You are here');

            accuracyCircle = L.circle(latLng, {
                radius: pos.accuracy,
                color: '#4285f4',
                weight: 1,
                opacity: 0.3,
                fillOpacity: 0.12,
                interactive: false
            }).addTo(map);
        } else {
            userMarker.setLatLng(latLng);
            accuracyCircle.setLatLng(latLng);
            accuracyCircle.setRadius(pos.accuracy);
        }
    };

    const centreOnUser = (pos) => {
        if (isReady() && pos) map.panTo([pos.lat, pos.lng]);
    };

    /**
     * route(origin, building) -> Promise<{ distance, duration, steps }>
     * uses the free OSRM demo server (walking profile)
     */
    const route = async (origin, b) => {
        // wait for the map (max 10 s) when the page was opened directly on a route
        await Promise.race([ready, new Promise((r) => setTimeout(r, 10000))]);
        if (!isReady()) throw new Error('Map is not loaded yet');

        const url = 'https://router.project-osrm.org/route/v1/foot/' +
            `${origin.lng},${origin.lat};${b.lng},${b.lat}` +
            '?overview=full&geometries=geojson&steps=true';

        const res = await fetch(url);
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes.length) {
            throw new Error('Directions failed: ' + data.code);
        }

        const r = data.routes[0];
        drawPath(r.geometry.coordinates.map((c) => ({ lat: c[1], lng: c[0] })));

        return {
            distance: Geo.formatDistance(r.distance),
            duration: Geo.walkTime(r.distance),
            steps: r.legs[0].steps.map((s) => ({
                html: esc(stepText(s)),
                distance: Geo.formatDistance(s.distance)
            }))
        };
    };

    // simple text for an OSRM step
    const stepText = (s) => {
        const road = s.name ? ` on ${s.name}` : '';
        const type = s.maneuver.type;
        const mod = s.maneuver.modifier || '';
        if (type === 'depart') return 'Start walking' + road;
        if (type === 'arrive') return 'Arrive at destination';
        if (mod) return `Turn ${mod}${road}`;
        return 'Continue' + road;
    };

    // draw a route (from graph.js or OSRM)
    const drawPath = (points) => {
        if (!isReady()) return;
        clearRoute();
        pathLine = L.polyline(points.map((p) => [p.lat, p.lng]), {
            color: '#1565c0',
            opacity: 0.9,
            weight: 6
        }).addTo(map);
        map.fitBounds(pathLine.getBounds(), { padding: [60, 60] });
    };

    // Leaflet gets size 0 when its div was hidden, so re-measure when the map is shown
    // and fit the route again if there is one
    const refresh = () => {
        if (!isReady()) return;
        map.invalidateSize();
        if (pathLine) map.fitBounds(pathLine.getBounds(), { padding: [60, 60] });
    };

    const clearRoute = () => {
        if (pathLine) {
            map.removeLayer(pathLine);
            pathLine = null;
        }
    };

    return {
        init,
        isReady,
        addBuildings,
        focus,
        updateUser,
        centreOnUser,
        route,
        drawPath,
        clearRoute,
        refresh,
        onInfoClick: (fn) => { onInfoClick = fn; }
    };

})();
