import { business } from "@/config/business";

export function whatsappLink(number: string, text?: string): string {
  const n = number.replace(/\D/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const directionsUrl = () =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.address.mapQuery)}`;

export const mapUrl = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address.mapQuery)}`;

/** Keyless Google Maps embed. Loaded lazily in an iframe. */
export const mapEmbedUrl = () => `https://www.google.com/maps?q=${encodeURIComponent(business.address.mapQuery)}&output=embed`;

export const instagramUrl = (handle: string) => `https://www.instagram.com/${handle}/`;
