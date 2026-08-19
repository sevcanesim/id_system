import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
};

function component(components: GoogleAddressComponent[] | undefined, ...types: string[]) {
  return components?.find((entry) => types.some((type) => entry.types.includes(type)))?.long_name ?? "";
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Geçerli konum bilgisi gerekli." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "Adres çözümleme servisi yapılandırılmadı.",
      latitude,
      longitude,
      mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    }, { status: 503 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${latitude},${longitude}`);
  url.searchParams.set("language", "tr");
  url.searchParams.set("region", "tr");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json() as { status?: string; results?: GoogleGeocodeResult[]; error_message?: string };
  const result = payload.results?.[0];

  if (!response.ok || payload.status !== "OK" || !result) {
    return NextResponse.json({
      error: payload.error_message || "Konum adrese çevrilemedi. Adresi elle girebilirsin.",
      latitude,
      longitude,
      mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    }, { status: 502 });
  }

  const components = result.address_components;
  const city = component(components, "administrative_area_level_1");
  const district = component(components, "administrative_area_level_2", "sublocality_level_1", "locality");
  const postalCode = component(components, "postal_code");

  return NextResponse.json({
    addressLine: result.formatted_address ?? "",
    city,
    district,
    postalCode,
    latitude,
    longitude,
    mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
  });
}
