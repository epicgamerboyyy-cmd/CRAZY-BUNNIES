"use server";

import { z } from "zod";
import { business, getService, getStaff } from "@/config/business";
import { DatabaseNotConfiguredError } from "@/db";
import { FEEDBACK_KINDS } from "@/db/schema";
import { submitFeedback } from "@/lib/feedback";
import { isDateString, localDate } from "@/lib/time";
import { logError } from "@/lib/request";

export type FeedbackField = "kind" | "message" | "visitDate" | "contact";

export interface FeedbackFormState {
  ok?: { ref: string; wantsReply: boolean };
  formError?: string;
  fieldErrors?: Partial<Record<FeedbackField, string>>;
  values?: Record<string, string>;
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const schema = z
  .object({
    kind: z.enum(FEEDBACK_KINDS, { message: "Choose what your message is about." }),
    message: z
      .string()
      .trim()
      .min(10, "Tell us a little more, at least a sentence.")
      .max(2000, "Keep your message under 2000 characters."),
    visitDate: optional(10).refine((v) => !v || (isDateString(v) && v <= localDate(Date.now(), business.timezone)), {
      message: "Choose a date on or before today, or leave it empty.",
    }),
    staffId: optional(64).transform((v) => (v && getStaff(v) ? v : null)),
    serviceId: optional(64).transform((v) => (v && getService(v) ? v : null)),
    name: optional(80),
    wantsReply: z.string().optional().transform((v) => v === "on"),
    contact: optional(120),
  })
  .superRefine((d, ctx) => {
    if (!d.wantsReply) return;
    const c = d.contact ?? "";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
    const isPhone = /^\+?[\d\s()-]{9,20}$/.test(c) && c.replace(/\D/g, "").length >= 9;
    if (!isEmail && !isPhone) {
      ctx.addIssue({
        code: "custom",
        path: ["contact"],
        message: "Add a phone number or email so we can reply, or untick \"I'd like a reply\".",
      });
    }
  });

export async function sendFeedback(_prev: FeedbackFormState, formData: FormData): Promise<FeedbackFormState> {
  const keys = ["kind", "message", "visitDate", "staffId", "serviceId", "name", "contact", "wantsReply"] as const;
  const raw = Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")])) as Record<(typeof keys)[number], string>;
  const values = { ...raw };

  // Bots fill every field, people never see this one.
  if (String(formData.get("website") ?? "")) return { ok: { ref: "FB-RECEIVED", wantsReply: false } };

  const parsed = schema.safeParse({ ...raw, wantsReply: raw.wantsReply || undefined });
  if (!parsed.success) {
    const fieldErrors: FeedbackFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as FeedbackField;
      fieldErrors[key] ??= issue.message;
    }
    return { values, fieldErrors };
  }

  const d = parsed.data;
  try {
    const result = await submitFeedback({
      kind: d.kind,
      message: d.message,
      visitDate: d.visitDate,
      staffId: d.staffId,
      serviceId: d.serviceId,
      name: d.name,
      contact: d.wantsReply ? d.contact : null,
      wantsReply: d.wantsReply,
    });
    if (!result.ok) {
      return { values, formError: "You've sent several messages in the last hour. Please try again later, or call the salon." };
    }
    return { ok: { ref: result.ref, wantsReply: d.wantsReply } };
  } catch (err) {
    logError("feedback save", err);
    return {
      values,
      formError:
        err instanceof DatabaseNotConfiguredError
          ? "Feedback isn't switched on yet. Please call or WhatsApp the salon instead."
          : "Your message didn't send. Check your connection and try again.",
    };
  }
}
