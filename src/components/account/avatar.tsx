import { cn } from "@/lib/utils/cn";
import { initials } from "@/lib/domain/account";

/**
 * Member avatar.
 *
 * Falls back to initials struck on a metal plate, which is the normal state:
 * a photo is optional and most members never add one. The fallback is a real
 * design rather than a grey circle, so an account without a photo does not
 * look like an account that failed to load.
 */

const SIZES = {
  xs: "h-8 w-8 text-[0.625rem]",
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-base",
  lg: "h-20 w-20 text-2xl",
} as const;

export function Avatar({
  name,
  photo,
  size = "md",
  className,
}: {
  name: string;
  photo: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (photo) {
    const photoClass = cn(
      "shrink-0 rounded-full object-cover ring-1 ring-line-strong",
      SIZES[size],
      className,
    );
    // The photo is a locally-encoded data URL, so next/image has nothing to
    // optimise and would route it through the loader for no benefit.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className={photoClass} />;
  }

  return (
    <span
      aria-hidden
      className={cn(
        "metal-plate grid shrink-0 place-items-center rounded-full font-display font-semibold",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
