import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Outfit, Space_Grotesk } from "next/font/google";

/**
 * Theme preview shell.
 *
 * Loads the candidate typefaces for directions B and C. Once a direction is
 * chosen, the two that lose are removed along with this whole route.
 */

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "UI direction preview",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${outfit.variable} ${inter.variable} ${spaceGrotesk.variable}`}>
      {children}
    </div>
  );
}
