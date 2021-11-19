/**
 * config.js
 * Change these values for your own keys.
 */

const APP_CONFIG = {

    // Firebase web app config (Firebase console > Project settings > Your apps).
    // Leave databaseURL empty to use the local sample data in data.js
    FIREBASE: {
        apiKey: '',
        authDomain: '',
        databaseURL: '',
        projectId: ''
    },

    CAMPUS_NAME: 'Himalayan University',
    CAMPUS_ADDRESS: 'Jullang Village, Near Central Jail, Itanagar, Distt. Papum Pare, Arunachal Pradesh - 791111',

    // centre of the campus and default zoom
    CAMPUS_CENTER: { lat: 27.084309, lng: 93.605673 },
    DEFAULT_ZOOM: 18,

    // used as the starting point for directions if GPS is not available
    // (keep this the same as main_gate in data.js)
    MAIN_GATE: { lat: 27.083709, lng: 93.605673 },

    // if the user is further than this (metres) from the campus centre
    // we assume they are outside Itanagar and route from the main gate
    CAMPUS_RADIUS: 15000,

    // for testing on a laptop: set a fixed location here and it is used
    // instead of the real GPS. Set to null to use the real GPS.
    // example - Ganga Market, Itanagar
    TEST_LOCATION: null
};
