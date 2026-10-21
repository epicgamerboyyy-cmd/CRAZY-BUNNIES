# Crazy Bunnies Family Salon

Website and online booking for Crazy Bunnies, a family hair and beauty salon at Celtis Ridge Shopping Centre, Centurion. Visitors browse services, meet the team, see the gallery, and book a specific stylist at a real free time. The salon manages bookings from `/admin`, and they can sync to Google Calendar.

Next.js 16 (App Router), Postgres via Drizzle, deployed on Vercel.

## What's in it

- **Home** (`/`): hero with open-now status, everything the salon does, services with starting prices, the team, highlights, gallery preview, visit info with map and hours.
- **Services** (`/services`): full menu by category, starting prices, rough durations, who does each, and a Book button per service.
- **Team** (`/team`, `/team/<id>`): every stylist with a photo above their name. Each profile shows their days, what they do, their work, and books them directly.
- **Gallery** (`/gallery`): filter by category, full-screen viewer (keyboard and screen reader friendly).
- **Visit** (`/visit`): address, directions, open-now status, hours, map, call / WhatsApp / Instagram.
- **Booking** (`/book`): child or adult, stylist (or anyone available), service, day and time, details. Only genuinely free times for that person are shown. A stylist can never be double-booked: a Postgres exclusion constraint per stylist rejects overlaps even if two people book at the same moment. "Anyone available" assigns the least busy free stylist who does that service.
- **Booking page** (`/booking/<private link>`): confirmation with the stylist, one-tap "send to the salon on WhatsApp", add to calendar, print, cancel online until the cutoff.
- **Owner dashboard** (`/admin`): bookings by day, filter by stylist, child/adult tag, done / no-show / cancel, block time off for one person or the whole salon. Password protected with login rate limiting.
- On phones, a fixed Book / Call / Directions bar. Privacy notice (POPIA), 404 page, sitemap, robots, HairSalon structured data.

## Before going live

Everything business-specific is in **`src/config/business.ts`**. Contact details, address, services and starting prices come from the salon's previous site. Lines marked `CONFIRM` still need checking:

1. **Team**: replace the 14 sample profiles with real names, roles, short bios, which services each person does, and the days they work.
2. **Photos**:
   - Staff photos go in `public/team/` (portrait, roughly 4:5). Set `photo: "/team/name.jpg"`.
   - Hero and gallery photos go in `public/photos/`. Add each to `heroPhoto` or `gallery` with its width, height and a short description (`alt`) of what's in it.
   - Next.js resizes and compresses them automatically.
   - Right now the hero, "Inside the salon" and some gallery shots are stills from the salon's walkthrough video (`public/photos/salon-*.jpg`). They're real but low resolution, so replace them after a proper photo shoot.
   - Service cards, staff portraits and most gallery photos are **stock placeholders** from Unsplash, marked with a small "Sample" tag. Swap every `stock(...)` / `stockPortrait(...)` in `business.ts` for the salon's own photos before launch. Once none are left, the `images.unsplash.com` entry in `next.config.ts` can go.
3. **Opening hours**: the old site called its hours a placeholder. Confirm them.
4. **Durations**: booking slots are sized from each service's `durationMinutes`. These are estimates; get real times from the stylists.
5. **WhatsApp and Facebook**: confirm the WhatsApp number and add the Facebook page URL.
6. **Logo**: the bunny mark is a stand-in. The salon's real mark (the line-art face with a halo, on the feature wall) should replace it. Replace `BunnyMark` in `src/components/Icon.tsx` with the real logo file.

Then set `isSample: false` to remove the preview banner. Don't change a service or stylist `id` once real bookings exist.

Reviews and ratings are deliberately left off until there are real ones to show.

## Deploy on Vercel

1. Import this repo in Vercel.
2. **Storage → add Neon Postgres** and connect it to the project. That sets `DATABASE_URL`. Tables are created automatically on first request.
3. Add environment variables (see `.env.example`):
   - `ADMIN_PASSWORD`: the owner's dashboard password. At least 12 characters, or the dashboard stays locked. Changing it signs out every device.
   - `SESSION_SECRET`: 32+ random characters. Generate with
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `NEXT_PUBLIC_SITE_URL`: the real domain once you have one, e.g. `https://crazybunnies.co.za`
4. Redeploy.

Without `DATABASE_URL` on Vercel, booking shows "isn't switched on yet" instead of silently losing data.

## Google Calendar sync (optional)

1. In Google Cloud Console, create a project, enable the **Google Calendar API**, and create a **service account**. Create a JSON key for it.
2. In Google Calendar, open the salon's calendar settings → **Share with specific people** → add the service account's email with **Make changes to events**.
3. Copy the **Calendar ID** from the same settings page.
4. Set on Vercel:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` from the JSON
   - `GOOGLE_PRIVATE_KEY` = `private_key` from the JSON (keep the `\n` sequences)
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CALENDAR_BLOCKS_AVAILABILITY` = `true` only if busy time in that calendar should block the **whole team**

Every booking appears as an event named with the client, service and stylist. Cancellations remove it. If Google is down, bookings still go through and the dashboard shows which ones need "Send to calendar".

## Local development

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD and SESSION_SECRET
npm run dev
```

Without `DATABASE_URL`, it uses an embedded Postgres (PGlite) stored in `.data/`. Delete that folder to reset.

```bash
npm run check   # lint, typecheck, unit tests, production build
```

## Security and client data

- Booking links use 192-bit random codes, so one client can't find another's appointment.
- The dashboard login is rate limited per device and across the whole site, and sessions are tied to the current password.
- Bookings are limited per device (5 an hour, 10 a day) and per phone number (5 upcoming), with a hidden bot trap, so a script can't fill the diary.
- Server logs never include names, phone numbers or emails.
- Content Security Policy and HSTS are set in `next.config.ts`. Private booking pages send no referrer.
- Names, phone numbers, emails and notes are wiped `dataRetentionMonths` (12) after the appointment or feedback, when the owner next opens the dashboard.

## Not included yet

- Email or SMS confirmations to clients (needs a provider like Resend or an SMS gateway). For now clients get a confirmation page and can send it to the salon on WhatsApp.
- Online payments or deposits (pay at the salon was the brief).
- The owner adding walk-in or phone bookings from the dashboard (they can use the public booking page).
- A separate Google Calendar per stylist.
