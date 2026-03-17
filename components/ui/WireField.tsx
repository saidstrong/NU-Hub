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
      <span className="wire-label">
        {label}
      </span>
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

export type WireSelectOption = {
  value: string;
  label: string;
};

type WireSelectProps = {
  label: string;
  name: string;
  options: WireSelectOption[];
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

export function WireSelect({
  label,
  name,
  options,
  defaultValue,
  placeholder = "Select an option",
  required = false,
  className,
}: WireSelectProps) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="wire-label">
        {label}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="wire-input-field"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
      <span className="wire-label">
        {label}
      </span>
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
