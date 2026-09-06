export type Coordinates = {
  latitude: number;
  longitude: number;
};

const LOCATION_DECIMAL_PLACES = 4;

function coordinate(value: unknown, minimum: number, maximum: number) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "") {
    return null;
  }

  const parsed = typeof normalized === "number" ? normalized : Number(normalized);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }

  return Number(parsed.toFixed(LOCATION_DECIMAL_PLACES));
}

export function minimizeCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  const minimizedLatitude = coordinate(latitude, -90, 90);
  const minimizedLongitude = coordinate(longitude, -180, 180);

  if (minimizedLatitude === null || minimizedLongitude === null) {
    return null;
  }

  return {
    latitude: minimizedLatitude,
    longitude: minimizedLongitude,
  };
}
