import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zitron.pages.dev"),
  title: "Zitron",
  applicationName: "Zitron",
  description:
    "متجر Zitron للعناية بالبشرة والمنتجات الجلدية.",
  openGraph: {
    title: "Zitron",
    description: "متجر Zitron للعناية بالبشرة والمنتجات الجلدية.",
    url: "https://zitron.pages.dev",
    siteName: "Zitron",
    locale: "ar_PS",
    type: "website",
    images: [
      {
        url: "/images/zitron-logo.png",
        width: 1073,
        height: 1070,
        alt: "Zitron",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Zitron",
    description: "متجر Zitron للعناية بالبشرة والمنتجات الجلدية.",
    images: ["/images/zitron-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} antialiased`}>
      <body className="min-h-screen flex flex-col font-[var(--font-cairo)]">
        <CartProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </CartProvider>
      </body>
    </html>
  );
}
