export class LocatationUtilities {
  static getDistanceBetweenPoints({
    lat1,
    lon1,
    lat2,
    lon2,
  }: {
    lat1: number;
    lon1: number;
    lat2: number;
    lon2: number;
  }): number {
    const R = 6371e3; // Radius of the Earth in meters
    const φ1 = (lat1 * Math.PI) / 180; // φ in radians
    const φ2 = (lat2 * Math.PI) / 180; // φ in radians
    const Δφ = ((lat2 - lat1) * Math.PI) / 180; // Δφ in radians
    const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Δλ in radians

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
  static getMidpoint({
    lat1,
    lon1,
    lat2,
    lon2,
  }: {
    lat1: number;
    lon1: number;
    lat2: number;
    lon2: number;
  }): { latitude: number; longitude: number } {
    const midLat = (lat1 + lat2) / 2;
    const midLon = (lon1 + lon2) / 2;
    return { latitude: midLat, longitude: midLon };
  }
  static isWithinRadius({
    lat1,
    lon1,
    lat2,
    lon2,
    radius,
  }: {
    lat1: number;
    lon1: number;
    lat2: number;
    lon2: number;
    radius: number;
  }): boolean {
    const distance = this.getDistanceBetweenPoints({ lat1, lon1, lat2, lon2 });
    if (Number.isNaN(distance)) {
      console.log('No Location found for distance calculation');
      return true; // If we can't calculate the distance, assume true
    }
    console.log(`Distance: ${distance} meters, Radius: ${radius} meters`);
    return distance <= radius;
  }
  static getBearing({
    lat1,
    lon1,
    lat2,
    lon2,
  }: {
    lat1: number;
    lon1: number;
    lat2: number;
    lon2: number;
  }): number {
    debugger;
    const φ1 = (lat1 * Math.PI) / 180; // φ in radians
    const φ2 = (lat2 * Math.PI) / 180; // φ in radians
    const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Δλ in radians

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return (θ * 180) / Math.PI; // Convert to degrees
  }
}
