import { cn } from "@/lib/cn";

type TagChipProps = {
  label: string;
  active?: boolean;
};

export function TagChip({ label, active = false }: TagChipProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center rounded-xl border px-3 py-1.5 text-[12px] font-medium leading-none transition-colors duration-150",
        active
          ? "border-accent/45 bg-accent/10 text-wire-100"
          : "border-wire-600 bg-wire-800 text-wire-200 hover:border-wire-500 hover:text-wire-100",
      )}
    >
      {label}
    </span>
  );
}
