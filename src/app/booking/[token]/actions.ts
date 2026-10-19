"use server";

import { revalidatePath } from "next/cache";
import { canCustomerCancel, getBookingByToken, setBookingStatus } from "@/lib/bookings";

export interface CancelState {
  error?: string;
}

export async function cancelOwnBooking(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const token = String(formData.get("token") ?? "");
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "We couldn't find this booking." };
  if (booking.status === "cancelled") return {};
  if (!canCustomerCancel(booking)) {
    return { error: "It's too close to your appointment to cancel online. Please contact us directly." };
  }
  try {
    await setBookingStatus(booking.id, "cancelled", "customer");
  } catch (err) {
    console.error("[booking] cancel failed", err);
    return { error: "The cancellation didn't go through. Try again in a moment." };
  }
  revalidatePath(`/booking/${token}`);
  return {};
}
