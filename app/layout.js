import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from "next/font/google";
import "./globals.css";

// Font Optimization: 'swap' ensures text is visible immediately
const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Viewport Settings (Separated in Next.js 14+)
export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming issues on mobile player
};

// SEO Metadata
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ratul-liv.vercel.app'), // আপনার ডোমেইন এখানে দিন
  title: {
    default: "Ratul Liv - Live Sports & TV",
    template: "%s | Ratul Liv", // Child pages will inject title here
  },
  description: "Watch Live Sports, Cricket, Football, and Premium IPTV Channels for free on Ratul Liv.",
  keywords: ["Live Sports", "Cricket Live", "Football Streaming", "IPTV BD", "Ratul Liv", "Live TV"],
  authors: [{ name: "Ratul Liv" }],
  creator: "Ratul Liv",
  publisher: "Ratul Liv",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/favicon.ico", // public ফোল্ডারে আইকন থাকলে
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ratul-liv.vercel.app",
    siteName: "Ratul Liv",
    title: "Ratul Liv - Live Sports & TV",
    description: "Watch Live Sports, Cricket, Football, and IPTV Channels.",
    images: [
      {
        url: "/og-image.jpg", // public ফোল্ডারে একটি og-image.jpg রাখবেন (1200x630px)
        width: 1200,
        height: 630,
        alt: "Ratul Liv Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ratul Liv",
    description: "Watch Live Sports and TV Channels.",
    images: ["/og-image.jpg"],
    creator: "@ratulliv",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-black text-white antialiased selection:bg-[#ff0055] selection:text-white`}>
        {/* Main Content */}
        <main className="min-h-screen flex flex-col">
           {children}
        </main>
      </body>
    </html>
  );
}
