import { TagChip } from "./TagChip";

type FilterRowProps = {
  filters: string[];
  activeIndex?: number;
};

export function FilterRow({ filters, activeIndex = 0 }: FilterRowProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter, idx) => (
        <TagChip key={filter} label={filter} active={idx === activeIndex} />
      ))}
    </div>
  );
}
