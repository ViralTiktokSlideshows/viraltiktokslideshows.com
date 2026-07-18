import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";

import "../index.css";
import Providers from "@/components/providers";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const clashDisplay = localFont({
  src: [
    {
      path: "../assets/fonts/ClashDisplay/Fonts/WEB/fonts/ClashDisplay-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/ClashDisplay/Fonts/WEB/fonts/ClashDisplay-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/ClashDisplay/Fonts/WEB/fonts/ClashDisplay-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/ClashDisplay/Fonts/WEB/fonts/ClashDisplay-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-clash-display",
  display: "swap",
});

const SITE_NAME = "Viral TikTok Slideshows";
const SITE_DESCRIPTION =
  "Turn a single idea into a post-ready, viral TikTok slideshow — hook, slides, and images generated in about 30 seconds. See your hook slide free, unlock the full deck for $2.";

export const metadata: Metadata = {
  metadataBase: new URL("https://viraltiktokslideshows.com"),
  title: {
    template: `%s | ${SITE_NAME}`,
    default: `${SITE_NAME} — Turn Any Idea Into a Viral Slideshow`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "TikTok slideshow maker",
    "viral TikTok slideshows",
    "TikTok slideshow generator",
    "AI slideshow maker",
    "TikTok carousel maker",
    "AI TikTok content generator",
    "TikTok slide deck maker",
    "viral content generator",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Turn Any Idea Into a Viral Slideshow`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Turn Any Idea Into a Viral Slideshow`,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // RealFaviconGenerator's apple-mobile-web-app-title tag — the rest of its
  // output (favicon.ico, icon0.svg, icon1.png, apple-icon.png,
  // manifest.json in app/, web-app-manifest-*.png in public/) is picked up
  // automatically by Next's file-based metadata icon convention once those
  // files are dropped in place, no extra config needed here.
  appleWebApp: {
    title: SITE_NAME,
  },
};

// Site-level Organization schema — kept minimal and only using fields we
// can back with something real: no sameAs (the social icons in the footer
// aren't live profile links yet) and no logo (no square logo asset exists
// yet, just the inline BrandMark SVG). Add both once they're real.
const ORGANIZATION_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: "https://viraltiktokslideshows.com",
  description: SITE_DESCRIPTION,
  email: "support@viraltiktokslideshows.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${clashDisplay.variable} antialiased`}
      >
        {/* Google Analytics (gtag.js) — loaded once, site-wide. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>

        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, hand-authored JSON-LD, no user input */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_STRUCTURED_DATA) }}
        />
        <Providers>
          <div className="flex min-h-svh flex-col overflow-x-clip">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
