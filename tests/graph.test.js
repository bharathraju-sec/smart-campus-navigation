const fs = require('fs');
const path = require('path');

global.Geo = require('../www/js/geo');
const CampusGraph = require('../www/js/graph');

// load the real campus data from data.js
const source = fs.readFileSync(path.join(__dirname, '../www/js/data.js'), 'utf8');
const { SAMPLE_BUILDINGS, SAMPLE_PATHS } =
    new Function(`${source}; return { SAMPLE_BUILDINGS, SAMPLE_PATHS };`)();
const buildings = Object.entries(SAMPLE_BUILDINGS).map(([id, b]) => ({ ...b, id }));

describe('MinHeap (priority queue)', () => {

    test('pops items in priority order', () => {
        const heap = new CampusGraph.MinHeap();
        [5, 3, 8, 1, 9, 2, 7].forEach((n) => heap.push(`n${n}`, n));
        const order = [];
        while (heap.size > 0) order.push(heap.pop().priority);
        expect(order).toEqual([1, 2, 3, 5, 7, 8, 9]);
    });

    test('pop on an empty heap returns null', () => {
        expect(new CampusGraph.MinHeap().pop()).toBeNull();
    });
});

describe('Dijkstra shortest path', () => {

    // small test graph (1 degree of latitude ~ 111 km):
    //   A --- B --- D
    //    \         /
    //     \-- C --/     A-C-D is longer than A-B-D
    const nodes = [
        { id: 'A', name: 'A', lat: 0, lng: 0 },
        { id: 'B', name: 'B', lat: 0, lng: 0.001 },
        { id: 'C', name: 'C', lat: 0.002, lng: 0.001 },
        { id: 'D', name: 'D', lat: 0, lng: 0.002 },
        { id: 'E', name: 'E', lat: 1, lng: 1 }       // not connected
    ];
    const paths = { edges: [['A', 'B'], ['B', 'D'], ['A', 'C'], ['C', 'D']] };

    beforeEach(() => CampusGraph.build(nodes, paths));

    test('finds the shorter of two routes', () => {
        const r = CampusGraph.shortestPath('A', 'D');
        expect(r.path.map((n) => n.id)).toEqual(['A', 'B', 'D']);
        expect(r.distance).toBeCloseTo(222.4, 0);
    });

    test('path to itself has zero distance', () => {
        const r = CampusGraph.shortestPath('B', 'B');
        expect(r.path.map((n) => n.id)).toEqual(['B']);
        expect(r.distance).toBe(0);
    });

    test('returns null when there is no path', () => {
        expect(CampusGraph.shortestPath('A', 'E')).toBeNull();
        expect(CampusGraph.shortestPath('A', 'unknown')).toBeNull();
    });

    test('nearest node to a point', () => {
        expect(CampusGraph.nearestNode({ lat: 0.0019, lng: 0.0011 }).node.id).toBe('C');
    });
});

describe('Himalayan University campus graph', () => {

    beforeAll(() => CampusGraph.build(buildings, SAMPLE_PATHS));

    test('every building can be reached from the Main Gate', () => {
        buildings.forEach((b) => {
            expect(CampusGraph.shortestPath('main_gate', b.id)).not.toBeNull();
        });
    });

    test('route from the gate to the Faculty of Law uses the main path', () => {
        const r = CampusGraph.shortestPath('main_gate', 'law');
        const ids = r.path.map((n) => n.id);
        expect(ids[0]).toBe('main_gate');
        expect(ids[ids.length - 1]).toBe('law');
        expect(ids).toContain('admin');
    });

    test('directions have one step per path segment', () => {
        const r = CampusGraph.shortestPath('main_gate', 'library');
        const steps = CampusGraph.directions(r.path);
        expect(steps).toHaveLength(r.path.length - 1);
        expect(steps[0].text).toContain('Walk north');
    });
});
