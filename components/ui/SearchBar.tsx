import { Search } from "lucide-react";

type SearchBarProps = {
  placeholder?: string;
  queryName?: string;
  defaultValue?: string;
  action?: string;
  autoFocus?: boolean;
  maxLength?: number;
};

export function SearchBar({
  placeholder = "Search",
  queryName,
  defaultValue,
  action,
  autoFocus = false,
  maxLength,
}: SearchBarProps) {
  if (queryName) {
    return (
      <form action={action} method="get" className="wire-input" role="search">
        <Search className="h-4 w-4 text-wire-300" aria-hidden="true" />
        <input
          name={queryName}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={maxLength}
          aria-label={placeholder}
          className="w-full bg-transparent text-[14px] text-wire-100 placeholder:text-wire-300 focus:outline-none"
        />
      </form>
    );
  }

  return (
    <div className="wire-input">
      <Search className="h-4 w-4 text-wire-300" aria-hidden="true" />
      <span className="text-[14px] text-wire-300">{placeholder}</span>
    </div>
  );
}
