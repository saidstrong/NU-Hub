"use client";

import { useFormStatus } from "react-dom";
import { SubmitButton } from "@/components/ui/SubmitButton";

type MessageComposerProps = {
  action: (formData: FormData) => Promise<void>;
  conversationId: string;
  redirectTo: string;
  fieldId: string;
  placeholder: string;
  submitLabel?: string;
  pendingLabel?: string;
};

type ComposerFieldsProps = {
  fieldId: string;
  placeholder: string;
  submitLabel: string;
  pendingLabel: string;
};

function ComposerFields({
  fieldId,
  placeholder,
  submitLabel,
  pendingLabel,
}: ComposerFieldsProps) {
  const { pending } = useFormStatus();

  return (
    <>
      <textarea
        id={fieldId}
        name="content"
        required
        rows={3}
        maxLength={1200}
        placeholder={placeholder}
        disabled={pending}
        className="wire-textarea-field disabled:cursor-not-allowed disabled:opacity-70"
      />
      <div className="wire-action-row-single sm:flex sm:justify-end">
        <SubmitButton
          label={submitLabel}
          pendingLabel={pendingLabel}
          variant="primary"
          className="sm:w-auto sm:min-w-[132px]"
        />
      </div>
    </>
  );
}

export function MessageComposer({
  action,
  conversationId,
  redirectTo,
  fieldId,
  placeholder,
  submitLabel = "Send message",
  pendingLabel = "Sending...",
}: MessageComposerProps) {
  return (
    <form
      action={action}
      className="space-y-2 rounded-[var(--radius-card)] border border-wire-700 bg-wire-950/45 p-3 sm:p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <ComposerFields
        fieldId={fieldId}
        placeholder={placeholder}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
      />
    </form>
  );
}

