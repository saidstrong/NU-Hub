import { cn } from "@/lib/cn";

type FeedbackTone = "info" | "success" | "warning" | "error";

type FeedbackBannerProps = {
  message: string;
  tone?: FeedbackTone;
  className?: string;
};

const toneClassMap: Record<FeedbackTone, string> = {
  info: "border-accent/40 bg-accent/10 text-wire-100",
  success: "border-success/40 bg-success/10 text-wire-100",
  warning: "border-warning/40 bg-warning/10 text-wire-100",
  error: "border-danger/45 bg-danger/10 text-wire-100",
};

export function FeedbackBanner({
  message,
  tone = "info",
  className,
}: FeedbackBannerProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[var(--radius-input)] border px-4 py-2 text-[13px] leading-[20px]",
        toneClassMap[tone],
        className,
      )}
    >
      {message}
    </div>
  );
}
