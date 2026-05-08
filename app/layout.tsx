import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ResetButton } from "@/components/ResetButton";

export const metadata: Metadata = {
  title: "Глаза ЧОПа",
  description: "Система мониторинга охранной службы Висраил",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Глаза ЧОПа",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#e63946",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Глаза ЧОПа" />
        <meta name="theme-color" content="#e63946" />
      </head>
      <body>
        {children}
        <ResetButton />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  // Force the registration to check for SW updates on every load
                  reg.update().catch(function(){});
                }).catch(function(){});

                // When the new SW posts SW_UPDATED, reload the page so the user sees the latest bundle.
                // Use a flag to avoid an infinite reload loop if the message fires multiple times.
                var reloaded = false;
                navigator.serviceWorker.addEventListener('message', function(event) {
                  if (event.data && event.data.type === 'SW_UPDATED' && !reloaded) {
                    reloaded = true;
                    window.location.reload();
                  }
                });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
