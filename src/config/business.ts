/**
 * Everything business-specific lives here.
 *
 * Source: the salon's existing website (shared by the owner). Items marked
 * CONFIRM still need checking with the owner before launch. Staff are sample
 * profiles until real names and photos are added. Set `isSample` to false once
 * the staff, hours and photos are real.
 *
 * Photos: put files in /public/photos (hero, gallery) and /public/team (staff),
 * then reference them by path. See README > Photos.
 *
 * Do not add anything you can't stand behind: no made-up reviews, ratings or claims.
 */

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
/** Opening windows as local "HH:MM" pairs. An empty array means closed. */
export type OpeningHours = Record<Weekday, Array<[open: string, close: string]>>;

export type IconName = "braids" | "scissors" | "bunny" | "nails" | "makeup" | "lashes" | "leaf";

export interface Category {
  id: string;
  name: string;
  icon: IconName;
  /** One line shown on cards. */
  blurb: string;
  /** "From" price in rand, as shown on the menu. null hides it. */
  fromZar: number | null;
  /** Cover photo on the services cards. */
  photo?: Photo;
}

export interface Service {
  /** Stable id used in URLs and stored on bookings. Don't change it once live. */
  id: string;
  categoryId: string;
  name: string;
  /** CONFIRM: estimates. Booking slots are sized from this, so get real times from the stylists. */
  durationMinutes: number;
  /** In rand, if this item has its own price. Otherwise the category "from" price shows. */
  priceZar: number | null;
}

export interface StaffMember {
  /** Stable id used in URLs and stored on bookings. Don't change it once live. */
  id: string;
  name: string;
  role: string;
  categoryIds: string[];
  /** Limit to specific services. Omit to allow every service in their categories. */
  serviceIds?: string[];
  /** Path under /public, e.g. "/team/lerato.jpg". null shows initials instead. */
  photo: string | null;
  bio: string;
  /** Their own days/hours, inside the salon's hours. Omit to work all opening hours. */
  hours?: Partial<OpeningHours>;
}

export interface Photo {
  /** Path under /public, or an images.unsplash.com URL for a stock placeholder */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Stock placeholder, not the salon's own work. Shows a small "Sample" tag until replaced. */
  sample?: boolean;
}

/**
 * Stock placeholder from Unsplash (free for commercial use, no attribution needed).
 * Cropped server-side to an exact size so width/height are known up front.
 * Replace each one with the salon's own photo before launch.
 */
function stock(id: string, alt: string, width = 960, height = 1200, crop = "entropy"): Photo {
  return {
    src: `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=${crop}&w=${width}&h=${height}&q=80`,
    alt,
    width,
    height,
    sample: true,
  };
}

/** Stills from the salon's own walkthrough video. Real, but low resolution: swap for proper photos when there's a shoot. */
function salon(name: string, alt: string): Photo {
  return { src: `/photos/${name}.jpg`, alt, width: 464, height: 580 };
}

/** Placeholder headshot, cropped around the face. */
function stockPortrait(id: string): string {
  return stock(id, "", 640, 800, "faces").src;
}

const SALON = {
  mirrors: salon("salon-mirrors", "Styling stations with arched, gold-lit mirrors on a mint wall under a wavy LED-lit ceiling line"),
  reception: salon("salon-reception", "Reception desk with the Crazy Bunnies Salon sign between two gold-lit arched shelves"),
  floor: salon("salon-floor", "The long salon floor: a row of styling chairs and mirrors leading to the neon Crazy Bunnies sign"),
  lounge: salon("salon-lounge", "Waiting bench with olive velvet seat and cushions beside a slatted, softly lit wall"),
  logo: salon("salon-logo-wall", "The salon's glowing line-art logo on a slatted feature wall"),
  station: salon("salon-station", "A styling station with an arched mirror, mint shelving and a hairdryer ready"),
  wallpaper: salon("salon-wallpaper", "Botanical leaf wallpaper on the treatment room door"),
};

export interface GalleryItem extends Photo {
  categoryId: string;
  staffId?: string;
}

export interface Highlight {
  icon: IconName;
  title: string;
  body: string;
}

