import Link from "next/link";

interface LogoProps {
  /** Wrap the logo in a link. Pass `null` to render inline with no link. */
  href?: string | null;
  withWordmark?: boolean;
  className?: string;
  iconClassName?: string;
}

/**
 * MarketMind AI icon — the official app icon (public/marketmind-icon.png),
 * used consistently everywhere the brand mark appears (sidebar, marketing
 * pages, favicon/app metadata).
 */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/marketmind-icon.png"
      alt="MarketMind AI"
      className={`rounded-[22%] object-cover ${className}`}
    />
  );
}

export function Logo({
  href = "/",
  withWordmark = true,
  className = "",
  iconClassName = "h-9 w-9",
}: LogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={iconClassName} />
      {withWordmark && (
        <span className="text-lg font-semibold tracking-tight text-mm-ink">
          MarketMind<span className="text-mm-pink">&nbsp;AI</span>
        </span>
      )}
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} aria-label="MarketMind AI — home" className="inline-flex">
      {content}
    </Link>
  );
}
