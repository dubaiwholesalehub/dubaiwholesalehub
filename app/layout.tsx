import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontHeading = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dubaiwholesalehub.com"),

  title: {
    default: "Dubai Wholesale Hub | Wholesale, Export & Sourcing",
    template: "%s | Dubai Wholesale Hub",
  },

  description:
    "Dubai Wholesale Hub connects international buyers with wholesale products, sourcing solutions and export services from Dubai, UAE.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://dubaiwholesalehub.com",
    siteName: "Dubai Wholesale Hub",
    title: "Dubai Wholesale Hub | Wholesale, Export & Sourcing",
    description:
      "Wholesale products, sourcing and export services from Dubai for international buyers.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Dubai Wholesale Hub",
    description: "Wholesale products, sourcing and export services from Dubai.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`bg-background ${fontSans.variable} ${fontHeading.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider>
          {children}

          <Toaster
            richColors
            closeButton
            position="top-right"
            duration={3000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
