import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ClarityScript } from "@/shared/analytics/ClarityScript";

export const metadata: Metadata = {
  title: "FlashHook | Free Webhook Sandbox",
  description:
    "Test, inspect, and debug webhooks instantly without an account. FlashHook provides 1-second webhook URLs with real-time logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ClarityScript clarityId={clarityId} />
      </body>
    </html>
  );
}
