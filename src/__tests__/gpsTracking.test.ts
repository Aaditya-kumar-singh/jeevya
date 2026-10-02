import { appendGpsPoint, calculateRouteDistanceKm } from '@/services/gpsTrackingCore';

describe('gps tracking route math', () => {
  it('calculates distance for a short route', () => {
    const route = [
      { timestamp: 1, latitude: 28.6139, longitude: 77.2090 },
      { timestamp: 2, latitude: 28.6149, longitude: 77.2090 },
    ];
    const distance = calculateRouteDistanceKm(route);
    expect(distance).toBeGreaterThan(0.1);
    expect(distance).toBeLessThan(0.2);
  });

  it('rejects inaccurate points and large GPS jumps', () => {
    const route = [
      { timestamp: 1, latitude: 28.6139, longitude: 77.2090, accuracy: 10 },
    ];
    expect(appendGpsPoint(route, {
      timestamp: 2,
      latitude: 28.6140,
      longitude: 77.2090,
      accuracy: 100,
    })).toHaveLength(1);

    expect(appendGpsPoint(route, {
      timestamp: 2,
      latitude: 29.5,
      longitude: 77.2090,
      accuracy: 10,
    })).toHaveLength(1);
  });

  it('rejects stale points', () => {
    const route = [
      { timestamp: 100, latitude: 28.6139, longitude: 77.2090, accuracy: 10 },
    ];
    expect(appendGpsPoint(route, {
      timestamp: 99,
      latitude: 28.6140,
      longitude: 77.2090,
      accuracy: 10,
    })).toHaveLength(1);
  });
});
