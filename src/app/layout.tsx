import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { SettingsProvider } from "@/contexts/settings-context";

const fontSans = Plus_Jakarta_Sans({
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
        <style dangerouslySetInnerHTML={{__html: `
          :root {
            --chat--color--primary: #000000;
            --chat--color--primary-shade-50: #1a1a1a;
            --chat--color--primary--shade-100: #333333;
            --chat--color--secondary: #333333;
            --chat--color-secondary-shade-50: #4d4d4d;
            --chat--color-dark: #000000;
            --chat--color-light: #f2f2f2;
            --chat--color-light-shade-50: #e6e6e6;
            --chat--color-light-shade-100: #cccccc;
            --chat--message--bot--color: #000000;
            --chat--message--bot--background: #ffffff;
            --chat--message--user--color: #ffffff;
            --chat--message--user--background: #000000;
            --chat--input--text-color: #000000;
            --chat--input--background: #ffffff;
            --chat--color-typing: #000000;
          }
        `}} />
      </head>
      <body className={`${fontSans.variable} font-sans antialiased min-h-screen bg-background text-foreground transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <SettingsProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </SettingsProvider>
        </ThemeProvider>

        <Script
          id="n8n-chat-script"
          type="module"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';
              createChat({
                webhookUrl: 'https://n8n.halilavc.com/webhook/oda-olcum-chatbot/chat',
                initialMessages: [
                  'Merhaba! 👋',
                  'Size nasıl yardımcı olabilirim?'
                ],
                i18n: {
                  en: {
                    title: 'Merhaba! 👋',
                    subtitle: 'Sohbeti başlatın. Size 7/24 yardımcı olmak için buradayız.',
                    footer: '',
                    getStarted: 'Sohbete Başla',
                    inputPlaceholder: 'Mesajınızı yazın...'
                  }
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
