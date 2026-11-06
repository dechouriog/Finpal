import { notFound } from "next/navigation";
import { PalGallery } from "@/components/pal/PalGallery";

export const metadata = { title: "Pal moods (dev)" };

/** Development-only gallery of Pal's moods and sizes (404 in production). */
export default function PalPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PalGallery />;
}
