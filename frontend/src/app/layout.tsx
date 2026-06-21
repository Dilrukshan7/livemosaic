import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MosaicForge — Turn Photos into Photomosaics",
  description:
    "Upload a photo and a collection of tile images. MosaicForge builds a stunning photomosaic for you in seconds.",
  openGraph: {
    title: "MosaicForge",
    description: "Turn any photo into a stunning photomosaic online.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
