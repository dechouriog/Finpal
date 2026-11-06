import { cn } from "@/lib/utils";

/** Original 4-point sparkle used for Finpal AI entry points. */
export function SparkleIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      <path d="M12 1.5c.5 4.9 2.6 7.9 9 10.5-6.4 2.6-8.5 5.6-9 10.5-.5-4.9-2.6-7.9-9-10.5 6.4-2.6 8.5-5.6 9-10.5Z" />
      <path d="M19.5 1.8c.2 1.6.9 2.5 2.7 3.2-1.8.7-2.5 1.6-2.7 3.2-.2-1.6-.9-2.5-2.7-3.2 1.8-.7 2.5-1.6 2.7-3.2Z" opacity=".7" />
    </svg>
  );
}
