import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

// Self-hosted by next/font, so html-to-image can embed them in the trophy PNG.
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "NNN Tracker",
  description: "30 days. Your friends are watching. Check in daily with Nutty, climb the leaderboard, earn the trophy.",
};

export const viewport: Viewport = {
  themeColor: "#FFF4DF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-dvh bg-cream font-sans text-ink antialiased">
        <div className="headband h-2.5 border-b-2 border-ink" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
