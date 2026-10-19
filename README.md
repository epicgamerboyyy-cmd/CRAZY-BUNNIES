# Crazy Bunnies 2

Appointment booking site. Customers pick a service and a free time, leave their name and number, and pay in person. The owner manages everything from `/admin`, and bookings can sync to Google Calendar.

Next.js 16 (App Router), Postgres via Drizzle, deployed on Vercel.

## What's in it

- **Home** (`/`): live "next open times", services, how booking works, opening hours, contact details (only the ones you fill in).
- **Booking** (`/book`): service, day and time, details. Only genuinely free times are shown. Two people can't book the same time: a Postgres exclusion constraint rejects overlaps even if requests race, and double-clicking submit can't create two bookings.
- **Booking page** (`/booking/<private link>`): confirmation, add to calendar (.ics or Google), print, cancel online until the cutoff.
- **Owner dashboard** (`/admin`): bookings by day, mark done / no-show / cancel, block time off, calendar sync status. Password protected, with login rate limiting.
- Privacy notice (POPIA), 404 page, sitemap, robots, favicon.

## Before going live: fill in the business details

Everything business-specific is in **`src/config/business.ts`**: name, one-line summary, phone/WhatsApp/email, address, opening hours, closed dates, booking rules (notice period, buffer, how far ahead, cancel cutoff) and services (name, description, duration, price).

Services, hours and contact details are sample data right now, and the site shows a "setup in progress" banner. Replace them, then set `isSample: false`.

Don't change a service's `id` once real bookings exist.

## Deploy on Vercel

1. Import this repo in Vercel.
2. **Storage → add Neon Postgres** and connect it to the project. That sets `DATABASE_URL`. Tables are created automatically on first request.
3. Add environment variables (see `.env.example`):
   - `ADMIN_PASSWORD`: the owner's dashboard password. Make it long.
   - `SESSION_SECRET`: 32+ random characters. Generate with
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `NEXT_PUBLIC_SITE_URL`: the real domain once you have one, e.g. `https://example.co.za`
4. Redeploy.

Without `DATABASE_URL` on Vercel, booking shows "isn't switched on yet" instead of silently losing data.

## Google Calendar sync (optional)

1. In Google Cloud Console, create a project, enable the **Google Calendar API**, and create a **service account**. Create a JSON key for it.
2. In Google Calendar, open the owner's calendar settings → **Share with specific people** → add the service account's email with **Make changes to events**.
3. Copy the **Calendar ID** from the same settings page.
4. Set on Vercel:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` from the JSON
   - `GOOGLE_PRIVATE_KEY` = `private_key` from the JSON (keep the `\n` sequences)
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CALENDAR_BLOCKS_AVAILABILITY` = `true` if busy events in that calendar should block booking slots

New bookings appear as events, cancellations remove them. If Google is down, bookings still go through and the dashboard shows which ones need "Send to calendar".

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

## Not included yet

- Email or SMS confirmations to customers (needs a provider like Resend or an SMS gateway).
- Online payments or deposits (pay in person was the brief).
- Owner adding phone-in bookings from the dashboard (they can use the public booking page for now).
- Multiple staff members with separate calendars (it's one appointment at a time).
