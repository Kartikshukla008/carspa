import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "CARSPA | Doorstep Detailing - Cleaner Cars, Happier Journeys",
  description:
    "Professional car washing and detailing at your home or office in Chandigarh, Mohali, Panchkula. Convenient doorstep service, transparent pricing, and zero scratches guaranteed.",
  icons: {
    icon: "/carspa-icon.png",
    shortcut: "/carspa-icon.png",
    apple: "/carspa-icon.png",
  },
  keywords: [
    "CARSPA",
    "CARSPA Doorstep Detailing",
    "car wash Chandigarh",
    "car wash Mohali",
    "car wash Panchkula",
    "doorstep car wash",
    "home car wash",
    "mobile car detailing",
  ],
  openGraph: {
    title: "CARSPA - Cleaner Cars, Happier Journeys",
    description: "Book doorstep car washing in Chandigarh, Mohali & Panchkula with live slot availability.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-sky-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
