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
  title: "Meridian — Premium Corporate Solutions",
  description:
    "A modern, premium corporate platform delivering trusted advisory and strategic solutions.",
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