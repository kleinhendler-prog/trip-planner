import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trip Builder",
  description: "Plan your trips with AI-powered recommendations",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trip Builder",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#4648d4",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover",
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
      className="h-full antialiased"
    >
      <head>
        {/* Google Fonts: Plus Jakarta Sans, Be Vietnam Pro, Space Grotesk */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Be+Vietnam+Pro:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols for icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />

        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trip Builder" />
        <meta name="theme-color" content="#4648d4" />
        <meta name="color-scheme" content="light" />

        {/* Icons */}
        <link rel="icon" href="/icons/192.png" />
        <link rel="apple-touch-icon" href="/icons/192.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Splash Screen for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/512.png" media="(device-width: 812px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: 'var(--color-background)' }}>
        <SessionProvider>
          {children}
        </SessionProvider>
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('Service Worker registered'))
                    .catch(err => console.log('Service Worker registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
