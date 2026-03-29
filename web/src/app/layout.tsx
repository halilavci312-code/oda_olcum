import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Akıllı Ölçüm Sistemi",
  description: "Yapay zeka ile fotoğraftan duvar ve mobilya ölçülerini çıkarın.",
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.variable} antialiased bg-slate-950 text-slate-50`}>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
