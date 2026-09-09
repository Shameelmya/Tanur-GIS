import type { Metadata, Viewport } from "next";
import { inter } from "./fonts";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Tanur Constituency GIS",
  description:
    "Interactive map of the Tanur Assembly Constituency (No. 44), Malappuram, Kerala — local bodies, wards, roads, bridges and key infrastructure.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d5c46",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="h-full overflow-hidden">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
