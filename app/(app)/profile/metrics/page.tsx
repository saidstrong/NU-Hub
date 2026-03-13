import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/ui/TopBar";
import { getRecentDailyMetrics } from "@/lib/metrics/data";
import type { DailyMetricsRow } from "@/lib/metrics/data";
import { isAdminUser, requireAdminUser } from "@/lib/moderation/data";

function formatDay(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

type DailyMetricsNumericKey = Exclude<{
  [K in keyof DailyMetricsRow]: DailyMetricsRow[K] extends number ? K : never;
}[keyof DailyMetricsRow], undefined>;

function sumRecentWeek(rows: DailyMetricsRow[], key: DailyMetricsNumericKey): number {
  return rows.slice(0, 7).reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

export default async function MetricsPage() {
  const adminUser = await requireAdminUser();

  if (!isAdminUser(adminUser)) {
    notFound();
  }

  let metricsRows: Awaited<ReturnType<typeof getRecentDailyMetrics>> = [];
  let loadError: string | null = null;

  try {
    metricsRows = await getRecentDailyMetrics(30);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Failed to load metrics.";
  }

  const sevenDayTotals = {
    activeUsers: sumRecentWeek(metricsRows, "active_users"),
    newUsers: sumRecentWeek(metricsRows, "new_users"),
    messages:
      sumRecentWeek(metricsRows, "friend_messages") +
      sumRecentWeek(metricsRows, "marketplace_messages"),
    listingsCreated: sumRecentWeek(metricsRows, "listings_created"),
    communityPosts: sumRecentWeek(metricsRows, "community_posts"),
    eventRsvps: sumRecentWeek(metricsRows, "event_rsvps"),
    notificationsCreated: sumRecentWeek(metricsRows, "notifications_created"),
    moderationReports: sumRecentWeek(metricsRows, "moderation_reports"),
  };

  return (
    <main>
      <TopBar
        title="Operational Metrics"
        subtitle="Internal daily aggregates for platform health and growth tracking"
        backHref="/profile"
      />

      {loadError ? (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-200">
          {loadError}
        </div>
      ) : null}

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Last 7 days totals</h2>
          <p className="mt-1 wire-meta">Aggregated activity approximation (UTC daily buckets).</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2">
            <p className="wire-meta">Active users</p>
            <p className="mt-1 text-sm text-wire-100">{sevenDayTotals.activeUsers}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2">
            <p className="wire-meta">New users</p>
            <p className="mt-1 text-sm text-wire-100">{sevenDayTotals.newUsers}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2">
            <p className="wire-meta">Messages</p>
            <p className="mt-1 text-sm text-wire-100">{sevenDayTotals.messages}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2">
            <p className="wire-meta">Listings created</p>
            <p className="mt-1 text-sm text-wire-100">{sevenDayTotals.listingsCreated}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2">
            <p className="wire-meta">Community posts</p>
            <p className="mt-1 text-sm text-wire-100">{sevenDayTotals.communityPosts}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2">
            <p className="wire-meta">Event RSVPs</p>
            <p className="mt-1 text-sm text-wire-100">{sevenDayTotals.eventRsvps}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2">
            <p className="wire-meta">Notifications</p>
            <p className="mt-1 text-sm text-wire-100">{sevenDayTotals.notificationsCreated}</p>
          </div>
          <div className="rounded-xl border border-wire-700 bg-wire-800 px-3 py-2">
            <p className="wire-meta">Reports</p>
            <p className="mt-1 text-sm text-wire-100">{sevenDayTotals.moderationReports}</p>
          </div>
        </div>
      </section>

      <section className="wire-panel">
        <div className="mb-3 border-b border-wire-700 pb-3">
          <h2 className="wire-section-title">Recent daily metrics</h2>
          <p className="mt-1 wire-meta">{metricsRows.length > 0 ? `${metricsRows.length} day(s)` : "No rows yet"}</p>
        </div>

        {metricsRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[13px] text-wire-200">
              <thead>
                <tr className="border-b border-wire-700 text-wire-300">
                  <th className="px-2 py-2">Day (UTC)</th>
                  <th className="px-2 py-2">Active</th>
                  <th className="px-2 py-2">New</th>
                  <th className="px-2 py-2">Friend Msg</th>
                  <th className="px-2 py-2">Market Msg</th>
                  <th className="px-2 py-2">Listings</th>
                  <th className="px-2 py-2">Posts</th>
                  <th className="px-2 py-2">RSVPs</th>
                  <th className="px-2 py-2">Notifications</th>
                  <th className="px-2 py-2">Reports</th>
                  <th className="px-2 py-2">Rate-limit</th>
                </tr>
              </thead>
              <tbody>
                {metricsRows.map((row) => (
                  <tr key={row.day} className="border-b border-wire-800">
                    <td className="px-2 py-2 text-wire-100">{formatDay(row.day)}</td>
                    <td className="px-2 py-2">{row.active_users}</td>
                    <td className="px-2 py-2">{row.new_users}</td>
                    <td className="px-2 py-2">{row.friend_messages}</td>
                    <td className="px-2 py-2">{row.marketplace_messages}</td>
                    <td className="px-2 py-2">{row.listings_created}</td>
                    <td className="px-2 py-2">{row.community_posts}</td>
                    <td className="px-2 py-2">{row.event_rsvps}</td>
                    <td className="px-2 py-2">{row.notifications_created}</td>
                    <td className="px-2 py-2">{row.moderation_reports}</td>
                    <td className="px-2 py-2">{row.rate_limit_hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loadError ? (
          <EmptyState
            title="No metrics rows yet"
            description="Daily operational aggregates will appear after the cron runs."
            actionLabel="Back to profile"
            actionHref="/profile"
          />
        ) : null}
      </section>
    </main>
  );
}
