import { NextResponse, type NextRequest } from "next/server";
import { getService } from "@/config/business";
import { DatabaseNotConfiguredError } from "@/db";
import { getAvailability } from "@/lib/bookings";
import { isDateString } from "@/lib/time";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const serviceId = params.get("service") ?? "";
  const from = params.get("from") ?? "";
  const days = Math.min(Math.max(Number(params.get("days")) || 7, 1), 14);

  if (!getService(serviceId)) return NextResponse.json({ error: "Unknown service." }, { status: 400 });
  if (!isDateString(from)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });

  try {
    const result = await getAvailability(serviceId, from, days);
    return NextResponse.json({ days: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[availability]", err);
    const message =
      err instanceof DatabaseNotConfiguredError
        ? "Online booking isn't switched on yet."
        : "Times couldn't be loaded.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
