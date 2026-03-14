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

function valueOrFallback(value: string | undefined, fallback = "Not listed"): string {
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
        title="Campus Information"
        subtitle="Campus references and contacts."
        backHref="/home"
      />

      <SectionCard title="Code of Conduct">
        <p className="mb-3 text-[14px] leading-relaxed text-wire-200">
          {campusCodeOfConduct.summary}
        </p>
        <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3">
          <p className="text-sm font-medium text-wire-100">{campusCodeOfConduct.title}</p>
          <a
            href={campusCodeOfConduct.assetUrl}
            target="_blank"
            rel="noreferrer"
            className="wire-action-primary mt-3 inline-flex w-auto px-4"
          >
            Open PDF
          </a>
        </div>
      </SectionCard>

      <SectionCard title="Campus Map">
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
              Open map
            </a>
          </div>
        ) : mapIsPdf ? (
          <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3">
            <p className="text-sm font-medium text-wire-100">{campusMap.title}</p>
            <p className="mt-1 wire-meta">Map is provided as a PDF document.</p>
            <a
              href={campusMap.assetUrl}
              target="_blank"
              rel="noreferrer"
              className="wire-action-primary mt-3 inline-flex w-auto px-4"
            >
              Open map document
            </a>
          </div>
        ) : (
          <EmptyState
            title="Map asset unavailable"
            description="Map reference file is not currently available."
          />
        )}

        <div className="mt-4 space-y-2.5">
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

      <SectionCard title="Services & Prices">
        {campusServices.length > 0 ? (
          <div className="space-y-2.5">
            {campusServices.map((service) => (
              <div
                key={service.slug}
                className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3"
              >
                <p className="text-sm font-medium text-wire-100">{service.name}</p>
                <p className="mt-1 text-[13px] text-wire-200">{service.description}</p>
                <p className="mt-1 wire-meta">{valueOrFallback(service.location, "Location not listed")}</p>
                <div className="mt-3">
                  <ShellButton
                    label="View service details"
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
            title="No services listed"
            description="Campus service references will appear here."
          />
        )}
      </SectionCard>

      <SectionCard title="Important Contacts">
        {importantContacts.length > 0 ? (
          <div className="space-y-2.5">
            {importantContacts.map((contact) => (
              <div
                key={contact.name}
                className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3"
              >
                <p className="text-sm font-medium text-wire-100">{contact.name}</p>
                <p className="mt-1 text-[13px] text-wire-300">{contact.department}</p>
                {contact.role ? <p className="mt-1 text-[13px] text-wire-300">{contact.role}</p> : null}
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                  <p className="text-wire-300">Email</p>
                  <p className="text-wire-200">{valueOrFallback(contact.email)}</p>
                  <p className="text-wire-300">Phone</p>
                  <p className="text-wire-200">{valueOrFallback(contact.phone)}</p>
                  <p className="text-wire-300">Office</p>
                  <p className="text-wire-200">{valueOrFallback(contact.office)}</p>
                  <p className="text-wire-300">Hours</p>
                  <p className="text-wire-200">{valueOrFallback(contact.hours)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No contacts available"
            description="Campus contact references will appear here."
          />
        )}
      </SectionCard>
    </main>
  );
}
