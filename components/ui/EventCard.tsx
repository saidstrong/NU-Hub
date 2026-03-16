import Link from "next/link";

export type EventCardItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  status?: string;
  context?: string;
};

type EventCardProps = {
  event: EventCardItem;
  href?: string;
};

export function EventCard({ event, href }: EventCardProps) {
  const safeLocation = event.location.trim().length > 0 ? event.location : "Location TBA";

  const content = (
    <div className="wire-card wire-hover px-4 py-3.5 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-wire-600 bg-wire-900 px-2.5 py-1 text-[11px] font-medium text-wire-100">
          {event.date}
        </span>
        <span className="rounded-full border border-wire-700 bg-wire-900 px-2.5 py-1 text-[11px] font-medium text-wire-300">
          {event.category}
        </span>
        {event.status ? (
          <span className="rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-wire-100">
            {event.status}
          </span>
        ) : null}
      </div>

      <p className="mt-3 line-clamp-2 break-words text-[15px] font-semibold leading-6 tracking-tight text-wire-100">
        {event.title}
      </p>
      <p className="mt-1.5 text-[13px] leading-5 text-wire-200">{safeLocation}</p>
      {event.context ? <p className="mt-1 wire-meta">{event.context}</p> : null}

      {href ? (
        <div className="mt-3 flex items-center justify-end">
          <span className="text-[12px] font-medium text-wire-200">View event</span>
        </div>
      ) : null}
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
