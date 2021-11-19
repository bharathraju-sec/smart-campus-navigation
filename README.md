# Smart Campus Navigation App - Himalayan University

A GPS-based mobile app for getting around the **Himalayan University** campus
(Jullang Village, Near Central Jail, Itanagar, Arunachal Pradesh - 791111). It shows your live
location on the map, lets you search for any building, and gives
walking directions to it. Building data is stored in the Firebase Realtime Database.

It is a hybrid app built with Apache Cordova, so the same code runs as an installed
Android app and as a Progressive Web App (PWA) in the browser.

## Features

- **Live GPS tracking**: a blue dot and accuracy circle show where you are,
  using `navigator.geolocation.watchPosition` (HTML5 / cordova-plugin-geolocation)
- **Campus map**: Leaflet + OpenStreetMap with a marker and popup for every building
- **Search**: filters as you type by faculty, course (BCA, LLB, B.Pharma...) or office,
  plus category chips
- Covers all 13 faculties plus the Administrative Office / Admission Cell and the Main Gate
- **Nearest first**: when GPS is on, the list is sorted by distance (Haversine formula)
- **Shortest path routing (Dijkstra)**: the campus footpaths are stored as a weighted graph
  (buildings and path junctions = nodes, footpaths = edges, weight = distance in metres).
  Dijkstra's algorithm with a binary min-heap priority queue finds the shortest walking route,
  draws it on the map and gives step-by-step directions ("Walk north to ...")
  - routes from your current position if you are on campus, otherwise from the Main Gate
  - works offline and does not need any online directions service
  - if a building is not on the footpath graph it falls back to OSRM directions, then to the
    straight-line distance and walking time
- **Report incorrect location**: a student standing at a building can send its real GPS
  position to Firebase (validated by database rules). Reports made without a connection are
  queued on the phone and sent later
- **Network status**: shows an offline banner (browser `online`/`offline` events and
  cordova-plugin-network-information) and syncs again when the connection comes back
- **Firebase Realtime Database**: buildings are loaded with a realtime listener, so changes
  made in the Firebase console appear in the app straight away
  - the last copy is cached in `localStorage` so the app still works offline
  - if Firebase isn't set up, it falls back to the bundled sample data
- **PWA**: web app manifest + service worker, so it can be installed from the browser and
  the building list keeps working offline
- Hash-based routing (`#/map`, `#/buildings`, `#/building/<id>`, `#/route/<id>`, `#/about`)
  with working back button

## Tech Stack

- HTML5, CSS3 (flexbox, custom properties), JavaScript (ES6+, no frameworks)
- Leaflet 1.7.1 + OpenStreetMap tiles, OSRM for walking directions
- Firebase JS SDK v7 (Realtime Database)
- Apache Cordova 10 / cordova-android 9 (cordova-plugin-geolocation, cordova-plugin-network-information)
- Service Worker + Web App Manifest

## Academic Context

Mini project for **B.Tech (Computer Science & Engineering)**, Himalayan University, Itanagar.
Subjects from the B.Tech CSE scheme that this project applies:

| Code | Subject | Where it is used in this project |
|---|---|---|
| 705-A | Cellular and Mobile Computing (Elective II) | GPS / location-based services, network status detection, hybrid Android app with Apache Cordova |
| 504 / 507 | Database Management Systems (+ Lab) | NoSQL data model (buildings, paths, reports), realtime queries, security + validation rules for location reports |
| 601 | Computer Networks | HTTPS APIs (OpenStreetMap, OSRM, Firebase), online/offline detection, offline queue and service worker cache |
| 502 | Analysis and Design of Algorithms | Dijkstra's shortest path, O((V + E) log V); Haversine distance, nearest-first sorting |
| 305 | Data Structures with C | Weighted graph as an adjacency list, binary min-heap priority queue, hash maps and sets |
| 306 | Web Technology | HTML5, CSS3, ES6+, Progressive Web App (manifest + service worker) |
| 604 | Software Engineering | Modular design (geo, graph, db, map, app modules), unit tests with Jest |

## Project Structure

