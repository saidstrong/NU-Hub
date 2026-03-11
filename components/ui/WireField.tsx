import { cn } from "@/lib/cn";

type WireFieldProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  className?: string;
};

export function WireField({
  label,
  name,
  defaultValue,
  placeholder,
  required = false,
  type = "text",
  autoComplete,
  className,
}: WireFieldProps) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="wire-label">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="wire-input-field"
      />
    </label>
  );
}

type WireTextareaProps = {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
  className?: string;
};

export function WireTextarea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 4,
  className,
}: WireTextareaProps) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="wire-label">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className="wire-textarea-field"
      />
    </label>
  );
}
