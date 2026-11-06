import { cn } from "@/lib/utils";

type FinpalLogoProps = {
  /** "icon" = mark only, "full" = mark + wordmark */
  variant?: "icon" | "full";
  /** "light" for light backgrounds, "dark" for dark backgrounds */
  tone?: "light" | "dark";
  /** Mark size in px; the wordmark scales with it. */
  size?: number;
  className?: string;
  /** Accessible label. Pass "" when the logo is purely decorative. */
  title?: string;
};

/**
 * Original Finpal logo.
 * Mark: teal rounded square (radius ≈ 28% of size) with a white lowercase
 * Manrope ExtraBold "f" and a small white "coin dot" at the top right.
 * Wordmark: lowercase "finpal" in Manrope ExtraBold with tight tracking.
 */
export function FinpalLogo({
  variant = "full",
  tone = "light",
  size = 32,
  className,
  title = "Finpal",
}: FinpalLogoProps) {
  const decorative = title === "";
  return (
    <span
      className={cn("inline-flex items-center select-none", className)}
      style={{ gap: size * 0.3 }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative ? true : undefined}
    >
      <FinpalMark size={size} />
      {variant === "full" && (
        <span
          aria-hidden
          className={cn(
            "font-display font-extrabold leading-none tracking-[-0.04em]",
            tone === "dark" ? "text-white" : "text-deep",
          )}
          style={{ fontSize: size * 0.72 }}
        >
          finpal
        </span>
      )}
    </span>
  );
}

export function FinpalMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      aria-hidden
      focusable="false"
    >
      <rect width="100" height="100" rx="28" fill="#00C2A8" />
      <text
        x="45"
        y="74"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="68"
        fontWeight={800}
        style={{ fontFamily: "var(--font-manrope), Manrope, ui-sans-serif, sans-serif" }}
      >
        f
      </text>
      <circle cx="75" cy="25" r="7.5" fill="#FFFFFF" />
    </svg>
  );
}
