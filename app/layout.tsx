import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { DeviceViewer } from "@/components/shell/DeviceViewer";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Finpal — Wallet, Invest & AI",
  description:
    "Finpal is a hackathon concept: a digital wallet with AI-guided investing, running on the PayPal Sandbox.",
};

export const viewport: Viewport = {
  themeColor: "#0B3D91",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <DeviceViewer>{children}</DeviceViewer>
      </body>
    </html>
  );
}