export const business = {
  isSample: true,
  /** Months after an appointment (or feedback) before names, numbers and notes are wiped. Shown in the privacy notice. */
  dataRetentionMonths: 12,
  name: "Crazy Bunnies",
  descriptor: "Family Salon",
  headline: ["Great hair.", "Every generation."],
  intro:
    "A modern family salon where children feel at ease and adults leave polished. Braids, cuts, nails, makeup, lashes and installations, all under one roof.",
  about: [
    "Crazy Bunnies is a Centurion-based salon created for the whole family. We believe every appointment should feel calm, thoughtful and enjoyable. Our Bunnies organic products are gentle enough for young clients while delivering polished care for adults too.",
    "From first haircuts to birthday glam, our stylists make the chair a happy place. We specialise in plaiting, haircuts, nails, makeup, lashes and installations, so it's all under one playful roof.",
  ],
  highlights: [
    { icon: "leaf", title: "Organic first", body: "We use our own Bunnies organic products: gentle, nourishing and made for kids' hair." },
    { icon: "bunny", title: "Caring stylists", body: "Patient, experienced stylists who make every visit a happy one." },
    { icon: "makeup", title: "Playful space", body: "A bright, fun salon that puts kids at ease from the moment they walk in." },
  ] as Highlight[],
  timezone: "Africa/Johannesburg",
  locale: "en-ZA",
  contact: {
    phone: "083 440 0484",
    /** CONFIRM: assumed to be the same number as the phone line. */
    whatsapp: "27834400484",
    email: null as string | null,
    instagram: "crazybunniessalon",
    /** CONFIRM: add the Facebook page URL. */
    facebook: null as string | null,
  },
  address: {
    lines: ["Shop 20B, Celtis Ridge Shopping Centre", "Centurion, 0157", "Gauteng, South Africa"],
    mapQuery: "Celtis Ridge Shopping Centre, Centurion",
  },
  /** CONFIRM: the old site labelled these as a placeholder schedule. */
  hours: {
    mon: [],
    tue: [["09:00", "17:00"]],
    wed: [["09:00", "17:00"]],
    thu: [["09:00", "17:00"]],
    fri: [["09:00", "17:00"]],
    sat: [["09:00", "15:00"]],
    sun: [],
  } as OpeningHours,
  closedDates: [] as string[],
  booking: {
    slotStepMinutes: 15,
    bufferMinutes: 10,
    minNoticeMinutes: 120,
    maxDaysAhead: 45,
    cancelCutoffMinutes: 12 * 60,
  },
  /** Shown big on the homepage. */
  heroPhoto: SALON.mirrors as Photo | null,
  /** Photos of the space itself, shown in the About section. */
  spacePhotos: [SALON.reception, SALON.floor] as Photo[],
  categories: [
    { id: "braids", name: "Plaiting & braids", icon: "braids", blurb: "Neat protective styles, modern braids and polished finishes for every age.", fromZar: 150, photo: stock("photo-1572955304332-bf714bd49add", "Woman with long braids in a patterned blouse", 960, 720) },
    { id: "cuts", name: "Haircuts", icon: "scissors", blurb: "Fresh cuts, trims and styling for children, women and men.", fromZar: 60, photo: stock("photo-1704072650662-76df3af134a7", "A young boy getting a haircut in a barber chair", 960, 720) },
    { id: "kiddies", name: "Kiddies styles", icon: "bunny", blurb: "Fun, cute styles and packages designed for our littlest clients.", fromZar: 90, photo: stock("photo-1646793328429-dfe89bef8604", "A little girl with two neat braids", 960, 720) },
    { id: "nails", name: "Nails", icon: "nails", blurb: "Classic colour and playful nail art for kids and adults.", fromZar: 50, photo: stock("photo-1632345031435-8727f6897d53", "Client having her nails done at a nail station", 960, 720) },
    { id: "makeup", name: "Makeup", icon: "makeup", blurb: "Polished makeup for birthdays, events and special days.", fromZar: 80, photo: stock("photo-1773688189414-7637b9b138e1", "Makeup artist applying blush to a client", 960, 720) },
    { id: "lashes", name: "Lashes & installs", icon: "lashes", blurb: "Careful lash, wig and extension installations tailored to you.", fromZar: 120, photo: stock("photo-1589710751893-f9a6770ad71b", "Technician applying eyelash extensions with tweezers", 960, 720) },
    { id: "treatments", name: "Organic treatments", icon: "leaf", blurb: "Hair treatments using our own Bunnies organic products.", fromZar: 100, photo: stock("photo-1695527081848-1e46c06e6458", "Client having her hair done in a salon chair", 960, 720) },
  ] as Category[],
  services: [
    { id: "cornrows", categoryId: "braids", name: "Cornrows", durationMinutes: 90, priceZar: null },
    { id: "box-braids", categoryId: "braids", name: "Box braids", durationMinutes: 240, priceZar: null },
    { id: "kiddies-braids", categoryId: "braids", name: "Kiddies braids", durationMinutes: 120, priceZar: null },
    { id: "goddess-braids", categoryId: "braids", name: "Goddess braids", durationMinutes: 240, priceZar: null },
    { id: "boys-cut", categoryId: "cuts", name: "Boys cut & line-up", durationMinutes: 30, priceZar: null },
    { id: "girls-trim", categoryId: "cuts", name: "Girls trim", durationMinutes: 30, priceZar: null },
    { id: "first-haircut", categoryId: "cuts", name: "First haircut", durationMinutes: 30, priceZar: null },
    { id: "edge-up", categoryId: "cuts", name: "Edge-up", durationMinutes: 15, priceZar: null },
    { id: "beads-bobbles", categoryId: "kiddies", name: "Beads & bobbles", durationMinutes: 60, priceZar: null },
    { id: "bun-styles", categoryId: "kiddies", name: "Bun styles", durationMinutes: 45, priceZar: null },
    { id: "party-package", categoryId: "kiddies", name: "Party package", durationMinutes: 90, priceZar: null },
    { id: "wash-style", categoryId: "kiddies", name: "Wash & style", durationMinutes: 45, priceZar: null },
    { id: "kids-manicure", categoryId: "nails", name: "Kids manicure", durationMinutes: 30, priceZar: null },
    { id: "nail-art", categoryId: "nails", name: "Nail art", durationMinutes: 45, priceZar: null },
    { id: "paint-glitter", categoryId: "nails", name: "Paint & glitter", durationMinutes: 20, priceZar: null },
    { id: "toes", categoryId: "nails", name: "Toes", durationMinutes: 30, priceZar: null },
    { id: "birthday-glam", categoryId: "makeup", name: "Birthday glam", durationMinutes: 45, priceZar: null },
    { id: "face-sparkle", categoryId: "makeup", name: "Face sparkle", durationMinutes: 20, priceZar: null },
    { id: "special-occasion", categoryId: "makeup", name: "Special occasion", durationMinutes: 60, priceZar: null },
    { id: "lashes", categoryId: "lashes", name: "Lashes", durationMinutes: 60, priceZar: null },
    { id: "wig-install", categoryId: "lashes", name: "Wig install", durationMinutes: 90, priceZar: null },
    { id: "extension-install", categoryId: "lashes", name: "Extension install", durationMinutes: 120, priceZar: null },
    { id: "install-styling", categoryId: "lashes", name: "Styling", durationMinutes: 45, priceZar: null },
    { id: "deep-condition", categoryId: "treatments", name: "Deep condition", durationMinutes: 45, priceZar: null },
    { id: "scalp-treatment", categoryId: "treatments", name: "Scalp treatment", durationMinutes: 30, priceZar: null },
    { id: "steam-treatment", categoryId: "treatments", name: "Steam treatment", durationMinutes: 45, priceZar: null },
  ] as Service[],
  /** Sample team: stock portraits stand in until each person's real photo goes in /public/team. Replace with real names, roles, photos and the services each person does. */
  staff: [
    { id: "stylist-1", name: "Stylist 1", role: "Braids specialist", categoryIds: ["braids", "kiddies", "treatments"], photo: stockPortrait("photo-1754844362137-88441eb7cc6f"), bio: "Sample profile. Add their name, photo and a line about what they love doing." },
    { id: "stylist-2", name: "Stylist 2", role: "Braids specialist", categoryIds: ["braids", "kiddies"], photo: stockPortrait("photo-1764265150663-e58dcfc03252"), bio: "Sample profile. Add their name, photo and a line about what they love doing.", hours: { tue: [] } },
    { id: "stylist-3", name: "Stylist 3", role: "Kids stylist", categoryIds: ["kiddies", "cuts", "treatments"], photo: stockPortrait("photo-1643956740911-62c19a5405f0"), bio: "Sample profile. Add their name, photo and a line about what they love doing." },
    { id: "stylist-4", name: "Stylist 4", role: "Stylist", categoryIds: ["braids", "cuts", "lashes"], photo: stockPortrait("photo-1613099084406-4b9140fc780a"), bio: "Sample profile. Add their name, photo and a line about what they love doing." },
    { id: "stylist-5", name: "Stylist 5", role: "Install specialist", categoryIds: ["lashes", "treatments"], serviceIds: ["wig-install", "extension-install", "install-styling", "deep-condition", "scalp-treatment", "steam-treatment"], photo: stockPortrait("photo-1531927557220-a9e23c1e4794"), bio: "Sample profile. Add their name, photo and a line about what they love doing.", hours: { wed: [] } },
    { id: "barber-1", name: "Barber 1", role: "Barber", categoryIds: ["cuts"], photo: stockPortrait("photo-1668752741330-8adc5cef7485"), bio: "Sample profile. Add their name, photo and a line about what they love doing." },
    { id: "nails-1", name: "Nail tech 1", role: "Nail technician", categoryIds: ["nails"], photo: stockPortrait("photo-1619718908820-5c1de14e0b7e"), bio: "Sample profile. Add their name, photo and a line about what they love doing." },
    { id: "nails-2", name: "Nail tech 2", role: "Nail technician", categoryIds: ["nails"], photo: stockPortrait("photo-1616166183781-0fdd2ef83374"), bio: "Sample profile. Add their name, photo and a line about what they love doing.", hours: { thu: [] } },
    { id: "makeup-1", name: "Makeup artist 1", role: "Makeup & lash artist", categoryIds: ["makeup", "lashes"], serviceIds: ["birthday-glam", "face-sparkle", "special-occasion", "lashes"], photo: stockPortrait("photo-1594465919760-441fe5908ab0"), bio: "Sample profile. Add their name, photo and a line about what they love doing." },
    { id: "makeup-2", name: "Makeup artist 2", role: "Makeup artist", categoryIds: ["makeup"], photo: stockPortrait("photo-1681597108168-353c13e8e7a5"), bio: "Sample profile. Add their name, photo and a line about what they love doing.", hours: { tue: [], wed: [] } },
  ] as StaffMember[],
  /** Real salon stills plus stock samples. Replace the samples with the salon's own work. */
  gallery: [
    { ...SALON.mirrors, categoryId: "salon" },
    { ...stock("photo-1774773132862-8434afac1738", "Braids finished with colourful beads"), categoryId: "braids" },
    { ...stock("photo-1607779097040-26e80aa78e66", "Mauve, white and silver glitter nails", 960, 960), categoryId: "nails" },
    { ...stock("photo-1703792685152-d13e206924d8", "Barber cutting a young boy's hair", 960, 960), categoryId: "cuts" },
    { ...SALON.reception, categoryId: "salon" },
    { ...stock("photo-1586226201624-2d7f3101598b", "Girl with a pink and green hair clip", 960, 960), categoryId: "kiddies" },
    { ...stock("photo-1673470907547-1c0c6a996095", "Neat cornrows"), categoryId: "braids" },
    { ...stock("photo-1709477542149-f4e0e21d590b", "Makeup being applied with a brush", 960, 960), categoryId: "makeup" },
    { ...SALON.lounge, categoryId: "salon" },
    { ...stock("photo-1674049406467-824ea37c7184", "Eyelash extensions being applied", 960, 960), categoryId: "lashes" },
    { ...stock("photo-1634315775834-3e1ac73de6b6", "Styled wigs ready for installation"), categoryId: "lashes" },
    { ...SALON.floor, categoryId: "salon" },
    { ...stock("photo-1481385694031-f2b14f8621d5", "Close-up of fresh braids", 960, 960), categoryId: "braids" },
    { ...stock("photo-1610992015762-45dca7fa3a85", "Soft pink manicure"), categoryId: "nails" },
    { ...SALON.logo, categoryId: "salon" },
    { ...SALON.station, categoryId: "salon" },
  ] as GalleryItem[],
};

