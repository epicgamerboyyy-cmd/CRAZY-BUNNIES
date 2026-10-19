import { business } from "@/config/business";
import type { Booking } from "@/db/schema";
import { siteUrl } from "@/lib/site";
import type { IcsEvent } from "@/lib/ics";

export function customerEvent(b: Booking): IcsEvent {
  return {
    uid: `${b.id}@crazy-bunnies`,
    start: b.startsAt,
    end: b.endsAt,
    summary: `${b.serviceName} with ${b.staffName} at ${business.name}`,
    description: `Booking ref ${b.ref}. Manage or cancel: ${siteUrl()}/booking/${b.manageToken}`,
    location: business.address.lines.join(", "),
    cancelled: b.status === "cancelled",
  };
}
