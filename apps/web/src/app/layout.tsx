import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

import "../index.css";
import Providers from "@/components/providers";

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
  