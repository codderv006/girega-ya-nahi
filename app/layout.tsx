import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, SITE_URL, TAGLINE } from "@/lib/config";

// Only what the UI actually uses: latin glyphs, two display weights. Mono is console-only, so no preload.
const baloo = Baloo_2({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-baloo", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${APP_NAME} · Parle-G survival predictor`,
  description: `How long will your Parle-G survive the chai? ${TAGLINE} Built on the Washburn equation and Ig Nobel–winning dunk physics.`,
  openGraph: { title: APP_NAME, description: "Biscuit ki zindagi, seconds mein.", images: ["/api/og?format=wide"] },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#D7263D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
