import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KrishiVayu (कृषिवायु) — Burn Alert to Clean Buyer Match",
  description: "Detect crop-residue fires in Punjab/Haryana, rank risk to Delhi air quality, and match hotspots to clean residue alternatives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://unpkg.com" />
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-[#F5F7FA] text-[#1B2430]">
        {children}
      </body>
    </html>
  );
}
