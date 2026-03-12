"use client";

import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

type ConfirmSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  confirmMessage: string;
  className?: string;
};

export function ConfirmSubmitButton({
  label,
  pendingLabel,
  confirmMessage,
  className,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "wire-action w-full disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
    >
      {pending ? pendingLabel ?? "Submitting..." : label}
    </button>
  );
}
