import { NextRequest, NextResponse } from "next/server";
import { minimizeCoordinates } from "../../../../lib/location/coordinates";

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
  const coordinates = minimizeCoordinates(
    request.nextUrl.searchParams.get("lat"),
    request.nextUrl.searchParams.get("lng"),
  );

  if (!coordinates) {
    return NextResponse.json(
      { error: "Geçerli konum bilgisi gerekli." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
      },
    );
  }

  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Adres çözümleme servisi yapılandırılmadı." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
      },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${coordinates.latitude},${coordinates.longitude}`);
  url.searchParams.set("language", "tr");
  url.searchParams.set("region", "tr");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json() as { status?: string; results?: GoogleGeocodeResult[]; error_message?: string };
  const result = payload.results?.[0];

  if (!response.ok || payload.status !== "OK" || !result) {
    return NextResponse.json(
      { error: "Konum adrese çevrilemedi. Adresi elle girebilirsin." },
      {
        status: 502,
        headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
      },
    );
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
  }, {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
