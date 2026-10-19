"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { business, getStaff } from "@/config/business";
import { BOOKING_STATUSES, type BookingStatus } from "@/db/schema";
import {
  adminConfigError,
  clearFailedLogins,
  endSession,
  loginLockedFor,
  passwordMatches,
  recordFailedLogin,
  requireAdmin,
  startSession,
} from "@/lib/auth";
import {
  addBlock,
  bookingsOverlapping,
  getBookingById,
  removeBlock,
  setBookingStatus,
  syncBookingToCalendar,
} from "@/lib/bookings";
import { isDateString, isTimeString, makeFormatters, minutesOf, zonedTimeToUtc } from "@/lib/time";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const configError = adminConfigError();
  if (configError) return { error: `Admin isn't set up yet. ${configError}` };

  const locked = await loginLockedFor();
  if (locked) return { error: `Too many wrong attempts. Try again in ${locked} minute${locked === 1 ? "" : "s"}.` };

  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) {
    await recordFailedLogin();
    return { error: "That password isn't right." };
  }
  await clearFailedLogins();
  await startSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

export async function updateStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;
  if (!BOOKING_STATUSES.includes(status)) return;
  const booking = await getBookingById(id);
  if (!booking) return;
  await setBookingStatus(id, status, "owner");
  revalidatePath("/admin");
}

export async function retryCalendarSync(formData: FormData): Promise<void> {
  await requireAdmin();
  const booking = await getBookingById(String(formData.get("id") ?? ""));
  if (booking) await syncBookingToCalendar(booking);
  revalidatePath("/admin");
}

export interface BlockState {
  error?: string;
  success?: string;
  warning?: string;
}

const fmt = makeFormatters(business.locale, business.timezone);

export async function createBlock(_prev: BlockState, formData: FormData): Promise<BlockState> {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  const allDay = formData.get("allDay") === "on";
  const start = allDay ? "00:00" : String(formData.get("start") ?? "");
  const end = allDay ? "23:59" : String(formData.get("end") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 120) || null;
  const staffRaw = String(formData.get("staffId") ?? "");
  const staff = staffRaw ? getStaff(staffRaw) : null;
  if (staffRaw && !staff) return { error: "Choose who this block is for." };
  const staffId = staff?.id ?? null;

  if (!isDateString(date)) return { error: "Choose a date." };
  if (!isTimeString(start) || !isTimeString(end)) return { error: "Enter a start and end time, or tick whole day." };
  if (minutesOf(end) <= minutesOf(start)) return { error: "The end time must be after the start time." };

  const startsAt = new Date(zonedTimeToUtc(date, start, business.timezone));
  const endsAt = new Date(zonedTimeToUtc(date, end, business.timezone) + (allDay ? 60000 : 0));
  if (endsAt.getTime() < Date.now()) return { error: "That time has already passed." };

  await addBlock(startsAt, endsAt, reason, staffId);
  revalidatePath("/admin");

  const clashes = await bookingsOverlapping(startsAt, endsAt, staffId);
  const when = allDay ? fmt.calLong(date) : `${fmt.calLong(date)}, ${start} to ${end}`;
  const label = `${when} for ${staff ? staff.name : "the whole shop"}`;
  if (clashes.length) {
    return {
      success: `Blocked ${label}.`,
      warning: `${clashes.length} existing booking${clashes.length === 1 ? " is" : "s are"} still in that time. Cancel ${
        clashes.length === 1 ? "it" : "them"
      } below if needed.`,
    };
  }
  return { success: `Blocked ${label}.` };
}

export async function deleteBlock(formData: FormData): Promise<void> {
  await requireAdmin();
  await removeBlock(String(formData.get("id") ?? ""));
  revalidatePath("/admin");
}
