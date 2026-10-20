import { NextResponse, type NextRequest } from "next/server";
import { getService, getStaff } from "@/config/business";
import { DatabaseNotConfiguredError } from "@/db";
import { ANY_STAFF, getAvailability } from "@/lib/bookings";
import { isDateString } from "@/lib/time";
import { logError } from "@/lib/request";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const serviceId = params.get("service") ?? "";
  const staffId = params.get("staff") || ANY_STAFF;
  const from = params.get("from") ?? "";
  const days = Math.min(Math.max(Number(params.get("days")) || 7, 1), 14);

  if (!getService(serviceId)) return NextResponse.json({ error: "Unknown service." }, { status: 400 });
  if (staffId !== ANY_STAFF && !getStaff(staffId)) return NextResponse.json({ error: "Unknown staff member." }, { status: 400 });
  if (!isDateString(from)) return NextResponse.json({ error: "Invalid date." }, { status: 400 });

  try {
    const result = await getAvailability(serviceId, staffId, from, days);
    return NextResponse.json({ days: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logError("availability", err);
    const message =
      err instanceof DatabaseNotConfiguredError
        ? "Online booking isn't switched on yet."
        : err instanceof Error && err.message.includes("doesn't do")
          ? "That person doesn't offer this service. Choose someone else or another service."
          : "Times couldn't be loaded.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
