import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { business, fullName } from "@/config/business";
import { siteUrl } from "@/lib/site";
import { instagramUrl } from "@/lib/contact";
import { ActionBar } from "@/components/ActionBar";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const fredoka = localFont({
  src: "../../node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2",
  variable: "--font-fredoka",
  weight: "300 700",
  display: "swap",
});

const nunito = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2", style: "normal" },
    { path: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});

const description = `${fullName} in Centurion. Braids, haircuts, kiddies styles, nails, makeup, lashes and installs for children and adults. Book online with your favourite stylist.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${fullName} | Kids & family hair salon in Centurion`, template: `%s | ${fullName}` },
  description,
  openGraph: { siteName: fullName, type: "website", locale: "en_ZA", description },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#fbf7f1" };

// Only facts the salon has published. Hours are left out until they're confirmed.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: fullName,
  url: siteUrl(),
  telephone: `+27${business.contact.phone.replace(/\D/g, "").replace(/^0/, "")}`,
  address: {
    "@type": "PostalAddress",
    streetAddress: business.address.lines[0],
    addressLocality: "Centurion",
    postalCode: "0157",
    addressRegion: "Gauteng",
    addressCountry: "ZA",
  },
  sameAs: business.contact.instagram ? [instagramUrl(business.contact.instagram)] : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${fredoka.variable} ${nunito.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {business.isSample && (
          <div className="sample-banner" role="note">
            <div className="wrap">Preview: team profiles, photos and opening hours are placeholders until the salon confirms them.</div>
          </div>
        )}
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <ActionBar />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
