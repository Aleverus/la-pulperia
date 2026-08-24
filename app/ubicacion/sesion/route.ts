import { NextResponse } from "next/server";
import { withinSiguatepeque } from "@/lib/geo";
import {
  LOCATION_COOKIE,
  serializeSessionLocation,
} from "@/lib/session-location";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isLocationBody(body) || !withinSiguatepeque(body.lat, body.lng)) {
    return NextResponse.json({ error: "outside_coverage" }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: LOCATION_COOKIE,
    value: serializeSessionLocation(body),
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(LOCATION_COOKIE);
  return response;
}

function isLocationBody(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.lat === "number" &&
    Number.isFinite(body.lat) &&
    typeof body.lng === "number" &&
    Number.isFinite(body.lng)
  );
}
