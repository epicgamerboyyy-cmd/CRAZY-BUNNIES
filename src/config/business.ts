/**
 * Everything business-specific lives here. Replace the sample values with the
 * real details, then set `isSample` to false to remove the sample-data notice.
 *
 * Do not add anything you can't stand behind: no made-up reviews, prices or claims.
 */

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
/** Opening windows as local "HH:MM" pairs. An empty array means closed. */
export type OpeningHours = Record<Weekday, Array<[open: string, close: string]>>;

export interface Service {
  /** Stable id used in URLs and stored on bookings. Don't change it once live. */
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  /** In rand. null hides the price. */
  priceZar: number | null;
}

export interface BusinessConfig {
  isSample: boolean;
  name: string;
  /** One plain sentence about what the business does, shown under the name. */
  summary: string;
  timezone: string;
  locale: string;
  contact: {
    phone: string | null;
    /** International format without +, e.g. 27821234567 */
    whatsapp: string | null;
    email: string | null;
  };
  address: { lines: string[]; mapUrl: string | null } | null;
  hours: OpeningHours;
  /** Specific dates the business is closed, as YYYY-MM-DD. */
  closedDates: string[];
  booking: {
    /** Gap between possible start times. */
    slotStepMinutes: number;
    /** Kept free before and after every appointment. */
    bufferMinutes: number;
    /** How soon a customer can book from now. */
    minNoticeMinutes: number;
    maxDaysAhead: number;
    /** Customers can cancel online until this long before the start. */
    cancelCutoffMinutes: number;
  };
  services: Service[];
}

export const business: BusinessConfig = {
  isSample: true,
  name: "Crazy Bunnies 2",
  summary: "Book your appointment online in under a minute. Pay in person when you arrive.",
  timezone: "Africa/Johannesburg",
  locale: "en-ZA",
  contact: { phone: null, whatsapp: null, email: null },
  address: null,
  hours: {
    mon: [["09:00", "17:00"]],
    tue: [["09:00", "17:00"]],
    wed: [["09:00", "17:00"]],
    thu: [["09:00", "17:00"]],
    fri: [["09:00", "17:00"]],
    sat: [["09:00", "13:00"]],
    sun: [],
  },
  closedDates: [],
  booking: {
    slotStepMinutes: 15,
    bufferMinutes: 10,
    minNoticeMinutes: 120,
    maxDaysAhead: 30,
    cancelCutoffMinutes: 12 * 60,
  },
  services: [
    {
      id: "sample-short",
      name: "Sample: short appointment",
      description: "Placeholder service. Replace with a real service name and description.",
      durationMinutes: 30,
      priceZar: null,
    },
    {
      id: "sample-standard",
      name: "Sample: standard appointment",
      description: "Placeholder service. Replace with a real service name and description.",
      durationMinutes: 60,
      priceZar: null,
    },
    {
      id: "sample-long",
      name: "Sample: long appointment",
      description: "Placeholder service. Replace with a real service name and description.",
      durationMinutes: 90,
      priceZar: null,
    },
  ],
};

export function getService(id: string): Service | undefined {
  return business.services.find((s) => s.id === id);
}
