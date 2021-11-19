const Geo = require('../www/js/geo');

describe('Geo', () => {

    test('distance between the same point is 0', () => {
        const p = { lat: 27.084309, lng: 93.605673 };
        expect(Geo.distance(p, p)).toBe(0);
    });

    test('Haversine distance matches a known value', () => {
        // one thousandth of a degree of latitude is about 111 m anywhere on Earth
        const a = { lat: 27.084, lng: 93.605 };
        const b = { lat: 27.085, lng: 93.605 };
        expect(Geo.distance(a, b)).toBeCloseTo(111.2, 0);
    });

    test('distance is symmetric', () => {
        const a = { lat: 27.0837, lng: 93.6056 };
        const b = { lat: 27.0856, lng: 93.6062 };
        expect(Geo.distance(a, b)).toBeCloseTo(Geo.distance(b, a), 6);
    });

    test('bearing and compass direction', () => {
        const c = { lat: 27.0843, lng: 93.6057 };
        expect(Geo.compass(Geo.bearing(c, { lat: 27.0853, lng: 93.6057 }))).toBe('north');
        expect(Geo.compass(Geo.bearing(c, { lat: 27.0843, lng: 93.6067 }))).toBe('east');
        expect(Geo.compass(Geo.bearing(c, { lat: 27.0833, lng: 93.6057 }))).toBe('south');
        expect(Geo.compass(Geo.bearing(c, { lat: 27.0843, lng: 93.6047 }))).toBe('west');
    });

    test('formatting', () => {
        expect(Geo.formatDistance(85.4)).toBe('85 m');
        expect(Geo.formatDistance(1530)).toBe('1.5 km');
        expect(Geo.walkTime(20)).toBe('< 1 min');
        expect(Geo.walkTime(780)).toBe('10 min');
    });
});
