import { SectionCard } from "@/components/ui/SectionCard";
import { TopBar } from "@/components/ui/TopBar";
import {
  campusMapInfo,
  campusServices,
  codeOfConductItems,
  importantContacts,
} from "@/lib/campus/data";

function valueOrFallback(value: string | undefined, fallback = "Not listed"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

export default function CampusInfoPage() {
  return (
    <main>
      <TopBar
        title="Campus Information"
        subtitle="Practical NU references for everyday student life"
        backHref="/home"
      />

      <SectionCard title="Code of Conduct">
        <p className="mb-3 wire-meta">
          Core expectations for respectful, safe, and responsible campus participation.
        </p>
        <div className="space-y-2.5">
          {codeOfConductItems.map((item) => (
            <div key={item.title} className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5">
              <p className="text-sm font-medium text-wire-100">{item.title}</p>
              <p className="mt-1 text-[13px] text-wire-200">{item.detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Campus Map">
        <p className="mb-3 wire-meta">
          Key places students use most often. Use the map link for directions.
        </p>
        <a
          href={campusMapInfo.externalMapUrl}
          target="_blank"
          rel="noreferrer"
          className="wire-link inline-flex"
        >
          {campusMapInfo.externalMapLabel}
        </a>
        <div className="mt-3 space-y-2.5">
          {campusMapInfo.locations.map((location) => (
            <div
              key={location.name}
              className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5"
            >
              <p className="text-sm font-medium text-wire-100">{location.name}</p>
              <p className="mt-1 text-[13px] text-wire-300">{location.area}</p>
              {location.note ? <p className="mt-1 text-[13px] text-wire-200">{location.note}</p> : null}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Services & Prices">
        <p className="mb-3 wire-meta">
          High-use student services. Confirm final rates and terms with the relevant office.
        </p>
        <div className="space-y-2.5">
          {campusServices.map((service) => (
            <div key={service.name} className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5">
              <p className="text-sm font-medium text-wire-100">{service.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <p className="text-wire-300">Location</p>
                <p className="text-wire-200">{valueOrFallback(service.location)}</p>
                <p className="text-wire-300">Price</p>
                <p className="text-wire-200">{valueOrFallback(service.price, "Check with office")}</p>
              </div>
              {service.note ? <p className="mt-2 text-[13px] text-wire-200">{service.note}</p> : null}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Important Contacts">
        <p className="mb-3 wire-meta">Support points for health, services, housing, and IT needs.</p>
        <div className="space-y-2.5">
          {importantContacts.map((contact) => (
            <div key={contact.name} className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2.5">
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
      </SectionCard>
    </main>
  );
}
