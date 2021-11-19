/**
 * graph.js
 * Campus footpath graph + Dijkstra's shortest path algorithm.
 *
 * Nodes are buildings and path junctions, edges are walkable footpaths.
 * Edge weight = real distance in metres (Haversine). Dijkstra uses a
 * binary min-heap as the priority queue, so it runs in O((V + E) log V).
 *
 * This works offline and does not need any online directions service.
 */

const CampusGraph = (() => {

    const geo = typeof Geo !== 'undefined' ? Geo : require('./geo');

    /**
     * Binary min-heap priority queue.
     * push / pop are O(log n), stored as a plain array:
     * children of index i are 2i + 1 and 2i + 2.
     */
    class MinHeap {
        constructor() {
            this.items = [];
        }

        get size() {
            return this.items.length;
        }

        push(value, priority) {
            const items = this.items;
            items.push({ value, priority });
            let i = items.length - 1;
            while (i > 0) {
                const parent = (i - 1) >> 1;
                if (items[parent].priority <= items[i].priority) break;
                [items[parent], items[i]] = [items[i], items[parent]];
                i = parent;
            }
        }

        pop() {
            const items = this.items;
            if (items.length === 0) return null;
            const top = items[0];
            const last = items.pop();
            if (items.length > 0) {
                items[0] = last;
                let i = 0;
                for (;;) {
                    const l = 2 * i + 1;
                    const r = l + 1;
                    let min = i;
                    if (l < items.length && items[l].priority < items[min].priority) min = l;
                    if (r < items.length && items[r].priority < items[min].priority) min = r;
                    if (min === i) break;
                    [items[min], items[i]] = [items[i], items[min]];
                    i = min;
                }
            }
            return top;
        }
    }

    let nodes = new Map();   // id -> { id, name, lat, lng }
    let adj = new Map();     // id -> [{ to, weight }]  (adjacency list)

    const addEdge = (a, b) => {
        if (!nodes.has(a) || !nodes.has(b) || a === b) return;
        const weight = geo.distance(nodes.get(a), nodes.get(b));
        adj.get(a).push({ to: b, weight });
        adj.get(b).push({ to: a, weight });   // footpaths are two-way
    };

    /**
     * build(buildings, paths)
     *   buildings: [{ id, name, lat, lng }]
     *   paths: { junctions: { id: { name, lat, lng } }, edges: [[a, b], ...] }
     */
    const build = (buildings, paths = {}) => {
        nodes = new Map();
        adj = new Map();

        buildings.forEach((b) => nodes.set(b.id, { id: b.id, name: b.name, lat: b.lat, lng: b.lng }));
        Object.entries(paths.junctions || {}).forEach(([id, j]) =>
            nodes.set(id, { id, name: j.name, lat: j.lat, lng: j.lng, junction: true }));
        nodes.forEach((n, id) => adj.set(id, []));

        (paths.edges || []).forEach(([a, b]) => addEdge(a, b));
    };

    // linear search for the node closest to a point - O(V)
    const nearestNode = (point) => {
        let best = null;
        let bestDist = Infinity;
        nodes.forEach((n) => {
            const d = geo.distance(point, n);
            if (d < bestDist) {
                bestDist = d;
                best = n;
            }
        });
        return best ? { node: best, distance: bestDist } : null;
    };

    /**
     * Dijkstra's algorithm.
     * Returns { path: [node...], distance, visited } or null if unreachable.
     */
    const shortestPath = (fromId, toId) => {
        if (!nodes.has(fromId) || !nodes.has(toId)) return null;

        const dist = new Map([[fromId, 0]]);
        const prev = new Map();
        const done = new Set();
        const queue = new MinHeap();
        queue.push(fromId, 0);

        while (queue.size > 0) {
            const { value: u, priority: d } = queue.pop();
            if (done.has(u)) continue;          // stale queue entry
            done.add(u);
            if (u === toId) break;

            for (const { to, weight } of adj.get(u)) {
                const alt = d + weight;
                if (alt < (dist.has(to) ? dist.get(to) : Infinity)) {
                    dist.set(to, alt);
                    prev.set(to, u);
                    queue.push(to, alt);
                }
            }
        }

        if (!dist.has(toId)) return null;

        // walk back from the destination to build the path
        const path = [];
        for (let at = toId; at !== undefined; at = prev.get(at)) {
            path.unshift(nodes.get(at));
        }
        return { path, distance: dist.get(toId), visited: done.size };
    };

    // turn a node path into walking instructions
    const directions = (path) => {
        const steps = [];
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1];
            const b = path[i];
            const d = geo.distance(a, b);
            steps.push({
                text: `Walk ${geo.compass(geo.bearing(a, b))} to ${b.name}`,
                distance: geo.formatDistance(d)
            });
        }
        return steps;
    };

    return {
        MinHeap,
        build,
        nearestNode,
        shortestPath,
        directions,
        size: () => ({ nodes: nodes.size, edges: [...adj.values()].reduce((n, e) => n + e.length, 0) / 2 })
    };

})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CampusGraph;
}
