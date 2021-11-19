/**
 * app.js
 * Main controller - hash router, views, map, GPS and data.
 *
 * Routes:
 *   #/map              map
 *   #/buildings        building list + search
 *   #/building/<id>    building detail
 *   #/route/<id>       walking directions
 *   #/about            about
 */

const App = (() => {

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const TITLES = {
        map: APP_CONFIG.CAMPUS_NAME,
        buildings: 'Buildings',
        about: 'About',
        route: 'Directions'
    };

    let category = '';          // selected category chip

    // ---------- router ----------

    const showView = (name, title) => {
        $$('.view').forEach((v) => { v.hidden = v.dataset.view !== name; });
        $$('.tab-bar a').forEach((a) => {
            const tab = name === 'building' || name === 'route' ? 'buildings' : name;
            a.classList.toggle('active', a.dataset.tab === tab);
        });
        $('#appTitle').textContent = title || TITLES[name] || APP_CONFIG.CAMPUS_NAME;
        $('#btnBack').hidden = !(name === 'building' || name === 'route');
        $('#btnLocate').hidden = name !== 'map';
        if (name === 'map') CampusMap.refresh();
        $('#btnRefresh').hidden = name !== 'buildings';
    };

    const router = () => {
        const [, view = 'map', id] = (location.hash || '#/map').split('/');

        switch (view) {
        case 'buildings':
            renderList();
            showView('buildings');
            break;
        case 'building':
            if (!showDetail(decodeURIComponent(id))) { location.hash = '#/buildings'; return; }
            break;
        case 'route':
            showRoute(decodeURIComponent(id));
            break;
        case 'about':
            showView('about');
            break;
        default:
            showView('map');
        }
    };

    const go = (hash) => { location.hash = hash; };

    // ---------- building list / search ----------

    const renderChips = () => {
        const cats = ['', ...CampusDB.categories()];
        $('#categoryChips').innerHTML = cats.map((c) => `
            <button class="chip ${c === category ? 'active' : ''}" data-cat="${esc(c)}" role="tab"
                    aria-selected="${c === category}">${c ? esc(c) : 'All'}</button>`).join('');
    };

    const renderList = () => {
        const query = $('#buildingSearch').value.trim().toLowerCase();
        const pos = Geo.position();

        let list = CampusDB.all()
            .filter((b) => !category || b.category === category)
            .filter((b) => !query ||
                [b.name, b.code, b.category, b.depts].join(' ').toLowerCase().includes(query));

        // nearest first when we know where the user is
        if (pos) {
            list = list
                .map((b) => ({ ...b, dist: Geo.distance(pos, b) }))
                .sort((a, b) => a.dist - b.dist);
        }

        $('#buildingList').innerHTML = list.length === 0
            ? '<li class="list-empty">No buildings found.</li>'
            : list.map((b) => `
                <li>
                    <button class="list-item" data-id="${esc(b.id)}">
                        <span class="text">
                            <h3>${esc(b.name)}</h3>
                            <p>${esc(b.code)} &middot; ${esc(b.category)}</p>
                        </span>
                        ${pos ? `<span class="dist">${Geo.formatDistance(b.dist)}</span>` : ''}
                    </button>
                </li>`).join('');

        $('#dataSource').textContent = `Data source: ${CampusDB.source()}`;
    };

    // ---------- detail ----------

    const showDetail = (id) => {
        const b = CampusDB.getById(id);
        if (!b) return false;

        $('#detailName').textContent = b.name;
        $('#detailCode').textContent = b.code;
        $('#detailCategory').textContent = b.category;
        $('#detailDesc').textContent = b.desc || '';
        $('#detailFloors').textContent = typeof b.floors === 'number'
            ? (b.floors === 0 ? 'Open area' : b.floors) : '-';
        $('#detailHours').textContent = b.hours || 'Check with the department';
        $('#detailDepts').textContent = b.depts || '-';
        $('#detailApprox').hidden = b.approx !== true;

        // reset the report form for this building
        $('#reportForm').hidden = true;
        $('#reportNote').value = '';
        $('#reportResult').textContent = '';
        $('#btnReport').dataset.id = b.id;

        const pos = Geo.position();
        if (pos) {
            const d = Geo.distance(pos, b);
            $('#detailDistance').textContent = `${Geo.formatDistance(d)} (about ${Geo.walkTime(d)} walk)`;
        } else {
            $('#detailDistance').textContent = 'Turn on GPS to see distance';
        }

        $('#btnShowOnMap').dataset.id = b.id;
        $('#btnDirections').dataset.id = b.id;
        showView('building', b.code);
        return true;
    };

    // ---------- directions ----------

    const startPoint = () => {
        const pos = Geo.position();
        if (pos && Geo.distance(pos, APP_CONFIG.CAMPUS_CENTER) <= APP_CONFIG.CAMPUS_RADIUS) {
            return { point: { lat: pos.lat, lng: pos.lng }, label: 'your current location' };
        }
        return { point: APP_CONFIG.MAIN_GATE, label: 'the Main Gate' };
    };

    const setLoading = (on, text = 'Finding route...') => {
        let el = $('.loading');
        if (on && !el) {
            el = document.createElement('div');
            el.className = 'loading';
            el.textContent = text;
            document.body.appendChild(el);
        } else if (!on && el) {
            el.remove();
        }
    };

    /**
     * Shortest walking route over the campus footpath graph (Dijkstra).
     * Returns null if the destination is not connected to the graph.
     */
    const campusRoute = (start, b) => {
        const near = CampusGraph.nearestNode(start.point);
        if (!near) return null;

        // too far from the campus footpaths (e.g. in the city) - use road directions instead
        if (near.distance > 300) return null;

        const result = CampusGraph.shortestPath(near.node.id, b.id);
        if (!result) return null;

        const steps = CampusGraph.directions(result.path);
        const points = [...result.path];

        // first walk from where the user is to the nearest point on the path network
        if (near.distance > 5) {
            steps.unshift({
                text: `Walk ${Geo.compass(Geo.bearing(start.point, near.node))} to ${near.node.name}`,
                distance: Geo.formatDistance(near.distance)
            });
            points.unshift(start.point);
        }

        return {
            steps,
            points,
            distance: result.distance + near.distance,
            visited: result.visited
        };
    };

    const showRoute = async (id) => {
        const b = CampusDB.getById(id);
        if (!b) { go('#/buildings'); return; }

        showView('route');

        const start = startPoint();
        const summary = $('#routeSummary');
        const steps = $('#routeSteps');
        const algo = $('#routeAlgo');
        steps.innerHTML = '';
        algo.textContent = '';

        // 1. our own shortest path over the campus footpaths (works offline)
        const route = campusRoute(start, b);
        if (route) {
            summary.innerHTML = `
                To <b>${esc(b.name)}</b> from ${esc(start.label)}<br>
                <strong>${Geo.walkTime(route.distance)}</strong> &middot; ${Geo.formatDistance(route.distance)} walking`;
            steps.innerHTML = route.steps
                .map((s) => `<li>${esc(s.text)} <span class="dist">(${esc(s.distance)})</span></li>`)
                .join('') + `<li><b>You have reached ${esc(b.name)}</b></li>`;
            algo.textContent = `Shortest path by Dijkstra's algorithm - ${route.visited} of ` +
                               `${CampusGraph.size().nodes} campus points checked`;
            CampusMap.drawPath(route.points);
            return;
        }

        // 2. not on the footpath graph - try OSRM directions
        setLoading(true);
        try {
            const info = await CampusMap.route(start.point, b);
            summary.innerHTML = `
                To <b>${esc(b.name)}</b> from ${esc(start.label)}<br>
                <strong>${esc(info.duration)}</strong> &middot; ${esc(info.distance)} walking`;
            steps.innerHTML = info.steps
                .map((s) => `<li>${s.html} <span class="dist">(${esc(s.distance)})</span></li>`)
                .join('') + `<li><b>You have reached ${esc(b.name)}</b></li>`;
            algo.textContent = 'Route from OpenStreetMap (OSRM)';
        } catch (err) {
            // 3. fall back to a straight line estimate
            const d = Geo.distance(start.point, b);
            summary.innerHTML = `
                <p>${esc(err.message)}</p>
                <p>Straight line distance from ${esc(start.label)}:
                   <strong>${Geo.formatDistance(d)}</strong> (about ${Geo.walkTime(d)})</p>`;
        } finally {
            setLoading(false);
        }
    };

    // ---------- report incorrect location ----------

    const showReportGps = () => {
        const pos = Geo.position();
        $('#reportGps').textContent = pos
            ? `Your GPS position: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)} (accuracy ${Math.round(pos.accuracy)} m)`
            : 'Waiting for GPS... turn on location to send a report.';
        $('#btnSendReport').disabled = !pos;
    };

    const sendReport = async (e) => {
        e.preventDefault();
        const pos = Geo.position();
        const result = $('#reportResult');
        if (!pos) return;

        if (pos.accuracy > 50) {
            result.textContent = `GPS accuracy is ${Math.round(pos.accuracy)} m - move to an open area and try again.`;
            result.className = 'report-result err';
            return;
        }

        $('#btnSendReport').disabled = true;
        try {
            const status = await CampusDB.report({
                buildingId: $('#btnReport').dataset.id,
                lat: pos.lat,
                lng: pos.lng,
                accuracy: pos.accuracy,
                note: $('#reportNote').value.trim()
            });
            result.textContent = status === 'sent'
                ? 'Thank you! Your report was sent.'
                : 'Saved on this phone - it will be sent when the database is available.';
            result.className = 'report-result ok';
        } catch (err) {
            result.textContent = 'Could not send the report. Please try again.';
            result.className = 'report-result err';
        } finally {
            $('#btnSendReport').disabled = false;
        }
    };

    // ---------- network status ----------

    const isOffline = () => {
        // cordova-plugin-network-information on the phone, navigator.onLine in the browser
        if (navigator.connection && window.Connection && navigator.connection.type === window.Connection.NONE) {
            return true;
        }
        return navigator.onLine === false;
    };

    const updateNetwork = () => {
        const wasOffline = !$('#netStatus').hidden;
        const offline = isOffline();
        $('#netStatus').hidden = !offline;
        if (wasOffline && !offline) loadData();   // back online - sync again
    };

    // ---------- GPS ----------

    const onGps = (pos, err) => {
        const s = $('#gpsStatus');
        if (err) {
            s.textContent = err.message;
            s.className = 'gps-status err';
            return;
        }
        s.textContent = `GPS on - accuracy ${Math.round(pos.accuracy)} m`;
        s.className = 'gps-status ok';
        CampusMap.updateUser(pos);
    };

    // ---------- data ----------

    const loadData = () => {
        CampusDB.load((list) => {
            CampusGraph.build(list, CampusDB.paths());
            renderChips();
            renderList();
            CampusMap.addBuildings(list);
        });
    };

    // ---------- events ----------

    const bindEvents = () => {
        window.addEventListener('hashchange', router);

        $('#buildingSearch').addEventListener('input', renderList);

        $('#categoryChips').addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            category = chip.dataset.cat;
            renderChips();
            renderList();
        });

        $('#buildingList').addEventListener('click', (e) => {
            const item = e.target.closest('.list-item');
            if (item) go(`#/building/${encodeURIComponent(item.dataset.id)}`);
        });

        $('#btnBack').addEventListener('click', () => history.back());
        $('#btnRefresh').addEventListener('click', loadData);

        $('#btnLocate').addEventListener('click', () => {
            const pos = Geo.position();
            if (pos) {
                CampusMap.centreOnUser(pos);
            } else {
                alert('Waiting for GPS location...');
            }
        });

        $('#btnShowOnMap').addEventListener('click', (e) => {
            const b = CampusDB.getById(e.currentTarget.dataset.id);
            if (!b) return;
            CampusMap.clearRoute();
            $('#mapRoute').hidden = true;
            go('#/map');
            CampusMap.focus(b);
        });

        $('#btnDirections').addEventListener('click', (e) => {
            go(`#/route/${encodeURIComponent(e.currentTarget.dataset.id)}`);
        });

        // show the route and its steps together on the map page
        $('#btnRouteMap').addEventListener('click', () => {
            $('#mapRouteSummary').innerHTML = $('#routeSummary').innerHTML;
            $('#mapRouteSteps').innerHTML = $('#routeSteps').innerHTML;
            $('#mapRoute').hidden = false;
            go('#/map');
        });

        $('#btnCloseRoute').addEventListener('click', () => {
            $('#mapRoute').hidden = true;
            CampusMap.clearRoute();
        });

        $('#btnReport').addEventListener('click', () => {
            const form = $('#reportForm');
            form.hidden = !form.hidden;
            if (!form.hidden) showReportGps();
        });
        $('#reportForm').addEventListener('submit', sendReport);
        Geo.onUpdate(() => { if (!$('#reportForm').hidden) showReportGps(); });

        // browser events + Cordova network plugin events
        ['online', 'offline'].forEach((ev) => {
            window.addEventListener(ev, updateNetwork);
            document.addEventListener(ev, updateNetwork);
        });

        CampusMap.onInfoClick((id) => go(`#/building/${encodeURIComponent(id)}`));
    };

    const registerServiceWorker = () => {
        // only works over http(s), not inside the Cordova file:// webview
        if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
            navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is optional */ });
        }
    };

    const start = () => {
        bindEvents();

        Geo.onUpdate(onGps);
        Geo.start();

        loadData();
        updateNetwork();
        router();

        CampusMap.init('map')
            .then(() => {
                CampusMap.addBuildings(CampusDB.all());
                CampusMap.updateUser(Geo.position());
            })
            .catch((err) => {
                const el = $('#mapError');
                el.textContent = err.message;
                el.hidden = false;
            });

        registerServiceWorker();
    };

    return { start };

})();

// Run after deviceready on the phone, or straight away in a browser
if (window.cordova) {
    document.addEventListener('deviceready', App.start, { once: true });
} else {
    document.addEventListener('DOMContentLoaded', App.start, { once: true });
}
