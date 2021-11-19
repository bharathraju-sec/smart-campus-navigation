/**
 * db.js
 * Building data from the Firebase Realtime Database (JS SDK v7).
 * Uses a realtime listener, so edits in the Firebase console show up
 * in the app straight away.
 *
 * Order of preference:
 *   1. Firebase (if APP_CONFIG.FIREBASE.databaseURL is set and reachable)
 *   2. Last copy cached in localStorage (offline use)
 *   3. Sample data bundled in data.js
 */

const CampusDB = (() => {

    const CACHE_KEY = 'hu_smartcampus_buildings';
    const PATHS_KEY = 'hu_smartcampus_paths';
    const REPORTS_KEY = 'hu_smartcampus_pending_reports';
    const TIMEOUT_MS = 8000;

    let buildings = [];
    let paths = SAMPLE_PATHS;
    let source = '';

    const online = () => APP_CONFIG.FIREBASE.databaseURL && typeof firebase !== 'undefined';

    // Firebase returns an object keyed by id - turn it into a sorted array
    const toArray = (obj) =>
        Object.entries(obj || {})
            .filter(([, b]) => b && typeof b.lat === 'number' && typeof b.lng === 'number')
            .map(([id, b]) => ({ ...b, id }))
            .sort((a, b) => a.name.localeCompare(b.name));

    const saveCache = (obj, key = CACHE_KEY) => {
        try {
            localStorage.setItem(key, JSON.stringify(obj));
        } catch (e) { /* storage full or disabled */ }
    };

    const readCache = (key = CACHE_KEY) => {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    };

    const set = (obj, src, callback) => {
        buildings = toArray(obj);
        source = src;
        callback(buildings, source);
    };

    const useLocal = (callback) => {
        paths = readCache(PATHS_KEY) || SAMPLE_PATHS;
        const cached = readCache();
        if (cached) {
            set(cached, 'Offline copy (last synced from Firebase)', callback);
        } else {
            set(SAMPLE_BUILDINGS, 'Sample data (Firebase not configured)', callback);
        }
    };

    /**
     * load(callback) - callback(buildings, source) is called once with
     * the first data, and again every time the data changes in Firebase.
     */
    const load = (callback) => {
        if (!online()) {
            useLocal(callback);
            return;
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(APP_CONFIG.FIREBASE);
        }

        let gotData = false;
        const timer = setTimeout(() => {
            if (!gotData) useLocal(callback);
        }, TIMEOUT_MS);

        const db = firebase.database();

        // footpaths change rarely - read them once
        db.ref('paths').once('value').then((snap) => {
            if (snap.val()) {
                paths = snap.val();
                saveCache(paths, PATHS_KEY);
                callback(buildings, source);
            }
        }).catch(() => { /* keep cached / sample paths */ });

        db.ref('buildings').on('value', (snap) => {
            gotData = true;
            clearTimeout(timer);
            const data = snap.val();
            if (data) {
                saveCache(data);
                set(data, 'Live from Firebase', callback);
            } else {
                useLocal(callback);
            }
        }, () => {
            clearTimeout(timer);
            useLocal(callback);
        });

        flushReports();
    };

    // ---------- location reports ----------

    const pendingReports = () => readCache(REPORTS_KEY) || [];

    const pushReport = (report) => firebase.database().ref('reports').push({
        ...report,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    });

    // send reports that were saved while Firebase was not available
    const flushReports = () => {
        const queue = pendingReports();
        if (!online() || queue.length === 0) return;
        Promise.all(queue.map(({ createdAt, ...r }) => pushReport(r)))
            .then(() => saveCache([], REPORTS_KEY))
            .catch(() => { /* try again next time */ });
    };

    /**
     * report({ buildingId, lat, lng, accuracy, note }) -> Promise<'sent' | 'saved'>
     * Students standing at a building send its real GPS position.
     * Firebase rules validate the fields (see firebase/rules.json).
     */
    const report = (data) => {
        const clean = {
            buildingId: String(data.buildingId),
            lat: Number(data.lat),
            lng: Number(data.lng),
            accuracy: Math.round(Number(data.accuracy) || 0),
            note: String(data.note || '').slice(0, 200)
        };
        if (online()) {
            return pushReport(clean).then(() => 'sent');
        }
        saveCache([...pendingReports(), { ...clean, createdAt: Date.now() }], REPORTS_KEY);
        return Promise.resolve('saved');
    };

    const getById = (id) => buildings.find((b) => b.id === id) || null;

    const categories = () => [...new Set(buildings.map((b) => b.category).filter(Boolean))].sort();

    return {
        load,
        all: () => buildings,
        paths: () => paths,
        getById,
        categories,
        report,
        pendingReports,
        source: () => source
    };

})();
