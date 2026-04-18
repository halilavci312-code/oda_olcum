import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Akıllı Ölçüm Sistemi",
  description: "Yapay zeka ile fotoğraftan duvar ve mobilya ölçülerini çıkarın.",
};

import { Toaster } from "sonner";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased min-h-screen bg-background text-foreground transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>

        <Script
          id="n8n-chat-script"
          type="module"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
              createChat({
                webhookUrl: 'https://n8n.halilavc.com/webhook/oda-olcum-chatbot/chat'
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
