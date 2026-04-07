import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { ShellButton } from "@/components/ui/ShellButton";
import { TopBar } from "@/components/ui/TopBar";
import { getCampusServiceBySlug, getCampusServiceSlugs } from "@/lib/campus/data";

type CampusServiceDetailPageProps = {
  params: Promise<{ slug: string }>;
};

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

export function generateStaticParams() {
  return getCampusServiceSlugs().map((slug) => ({ slug }));
}

export default async function CampusServiceDetailPage({ params }: CampusServiceDetailPageProps) {
  const { slug } = await params;
  const service = getCampusServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const hasPriceAsset = Boolean(service.priceAssetUrl);
  const priceAssetIsImage = hasPriceAsset && isImageAsset(service.priceAssetUrl as string);
  const priceAssetIsPdf = hasPriceAsset && isPdfAsset(service.priceAssetUrl as string);

  return (
    <main>
      <TopBar
        title={service.name}
        subtitle="Trusted campus service details, contact points, and price references."
        backHref="/campus"
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="What this service covers"
          subtitle="The main purpose of this campus service."
        >
          <p className="text-[14px] leading-relaxed text-wire-200">{service.description}</p>
        </SectionCard>

        <SectionCard
          title="Practical details"
          subtitle="The first details students usually need before reaching out."
        >
          <dl className="grid grid-cols-[86px_1fr] gap-y-2 text-[12px]">
            <dt className="text-wire-300">Location</dt>
            <dd className="text-wire-200">{valueOrFallback(service.location)}</dd>
            <dt className="text-wire-300">Hours</dt>
            <dd className="text-wire-200">{valueOrFallback(service.hours)}</dd>
            <dt className="text-wire-300">Contact</dt>
            <dd className="text-wire-200">{valueOrFallback(service.contactName)}</dd>
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        title="Contact this office"
        subtitle="Use the official contact details below for the latest service guidance."
      >
        <dl className="grid grid-cols-[86px_1fr] gap-y-2 text-[12px]">
          <dt className="text-wire-300">Email</dt>
          <dd className="text-wire-200">
            {service.contactEmail ? (
              <a href={`mailto:${service.contactEmail}`} className="wire-link min-h-0 text-[12px]">
                {service.contactEmail}
              </a>
            ) : (
              valueOrFallback(service.contactEmail)
            )}
          </dd>
          <dt className="text-wire-300">Phone</dt>
          <dd className="text-wire-200">
            {service.contactPhone ? (
              <a href={`tel:${service.contactPhone}`} className="wire-link min-h-0 text-[12px]">
                {service.contactPhone}
              </a>
            ) : (
              valueOrFallback(service.contactPhone)
            )}
          </dd>
        </dl>
      </SectionCard>

      <SectionCard
        title="Price reference"
        subtitle="Open the attached pricing or fee reference when one is available."
      >
        {hasPriceAsset ? (
          priceAssetIsImage ? (
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={service.priceAssetUrl}
                alt={`${service.name} pricing`}
                className="h-56 w-full rounded-[var(--radius-input)] border border-wire-700 object-cover"
              />
              <a
                href={service.priceAssetUrl}
                target="_blank"
                rel="noreferrer"
                className="wire-action-primary mt-3 inline-flex w-auto px-4"
              >
                Open price reference
              </a>
            </div>
          ) : (
            <div className="rounded-[var(--radius-input)] border border-wire-700 bg-wire-800 px-4 py-3">
              <p className="text-sm font-medium text-wire-100">Pricing document</p>
              <p className="mt-1 wire-meta">
                {priceAssetIsPdf ? "Pricing is provided as a PDF." : "Pricing file is attached."}
              </p>
              <a
                href={service.priceAssetUrl}
                target="_blank"
                rel="noreferrer"
                className="wire-action-primary mt-3 inline-flex w-auto px-4"
              >
                Open price reference
              </a>
            </div>
          )
        ) : (
          <EmptyState
            title="No price reference attached"
            description="Use the contact details above to confirm the latest rates, fees, or access rules."
          />
        )}
      </SectionCard>

      <section className="wire-panel">
        <ShellButton label="Back to campus guide" href="/campus" variant="default" block={false} />
      </section>
    </main>
  );
}
