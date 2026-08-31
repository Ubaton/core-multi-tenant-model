import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next"
import { Geist_Mono, Nunito_Sans } from "next/font/google";
import { QueryProvider } from "@/lib/client";
import { ThemeProvider } from "@/context";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Body/UI face. `display: swap` keeps text readable while the font loads.
const nunitoSans = Nunito_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Tabular/monospace face for IDs, amounts and timestamps.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Church Management System",
  description: "A multi-tenant church management system",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunitoSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