```
smart campus navigation app/
â”œâ”€â”€ config.xml              # Cordova config
â”œâ”€â”€ package.json            # Cordova platforms + plugins, npm scripts
â”œâ”€â”€ firebase/
â”‚   â”œâ”€â”€ campus-data.json    # buildings + footpaths to import into Firebase
â”‚   â””â”€â”€ rules.json          # database security + validation rules
â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ geo.test.js         # distance, bearing, formatting
â”‚   â””â”€â”€ graph.test.js       # min-heap, Dijkstra, campus graph
â””â”€â”€ www/
    â”œâ”€â”€ index.html          # app shell: app bar, views, bottom tab bar
    â”œâ”€â”€ manifest.json       # PWA manifest
    â”œâ”€â”€ sw.js               # service worker (offline app shell)
    â”œâ”€â”€ img/icon.svg
    â”œâ”€â”€ css/app.css
    â””â”€â”€ js/
        â”œâ”€â”€ config.js       # API key, Firebase config, campus centre
        â”œâ”€â”€ data.js         # buildings + footpaths (fallback)
        â”œâ”€â”€ geo.js          # GPS tracking, Haversine distance, bearing
        â”œâ”€â”€ graph.js        # footpath graph, min-heap, Dijkstra shortest path
        â”œâ”€â”€ db.js           # Firebase realtime listener, offline cache, location reports
        â”œâ”€â”€ map.js          # Leaflet map, markers, directions
        â””â”€â”€ app.js          # router, views, search, events
```

## Setup

### 1. Map
The map uses Leaflet 1.7.1 with OpenStreetMap tiles, so no API key is needed.

### 2. Firebase (optional)
1. Create a Firebase project and a Realtime Database.
2. Import `firebase/campus-data.json` at the root of the database.
3. Copy the rules from `firebase/rules.json` (public read for buildings and paths,
   validated write-only access for location reports).
4. Add a Web app in Project settings and copy its config into `www/js/config.js`:

```js
FIREBASE: {
    apiKey: '...',
    authDomain: 'your-app.firebaseapp.com',
    databaseURL: 'https://your-app.firebaseio.com',
    projectId: 'your-app'
},
```

### 3. Building positions
The campus centre (27.0843, 93.6057) comes from the university's listed address.
The exact position of each faculty building is **not publicly mapped**, so every
building in `data.js` has `approx: true` and is laid out on a grid around the centre.
The app shows "Map position is approximate" for these buildings.

To fix a building:
1. Stand at its entrance (or find it on openstreetmap.org, right-click it and copy the coordinates).
2. Put the lat/lng in `www/js/data.js` and set `approx: false`.
3. Do the same in `firebase/campus-data.json` (or edit it in the Firebase console).
4. Keep `MAIN_GATE` in `config.js` the same as `main_gate` in `data.js`.
5. Move the footpath junctions in `SAMPLE_PATHS` (`data.js`) to match the real paths.

Location reports sent from the app ("Report incorrect location") are stored under
`/reports` in Firebase. Only an admin in the Firebase console can read them.

## Running

**In a browser (PWA):**

```
npm run serve
```

Then open `http://localhost:8080`. GPS and the service worker need `localhost` or HTTPS.

**Unit tests:**

```
npm install
npm test
```

**On Android:**

```
npm install
npx cordova platform add android
npx cordova run android
```

Requires Android Studio / Android SDK and JDK 8.

## Data Format

Each building in Firebase (`/buildings/<id>`):

| Field    | Example                                   |
|----------|-------------------------------------------|
| name     | Faculty of Law                            |
| code     | FLW                                       |
| category | Faculty                                   |
| lat, lng | 27.085269, 93.606213                      |
| floors   | 2 (optional)                              |
| hours    | 10:00 AM - 6:00 PM (optional)             |
| depts    | LLB, BA LLB, LLM                          |
| desc     | Law programmes.                           |
| approx   | true = position not yet verified          |

Footpaths (`/paths`) - junctions plus a list of edges between node ids:

```json
{
  "junctions": { "j1": { "name": "Main Path Junction 1", "lat": 27.084629, "lng": 93.605673 } },
  "edges": [["main_gate", "admin"], ["admin", "j1"]]
}
```

Location reports (`/reports/<pushId>`): `buildingId`, `lat`, `lng`, `accuracy`, `note`,
`createdAt` (server timestamp).
