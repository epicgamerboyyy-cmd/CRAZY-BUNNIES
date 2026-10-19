import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { business, getService } from "@/config/business";
import { lastBookableDate, todayLocal } from "@/lib/bookings";
import { BookingFlow } from "./BookingFlow";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: `Pick a service and a time at ${business.name}. Pay in person when you arrive.`,
  alternates: { canonical: "/book" },
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string; slot?: string }> }) {
  const { service, slot } = await searchParams;
  const initialService = service && getService(service) ? service : null;

  return (
    <BookingFlow
      services={business.services.map(({ id, name, description, durationMinutes, priceZar }) => ({
        id,
        name,
        description,
        durationMinutes,
        priceZar,
      }))}
      initialServiceId={initialService}
      initialSlot={initialService && slot && !Number.isNaN(Date.parse(slot)) ? new Date(slot).toISOString() : null}
      today={todayLocal()}
      lastDate={lastBookableDate()}
      idempotencyKey={randomUUID()}
      locale={business.locale}
      timezone={business.timezone}
      cancelCutoffHours={Math.round(business.booking.cancelCutoffMinutes / 60)}
    />
  );
}
