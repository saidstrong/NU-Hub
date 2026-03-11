import Link from "next/link";

export type EventCardItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  status?: string;
};

type EventCardProps = {
  event: EventCardItem;
  href?: string;
};

export function EventCard({ event, href }: EventCardProps) {
  const content = (
    <div className="wire-card wire-hover">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-semibold tracking-tight text-wire-100">
          {event.title}
        </p>
        <span className="rounded-xl border border-wire-600 bg-wire-900 px-2 py-1 text-[12px] text-wire-200">
          {event.date}
        </span>
      </div>
      <p className="mb-1 wire-meta">{event.category}</p>
      {event.status ? (
        <p className="mb-1 text-[12px] text-wire-200">{event.status}</p>
      ) : null}
      <p className="wire-meta">{event.location}</p>
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
