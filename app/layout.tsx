import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "NU Atrium Skeleton",
  description: "Low-fidelity campus app prototype",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <div className="mx-auto min-h-screen max-w-md bg-wire-950 shadow-[0_0_0_1px_rgba(38,44,52,0.65)]">
          {children}
        </div>
      </body>
    </html>
  );
}
