import { captureError } from "@/lib/monitoring";

export type LatLng = { lat: number; lng: number };

/** Straight-line distance in km. Good enough for delivery-radius checks. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(h));
}

export function directionsUrl(destination: string | LatLng) {
  const target =
    typeof destination === "string"
      ? encodeURIComponent(destination)
      : `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${target}`;
}

export function staticEmbedUrl(query: string, apiKey?: string) {
  const key = apiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(query)}&zoom=15`;
}

/** Server-side geocoding. Returns null when unconfigured or on no result. */
export async function geocode(address: string): Promise<LatLng | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", key);

    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) return null;

    const json = (await response.json()) as {
      status: string;
      results?: { geometry: { location: LatLng } }[];
    };

    if (json.status !== "OK" || !json.results?.length) return null;
    return json.results[0].geometry.location;
  } catch (error) {
    captureError(error, { scope: "geocode", address });
    return null;
  }
}

/**
 * Can we deliver to `destination`? Falls back to postal-code zones when we
 * have no coordinates, and to "yes" when the restaurant has no location set —
 * refusing an order because of missing config would be worse than accepting it.
 */
export function withinDeliveryRadius(
  origin: LatLng | null,
  destination: LatLng | null,
  radiusKm: number,
): { ok: boolean; distanceKm: number | null } {
  if (!origin || !destination) return { ok: true, distanceKm: null };
  const distanceKm = haversineKm(origin, destination);
  return { ok: distanceKm <= radiusKm, distanceKm };
}
