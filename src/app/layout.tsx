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
  title: "ZITRON | مختبر الأمراض الجلدية",
  description:
    "مرحباً بكم في نهج مخصص للعناية بالبشرة. كل فرد من العائلة، بغض النظر عن عمره، سيجد حلاً مناسباً يجمع بين الفعالية والجاذبية الحسية.",
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
