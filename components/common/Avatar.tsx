import { cn } from "@/lib/utils";

/** Circle with the user's initial. Colors are chosen to keep white text AA-legible. */
export function Avatar({
  name,
  color,
  size = 40,
  className,
}: {
  name: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full font-display font-extrabold text-white", className)}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
