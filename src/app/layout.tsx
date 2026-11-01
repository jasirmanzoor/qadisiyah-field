import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings-context";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Al Qadisiyah Dealership Survey",
  description: "Field survey and intelligence tool for the Al Qadisiyah and Al Shifa dealership markets.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Qadisiyah Survey",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

const DARK_MODE_INIT_SCRIPT = `
try {
  var m = localStorage.getItem('qs_dark_mode');
  if (m === 'true') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_INIT_SCRIPT }} />
      </head>
      <body className="h-full">
        <SettingsProvider>
          <ServiceWorkerRegister />
          <AppShell>{children}</AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
