import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionProvider } from "@/components/shared/MotionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JFT - J Fudge Trucking",
    template: "%s | JFT",
  },
  description:
    "Transportation Management System for J Fudge Trucking — aggregate hauling dispatch, delivery tracking, and invoicing.",
  applicationName: "JFT",
  appleWebApp: {
    capable: true,
    title: "JFT",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#F5E6D3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <MotionProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </MotionProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-surface-elevated)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            },
          }}
        />
      </body>
    </html>
  );
}
