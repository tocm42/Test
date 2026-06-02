import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pocket Money Tracker",
  description: "Track Sebastian and Oscar's weekly allowance, bonuses and spending.",
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
