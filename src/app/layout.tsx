import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import {
  RuntimeEnvProvider,
  RuntimeEnvLoader,
} from "@/components/providers/RuntimeEnvProvider";
import { Toaster } from "@/components/ui/Toaster";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GlobalErrorHandler } from "@/components/error/GlobalErrorHandler";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "GNUS DAO - Decentralized Governance Platform",
    template: "%s | GNUS DAO",
  },
  description:
    "Enterprise-grade decentralized governance platform with quadratic voting, multi-chain support, and Diamond pattern smart contracts.",
  keywords: [
    "DAO",
    "governance",
    "quadratic voting",
    "blockchain",
    "Web3",
    "DeFi",
    "Ethereum",
    "Base",
    "Polygon",
    "SKALE",
    "Diamond pattern",
    "smart contracts",
  ],
  authors: [{ name: "Genius Ventures", url: "https://gnus.ai" }],
  creator: "Genius Ventures",
  publisher: "GNUS DAO",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://dao.gnus.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://dao.gnus.ai",
    title: "GNUS DAO - Decentralized Governance Platform",
    description:
      "Enterprise-grade decentralized governance platform with quadratic voting and multi-chain support.",
    siteName: "GNUS DAO",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GNUS DAO Governance Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GNUS DAO - Decentralized Governance Platform",
    description:
      "Enterprise-grade decentralized governance platform with quadratic voting and multi-chain support.",
    images: ["/og-image.png"],
    creator: "@GeniusVentures",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary
          level="page"
          showDetails={process.env.NODE_ENV === "development"}
        >
          <RuntimeEnvProvider>
            <RuntimeEnvLoader>
              <Providers>
                <GlobalErrorHandler />
                <div className="min-h-screen bg-background text-foreground flex flex-col">
                  <Header />
                  <main className="relative flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster />
              </Providers>
            </RuntimeEnvLoader>
          </RuntimeEnvProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
