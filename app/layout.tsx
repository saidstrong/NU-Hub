import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "NU Atrium",
    template: "%s | NU Atrium",
  },
  description: "Trusted campus network for participation, coordination, and student exchange at NU.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-wire-950`}>{children}</body>
    </html>
  );
}
