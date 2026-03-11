import Link from "next/link";
import { TagChip } from "./TagChip";

type ProfileHeaderAction = {
  label: string;
  href: string;
};

type ProfileHeaderProps = {
  name: string;
  subtitle: string;
  tags?: string[];
  contextLabel?: string;
  actions?: ProfileHeaderAction[];
};

export function ProfileHeader({
  name,
  subtitle,
  tags = [],
  contextLabel,
  actions = [],
}: ProfileHeaderProps) {
  return (
    <div className="wire-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="h-14 w-14 shrink-0 rounded-full border border-dashed border-wire-600 bg-wire-900" />
          <div className="min-w-0">
            {contextLabel ? (
              <p className="mb-1 wire-label">{contextLabel}</p>
            ) : null}
            <h2 className="truncate text-[20px] font-semibold tracking-tight text-wire-100">
              {name}
            </h2>
            <p className="mt-1 text-[13px] text-wire-200">{subtitle}</p>
          </div>
        </div>
        {actions.length > 0 ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={`${action.label}-${action.href}`}
                href={action.href}
                className="wire-action-compact min-w-[92px]"
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {tags.length > 0 ? (
        <div className="mt-4 border-t border-wire-700 pt-3">
          <p className="mb-2 wire-meta">Focus areas</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
