/**
 * data.js
 * Building data for Himalayan University, Jollang, Itanagar.
 * Used when Firebase is not configured or cannot be reached.
 * The same data is in firebase/campus-data.json for importing.
 *
 * NOTE: approx: true means the lat/lng is an estimate placed near the
 * campus centre. Walk to the building, read the GPS position and
 * update lat/lng, then set approx to false.
 */

const SAMPLE_BUILDINGS = {
    main_gate: {
        name: 'Main Gate', code: 'GATE', category: 'Campus',
        lat: 27.083709, lng: 93.605673, approx: true,
        hours: '-',
        depts: 'Entry / Exit, Security',
        desc: 'Main entrance to the campus at Jollang Village, near Central Jail, Itanagar.'
    },
    admin: {
        name: 'Administrative Office & Admission Cell', code: 'ADM', category: 'Administration',
        lat: 27.084309, lng: 93.605673, approx: true,
        hours: '10:00 AM - 2:00 PM, 3:00 PM - 6:00 PM',
        depts: 'Admissions, Registrar, Accounts, Examination',
        desc: 'University office for admissions, fees and general enquiries. Phone: 0360-2203618.'
    },
    engineering: {
        name: 'Faculty of Engineering and Technology', code: 'FET', category: 'Faculty',
        lat: 27.084629, lng: 93.605133, approx: true,
        depts: 'Diploma in Civil Engineering, B.Tech Civil, M.Tech Civil',
        desc: 'Civil Engineering programmes.'
    },
    computer: {
        name: 'Faculty of Computer Application & IT', code: 'FCA', category: 'Faculty',
        lat: 27.084629, lng: 93.605493, approx: true,
        depts: 'BCA, PGDCA, MCA, Computer Labs',
        desc: 'Computer Application and Information Technology programmes.'
    },
    science: {
        name: 'Faculty of Science', code: 'FSC', category: 'Faculty',
        lat: 27.084629, lng: 93.605853, approx: true,
        depts: 'B.Sc (CBZ), M.Sc Physics, M.Sc Botany, M.Sc Zoology',
        desc: 'Physics, Chemistry, Botany and Zoology.'
    },
    agriculture: {
        name: 'Faculty of Agriculture', code: 'FAG', category: 'Faculty',
        lat: 27.084629, lng: 93.606213, approx: true,
        depts: 'B.Sc Agriculture, M.Sc Agriculture',
        desc: 'Agriculture programmes.'
    },
    pharmacy: {
        name: 'Faculty of Pharmacy', code: 'FPH', category: 'Faculty',
        lat: 27.084949, lng: 93.605133, approx: true,
        depts: 'Diploma in Pharmacy, B.Pharma',
        desc: 'Pharmacy programmes.'
    },
    nursing: {
        name: 'Faculty of Nursing & Paramedical Sciences', code: 'FNP', category: 'Faculty',
        lat: 27.084949, lng: 93.605493, approx: true,
        depts: 'B.Sc Nursing',
        desc: 'Nursing and Paramedical Sciences.'
    },
    management: {
        name: 'Faculty of Business Management', code: 'FBM', category: 'Faculty',
        lat: 27.084949, lng: 93.605853, approx: true,
        depts: 'BBA, MBA',
        desc: 'Business Administration programmes.'
    },
    commerce: {
        name: 'Faculty of Commerce', code: 'FCO', category: 'Faculty',
        lat: 27.084949, lng: 93.606213, approx: true,
        depts: 'B.Com, M.Com',
        desc: 'Commerce programmes.'
    },
    arts: {
        name: 'Faculty of Arts', code: 'FAR', category: 'Faculty',
        lat: 27.085269, lng: 93.605133, approx: true,
        depts: 'BA, BA (Hons) and MA in English, History, Geography, Political Science, Public Administration, Sociology, Education; Diploma in GIS',
        desc: 'Humanities and languages.'
    },
    social_science: {
        name: 'Faculty of Social Science', code: 'FSS', category: 'Faculty',
        lat: 27.085269, lng: 93.605493, approx: true,
        depts: 'BSW, MSW',
        desc: 'Social Work programmes.'
    },
    education: {
        name: 'Faculty of Education', code: 'FED', category: 'Faculty',
        lat: 27.085269, lng: 93.605853, approx: true,
        depts: 'B.Ed Special Education (LD / MR)',
        desc: 'Teacher education programmes.'
    },
    law: {
        name: 'Faculty of Law', code: 'FLW', category: 'Faculty',
        lat: 27.085269, lng: 93.606213, approx: true,
        depts: 'LLB, BA LLB, LLM',
        desc: 'Law programmes.'
    },
    library: {
        name: 'Faculty of Library & Information Science', code: 'FLI', category: 'Faculty',
        lat: 27.085589, lng: 93.605133, approx: true,
        depts: 'B.Lib, M.Lib',
        desc: 'Library and Information Science programmes.'
    }
};

/**
 * Campus footpaths used for shortest path routing (graph.js).
 * junctions = points where paths meet, edges = walkable path between two nodes
 * (building ids or junction ids). Distances are calculated from lat/lng.
 *
 * Like the buildings, these follow the approximate layout - update them
 * together with the building positions.
 */
const SAMPLE_PATHS = {
    junctions: {
        j1: { name: 'Main Path Junction 1', lat: 27.084629, lng: 93.605673 },
        j2: { name: 'Main Path Junction 2', lat: 27.084949, lng: 93.605673 },
        j3: { name: 'Main Path Junction 3', lat: 27.085269, lng: 93.605673 },
        j4: { name: 'Main Path Junction 4', lat: 27.085589, lng: 93.605673 }
    },
    edges: [
        // main path from the gate through the campus
        ['main_gate', 'admin'], ['admin', 'j1'], ['j1', 'j2'], ['j2', 'j3'], ['j3', 'j4'],

        // row 1
        ['j1', 'computer'], ['j1', 'science'], ['computer', 'engineering'], ['science', 'agriculture'],

        // row 2
        ['j2', 'nursing'], ['j2', 'management'], ['nursing', 'pharmacy'], ['management', 'commerce'],

        // row 3
        ['j3', 'social_science'], ['j3', 'education'], ['social_science', 'arts'], ['education', 'law'],

        // row 4
        ['j4', 'library']
    ]
};
