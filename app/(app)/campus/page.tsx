import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { ShellButton } from "@/components/ui/ShellButton";
import { TopBar } from "@/components/ui/TopBar";
import {
  campusCodeOfConduct,
  campusMap,
  campusServices,
  importantContacts,
} from "@/lib/campus/data";

function valueOrFallback(value: string | undefined, fallback = "Not provided"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function isImageAsset(assetUrl: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(assetUrl);
}

function isPdfAsset(assetUrl: string): boolean {
  return /\.pdf$/i.test(assetUrl);
}

export default function CampusInfoPage() {
  const mapIsImage = isImageAsset(campusMap.assetUrl);
  const mapIsPdf = isPdfAsset(campusMap.assetUrl);

  return (
    <main>
      <TopBar
        title="Campus guide"
        subtitle="Core services, contacts, policies, and campus references for student life."
        backHref="/home"
      />

      <SectionCard
        title="Campus services"
        subtitle="Reference pages for the student services you may need most often."
      >
        {campusServices.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {campusServices.map((service) => (
              <div
                key={service.slug}
                className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3.5"
              >
                <p className="text-sm font-semibold text-wire-100">{service.name}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-wire-200">{service.description}</p>
                <div className="mt-2 space-y-1">
                  <p className="wire-meta">Location: {valueOrFallback(service.location)}</p>
                  <p className="wire-meta">Hours: {valueOrFallback(service.hours)}</p>
                </div>
                <div className="mt-3">
                  <ShellButton
                    label="Open service page"
                    href={`/campus/services/${service.slug}`}
                    block={false}
                    variant="default"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No campus services listed"
            description="Campus service reference pages are not available right now."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Important contacts"
        subtitle="Official offices students commonly need for support, wellbeing, and campus services."
      >
        {importantContacts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {importantContacts.map((contact) => (
              <div
                key={contact.name}
                className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3.5"
              >
                <p className="text-sm font-semibold text-wire-100">{contact.name}</p>
                <p className="mt-1 text-[13px] text-wire-300">{contact.department}</p>
                {contact.role ? <p className="mt-1 text-[13px] text-wire-300">{contact.role}</p> : null}
                <dl className="mt-2 grid grid-cols-[78px_1fr] gap-y-1 text-[12px]">
                  <dt className="text-wire-300">Email</dt>
                  <dd className="text-wire-200">{valueOrFallback(contact.email)}</dd>
                  <dt className="text-wire-300">Phone</dt>
                  <dd className="text-wire-200">{valueOrFallback(contact.phone)}</dd>
                  <dt className="text-wire-300">Office</dt>
                  <dd className="text-wire-200">{valueOrFallback(contact.office)}</dd>
                  <dt className="text-wire-300">Hours</dt>
                  <dd className="text-wire-200">{valueOrFallback(contact.hours)}</dd>
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No contacts available"
            description="Official campus contact details are not available right now."
          />
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Code of conduct"
          subtitle="Official guidance for respectful behavior, academic integrity, and safe participation."
        >
          <p className="mb-3 text-[14px] leading-relaxed text-wire-200">
            {campusCodeOfConduct.summary}
          </p>
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3">
            <p className="text-sm font-semibold text-wire-100">{campusCodeOfConduct.title}</p>
            <a
              href={campusCodeOfConduct.assetUrl}
              target="_blank"
              rel="noreferrer"
              className="wire-action-primary mt-3 inline-flex w-auto px-4"
            >
              Open conduct PDF
            </a>
          </div>
        </SectionCard>

        <SectionCard
          title="Campus map"
          subtitle="Find main campus buildings, service points, and map references."
        >
          <p className="mb-3 text-[14px] leading-relaxed text-wire-200">{campusMap.summary}</p>

          {mapIsImage ? (
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={campusMap.assetUrl}
                alt="NU campus map"
                className="h-52 w-full rounded-[var(--radius-input)] border border-wire-700 object-cover"
              />
              <a
                href={campusMap.assetUrl}
                target="_blank"
                rel="noreferrer"
                className="wire-action-primary mt-3 inline-flex w-auto px-4"
              >
                Open full map
              </a>
            </div>
          ) : mapIsPdf ? (
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3">
              <p className="text-sm font-medium text-wire-100">Map document</p>
              <p className="mt-1 wire-meta">Map is provided as a PDF document.</p>
              <a
                href={campusMap.assetUrl}
                target="_blank"
                rel="noreferrer"
                className="wire-action-primary mt-3 inline-flex w-auto px-4"
              >
                Open map PDF
              </a>
            </div>
          ) : (
            <EmptyState
              title="Map file unavailable"
              description="Use the external campus map link below while the local reference file is unavailable."
            />
          )}

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {campusMap.locations.map((location) => (
              <div
                key={location.name}
                className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3"
              >
                <p className="text-sm font-medium text-wire-100">{location.name}</p>
                <p className="mt-1 text-[13px] text-wire-300">{location.area}</p>
                {location.note ? <p className="mt-1 text-[13px] text-wire-200">{location.note}</p> : null}
              </div>
            ))}
          </div>

          <a
            href={campusMap.externalMapUrl}
            target="_blank"
            rel="noreferrer"
            className="wire-link mt-3 inline-flex"
          >
            {campusMap.externalMapLabel}
          </a>
        </SectionCard>
      </div>
    </main>
  );
}
