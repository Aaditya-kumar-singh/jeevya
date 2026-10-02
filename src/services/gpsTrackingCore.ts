import type { GpsPoint } from '@/types/outdoorWorkout';

export function haversineKm(
  a: Pick<GpsPoint, 'latitude' | 'longitude'>,
  b: Pick<GpsPoint, 'latitude' | 'longitude'>,
) {
  const R = 6371;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function calculateRouteDistanceKm(route: GpsPoint[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i += 1) total += haversineKm(route[i - 1], route[i]);
  return total;
}

export function appendGpsPoint(route: GpsPoint[], point: GpsPoint): GpsPoint[] {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return route;
  if (Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) return route;
  if (point.accuracy != null && point.accuracy > 60) return route;

  const previous = route[route.length - 1];
  if (previous) {
    const jumpKm = haversineKm(previous, point);
    if (jumpKm * 1000 > 250 || point.timestamp <= previous.timestamp) return route;
  }

  return [...route, point];
}
