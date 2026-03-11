"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  variant?: "default" | "primary";
  className?: string;
};

export function SubmitButton({
  label,
  pendingLabel,
  variant = "default",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        variant === "primary" ? "wire-action-primary" : "wire-action",
        "w-full disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
    >
      {pending ? pendingLabel ?? "Saving..." : label}
    </button>
  );
}
