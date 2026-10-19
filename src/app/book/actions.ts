"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createBooking, syncBookingToCalendar } from "@/lib/bookings";

export interface BookingFormState {
  formError?: string;
  slotTaken?: boolean;
  fieldErrors?: Partial<Record<"customerName" | "phone" | "email" | "notes", string>>;
  values?: { customerName: string; phone: string; email: string; notes: string };
}

const schema = z.object({
  serviceId: z.string().min(1).max(64),
  staffId: z.string().min(1).max(64),
  startsAt: z.iso.datetime(),
  clientType: z.enum(["child", "adult"]),
  idempotencyKey: z.string().min(16).max(64),
  customerName: z.string().trim().min(2, "Enter the name the booking is under.").max(80, "Keep your name under 80 characters."),
  phone: z
    .string()
    .trim()
    .refine((v) => /^\+?[\d\s()-]{9,20}$/.test(v) && v.replace(/\D/g, "").length >= 9, {
      message: "Enter a phone number we can reach you on, like 082 123 4567.",
    }),
  email: z.union([z.literal(""), z.email("Enter a valid email address, or leave it empty.").max(120)]),
  notes: z.string().trim().max(500, "Keep notes under 500 characters."),
});

export async function submitBooking(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const raw = Object.fromEntries(
    ["serviceId", "staffId", "startsAt", "clientType", "idempotencyKey", "customerName", "phone", "email", "notes"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  const values = { customerName: raw.customerName!, phone: raw.phone!, email: raw.email!, notes: raw.notes! };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: BookingFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "customerName" || key === "phone" || key === "email" || key === "notes") {
        fieldErrors[key] ??= issue.message;
      }
    }
    if (!Object.keys(fieldErrors).length) {
      return { values, formError: "Choose a service and a time before booking." };
    }
    return { values, fieldErrors };
  }

  const d = parsed.data;
  let token: string;
  try {
    const result = await createBooking({
      serviceId: d.serviceId,
      staffId: d.staffId,
      startsAt: new Date(d.startsAt),
      clientType: d.clientType,
      customerName: d.customerName,
      phone: d.phone,
      email: d.email || null,
      notes: d.notes || null,
      idempotencyKey: d.idempotencyKey,
    });
    if (!result.ok) {
      return result.reason === "slot_unavailable"
        ? { values, slotTaken: true, formError: "That time was just taken. Pick another time and book again." }
        : result.reason === "unknown_staff"
          ? { values, formError: "That person doesn't offer this service. Choose someone else." }
          : { values, formError: "That service isn't available any more. Choose another service." };
    }
    const booking = result.booking;
    token = booking.manageToken;
    // Calendar sync runs after the response so the customer isn't kept waiting on Google.
    after(() => syncBookingToCalendar(booking));
  } catch (err) {
    console.error("[booking] create failed", err);
    return { values, formError: "The booking didn't go through. Check your connection and try again." };
  }
  redirect(`/booking/${token}?new=1`);
}
