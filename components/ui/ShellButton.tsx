import Link from "next/link";

type ShellButtonProps = {
  label: string;
  href?: string;
  block?: boolean;
  variant?: "default" | "primary" | "ghost";
};

export function ShellButton({
  label,
  href,
  block = true,
  variant = "default",
}: ShellButtonProps) {
  const toneClass =
    variant === "primary"
      ? "wire-action-primary"
      : variant === "ghost"
        ? "wire-action-ghost"
        : "wire-action";
  const className = `${block ? "w-full" : ""} ${toneClass}`.trim();

  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {label}
    </button>
  );
}
