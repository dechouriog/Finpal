import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="font-display text-5xl font-extrabold text-navy">404</p>
      <p className="mt-2 text-muted">We couldn&apos;t find that page.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
