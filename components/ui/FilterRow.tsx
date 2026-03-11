import { TagChip } from "./TagChip";

type FilterRowProps = {
  filters: string[];
};

export function FilterRow({ filters }: FilterRowProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter, idx) => (
        <TagChip key={filter} label={filter} active={idx === 0} />
      ))}
    </div>
  );
}
