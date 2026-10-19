import { getBookingByToken } from "@/lib/bookings";
import { buildIcs } from "@/lib/ics";
import { customerEvent } from "../event";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await getBookingByToken(token);
  if (!booking) return new Response("Booking not found", { status: 404 });
  return new Response(buildIcs(customerEvent(booking)), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment-${booking.ref}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
