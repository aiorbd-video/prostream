import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next"; // ১. ইম্পোর্ট করা হলো
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ratul-liv.vercel.app'),
  title: {
    default: "Ratul Liv - Live Sports & TV",
    template: "%s | Ratul Liv",
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
    icon: "/favicon.ico",
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
        url: "/og-image.jpg",
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
        <main className="min-h-screen flex flex-col">
           {children}
           {/* ২. এখানে কম্পোনেন্টটি যুক্ত করা হলো */}
           <SpeedInsights />
        </main>
      </body>
    </html>
  );
}
