import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, DM_Sans, Manrope } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-price",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Tahanan ng Kapayapaan | Memorial Chapels, Crematory & Service Coordination",
  description:
    "Thoughtful funeral arrangements, 100% itemized PHP pricing, serene chapel coordination, and RA 10173 privacy protection in Quezon City, Philippines.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${manrope.variable}`}
    >
      <body className="min-h-screen bg-[#F6F1E8] text-[#242522] font-sans antialiased selection:bg-[#183B35] selection:text-[#F6F1E8]">
        {children}
      </body>
    </html>
  );
}
