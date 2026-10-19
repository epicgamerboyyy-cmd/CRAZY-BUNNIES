import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { business, getCategory, getService, getStaff, staffDoesService } from "@/config/business";
import { ANY_STAFF, lastBookableDate, todayLocal } from "@/lib/bookings";
import { BookingFlow } from "./BookingFlow";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: `Choose your stylist, service and time at ${business.name}. Pay at the salon.`,
  alternates: { canonical: "/book" },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; staff?: string; category?: string; slot?: string }>;
}) {
  const sp = await searchParams;
  const staff = sp.staff === ANY_STAFF ? ANY_STAFF : sp.staff && getStaff(sp.staff) ? sp.staff : null;
  const service = sp.service && getService(sp.service) ? sp.service : null;
  const member = staff && staff !== ANY_STAFF ? getStaff(staff)! : null;
  // Drop a service the chosen person doesn't do, rather than showing an impossible combination.
  const serviceOk = service && (!member || staffDoesService(member, getService(service)!)) ? service : null;
  const slot = serviceOk && staff && sp.slot && !Number.isNaN(Date.parse(sp.slot)) ? new Date(sp.slot).toISOString() : null;

  return (
    <BookingFlow
      initialStaffId={staff}
      initialServiceId={serviceOk}
      initialCategoryId={sp.category && getCategory(sp.category) ? sp.category : null}
      initialSlot={slot}
      today={todayLocal()}
      lastDate={lastBookableDate()}
      idempotencyKey={randomUUID()}
      cancelCutoffHours={Math.round(business.booking.cancelCutoffMinutes / 60)}
    />
  );
}
