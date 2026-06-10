import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pocket Money Tracker",
  description: "Track each child's weekly allowance, bonuses, spending and savings goals.",
  applicationName: "Pocket Money",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Pocket Money" },
};

export const viewport: Viewport = {
  themeColor: "#4338ca",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-100 text-gray-900">{children}</body>
    </html>
  );
}
