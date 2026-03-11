import Link from "next/link";
import { TagChip } from "./TagChip";

export type CommunityCardItem = {
  id: string;
  name: string;
  description: string;
  members: string;
  joinType: string;
  tags: string[];
  status?: string;
};

type CommunityCardProps = {
  community: CommunityCardItem;
  href?: string;
};

export function CommunityCard({ community, href }: CommunityCardProps) {
  const content = (
    <div className="wire-card wire-hover">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-tight">{community.name}</p>
        <span className="rounded-xl border border-wire-600 bg-wire-900 px-2 py-1 text-[12px] text-wire-300">
          {community.joinType}
        </span>
      </div>

      <p className="mb-2 wire-meta">{community.description}</p>
      {community.status ? (
        <p className="mb-2 text-[12px] text-wire-200">{community.status}</p>
      ) : null}

      <div className="mb-2 border-t border-wire-700 pt-2.5">
        <p className="mb-1 wire-meta">Community signal</p>
        <p className="text-[13px] text-wire-200">{community.members} members</p>
      </div>

      <div>
        <p className="mb-1 wire-meta">Focus areas</p>
        <div className="flex flex-wrap gap-1.5">
          {community.tags.slice(0, 2).map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      >
        {content}
      </Link>
    );
  }

  return content;
}
