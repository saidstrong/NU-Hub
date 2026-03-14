import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { ShellButton } from "@/components/ui/ShellButton";
import { TopBar } from "@/components/ui/TopBar";
import { getCampusServiceBySlug, getCampusServiceSlugs } from "@/lib/campus/data";

type CampusServiceDetailPageProps = {
  params: Promise<{ slug: string }>;
};

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
        subtitle="Campus service details and pricing reference."
        backHref="/campus"
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Overview" subtitle="What this service provides.">
          <p className="text-[14px] leading-relaxed text-wire-200">{service.description}</p>
        </SectionCard>

        <SectionCard title="Service details" subtitle="Location, contact, and availability.">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <p className="text-wire-300">Location</p>
            <p className="text-wire-200">{valueOrFallback(service.location)}</p>
            <p className="text-wire-300">Contact</p>
            <p className="text-wire-200">{valueOrFallback(service.contactName)}</p>
            <p className="text-wire-300">Email</p>
            <p className="text-wire-200">{valueOrFallback(service.contactEmail)}</p>
            <p className="text-wire-300">Phone</p>
            <p className="text-wire-200">{valueOrFallback(service.contactPhone)}</p>
            <p className="text-wire-300">Hours</p>
            <p className="text-wire-200">{valueOrFallback(service.hours)}</p>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Pricing asset" subtitle="Open the latest pricing reference file if available.">
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
                Open pricing asset
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
                Open pricing asset
              </a>
            </div>
          )
        ) : (
          <EmptyState
            title="No pricing asset yet"
            description="Contact the service office for latest rates and fees."
          />
        )}
      </SectionCard>

      <section className="wire-panel">
        <ShellButton label="Back to campus information" href="/campus" variant="default" block={false} />
      </section>
    </main>
  );
}
