import { cn } from "@/lib/cn";

type TagChipProps = {
  label: string;
  active?: boolean;
  tone?: "default" | "status";
};

export function TagChip({ label, active = false, tone = "default" }: TagChipProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[12px] font-medium leading-none transition-colors duration-150",
        active
          ? "border-accent/45 bg-accent/15 text-wire-100"
          : tone === "status"
            ? "border-wire-600 bg-wire-900 text-wire-200"
            : "border-wire-700 bg-wire-800 text-wire-300 hover:border-wire-600 hover:text-wire-100",
      )}
    >
      {label}
    </span>
  );
}