/** Gallery-only filter for photos of the space itself. */
export const SALON_CATEGORY: Category = { id: "salon", name: "The salon", icon: "leaf", blurb: "", fromZar: null };

export type BusinessConfig = typeof business;

export const CLIENT_TYPES = [
  { id: "child", label: "Child" },
  { id: "adult", label: "Adult" },
] as const;
export type ClientType = (typeof CLIENT_TYPES)[number]["id"];

export function getService(id: string): Service | undefined {
  return business.services.find((s) => s.id === id);
}

export function getStaff(id: string): StaffMember | undefined {
  return business.staff.find((s) => s.id === id);
}

export function getCategory(id: string): Category | undefined {
  return business.categories.find((c) => c.id === id);
}

export function servicesIn(categoryId: string): Service[] {
  return business.services.filter((s) => s.categoryId === categoryId);
}

export function staffDoesService(staff: StaffMember, service: Service): boolean {
  if (!staff.categoryIds.includes(service.categoryId)) return false;
  return !staff.serviceIds || staff.serviceIds.includes(service.id);
}

export function staffForService(serviceId: string): StaffMember[] {
  const service = getService(serviceId);
  return service ? business.staff.filter((s) => staffDoesService(s, service)) : [];
}

export function servicesForStaff(staffId: string): Service[] {
  const staff = getStaff(staffId);
  return staff ? business.services.filter((s) => staffDoesService(staff, s)) : [];
}

/** Working hours for one person: the salon's hours, narrowed by their own. */
export function hoursFor(staff: StaffMember): OpeningHours {
  return { ...business.hours, ...staff.hours } as OpeningHours;
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => (/^\d+$/.test(w) ? w : w[0]!.toUpperCase()))
    .join("");
}

export const fullName = `${business.name} ${business.descriptor}`;
