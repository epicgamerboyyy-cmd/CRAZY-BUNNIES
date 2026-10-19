import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { business } from "@/config/business";
import { siteUrl } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const bricolage = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const atkinson = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-atkinson",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${business.name}: book an appointment`, template: `%s | ${business.name}` },
  description: business.summary,
  openGraph: { siteName: business.name, type: "website", locale: business.locale.replace("-", "_") },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#f3f4ef" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={business.locale} className={`${bricolage.variable} ${atkinson.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {business.isSample && (
          <div className="sample-banner" role="note">
            <div className="wrap">
              Setup in progress: services, hours and contact details on this site are sample data.
            </div>
          </div>
        )}
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
