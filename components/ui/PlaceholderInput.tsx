type PlaceholderInputProps = {
  label: string;
  large?: boolean;
};

export function PlaceholderInput({ label, large = false }: PlaceholderInputProps) {
  return (
    <div className="space-y-2">
      <label className="wire-label">{label}</label>
      <div
        className={large
          ? "wire-placeholder h-24"
          : "wire-placeholder h-11"
        }
      />
    </div>
  );
}
