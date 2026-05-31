import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { CapacitorBridge } from "@/components/capacitor-bridge";
import { AppSessionBridge } from "@/components/app-session-bridge";
import { SplashGate } from "@/components/splash-gate";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fit Finder — AI job-fit analysis",
  description:
    "Upload your resume, paste a job description, and get an instant qualification report with a global score and narrative breakdown.",
  appleWebApp: {
    capable: true,
    title: "Fit Finder",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000610",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-dvh">
        <CapacitorBridge />
        <AppSessionBridge />
        <SplashGate>{children}</SplashGate>
        <Toaster richColors />
      </body>
    </html>
  );
}
