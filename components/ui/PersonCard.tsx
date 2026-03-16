import Link from "next/link";
import { TagChip } from "./TagChip";

export type PersonCardItem = {
  id: string;
  name: string;
  major: string;
  year: string;
  lookingFor: string;
  interests: string[];
  avatarUrl?: string;
};

type PersonCardProps = {
  person: PersonCardItem;
  href?: string;
};

export function PersonCard({ person, href }: PersonCardProps) {
  const content = (
    <div className="wire-card wire-hover">
      <div className="mb-3 flex items-center gap-3">
        {person.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatarUrl}
            alt={`${person.name} avatar`}
            className="h-10 w-10 rounded-full border border-wire-700 bg-wire-900 object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full border border-dashed border-wire-600 bg-wire-900" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">{person.name}</p>
          <p className="wire-meta">{person.major} - {person.year}</p>
        </div>
      </div>

      <div className="mb-2 border-t border-wire-700 pt-2.5">
        <p className="mb-1 wire-meta">Collaboration focus</p>
        <p className="text-[13px] text-wire-200">{person.lookingFor}</p>
      </div>

      <div>
        <p className="mb-1 wire-meta">Interests</p>
        <div className="flex flex-wrap gap-1.5">
          {person.interests.slice(0, 2).map((interest) => (
            <TagChip key={interest} label={interest} />
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
