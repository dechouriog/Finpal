import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { DeviceViewer } from "@/components/shell/DeviceViewer";
import { prisma } from "@/lib/db";
import { PalStage } from "@/lib/pal";
import { getSessionUserId } from "@/lib/session";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const DESCRIPTION =
  "An AI investing guide inside a wallet: it protects your safety net, explains the risks and helps you make a first investment, funded with PayPal (Sandbox).";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.RENDER_EXTERNAL_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Finpal — AI investing guide in your wallet", template: "%s · Finpal" },
  description: DESCRIPTION,
  applicationName: "Finpal",
  openGraph: {
    type: "website",
    siteName: "Finpal",
    title: "Finpal — AI investing guide in your wallet",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: "Finpal — AI investing guide in your wallet", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#0B3D91",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Pal's growth stage for the signed-in user (seed when signed out).
  const userId = await getSessionUserId().catch(() => null);
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { palStage: true } }) : null;
  const palStage = PalStage.catch("seed").parse(user?.palStage);

  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <DeviceViewer palStage={palStage}>{children}</DeviceViewer>
      </body>
    </html>
  );
}
