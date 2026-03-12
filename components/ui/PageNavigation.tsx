import Link from "next/link";

type PageNavigationProps = {
  previousHref?: string;
  nextHref?: string;
  previousLabel?: string;
  nextLabel?: string;
};

export function PageNavigation({
  previousHref,
  nextHref,
  previousLabel = "Previous",
  nextLabel = "Next",
}: PageNavigationProps) {
  if (!previousHref && !nextHref) return null;

  if (previousHref && nextHref) {
    return (
      <div className="wire-action-row">
        <Link href={previousHref} className="wire-action">
          {previousLabel}
        </Link>
        <Link href={nextHref} className="wire-action-primary">
          {nextLabel}
        </Link>
      </div>
    );
  }

  const href = nextHref ?? previousHref ?? "#";
  const label = nextHref ? nextLabel : previousLabel;

  return (
    <div className="wire-action-row-single">
      <Link href={href} className="wire-action w-full">
        {label}
      </Link>
    </div>
  );
}
