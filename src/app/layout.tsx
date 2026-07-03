import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trip Planner",
  description: "Plan your trips with AI-powered recommendations",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trip Planner",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#3b82f6",
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
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trip Planner" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="color-scheme" content="light dark" />

        {/* Icons */}
        <link rel="icon" href="/icons/192.png" />
        <link rel="apple-touch-icon" href="/icons/192.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Splash Screen for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/512.png" media="(device-width: 812px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <body className="min-h-full flex flex-col bg-white">
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
