export default function AppLoading() {
  return (
    <main className="space-y-6">
      <section className="wire-panel animate-pulse">
        <div className="h-6 w-36 rounded-md bg-wire-800" />
        <div className="mt-3 h-11 rounded-[var(--radius-input)] bg-wire-800" />
      </section>

      <section className="wire-panel animate-pulse">
        <div className="h-5 w-40 rounded-md bg-wire-800" />
        <div className="mt-3 space-y-2.5">
          <div className="h-24 rounded-[var(--radius-card)] bg-wire-800" />
          <div className="h-24 rounded-[var(--radius-card)] bg-wire-800" />
          <div className="h-24 rounded-[var(--radius-card)] bg-wire-800" />
        </div>
      </section>
    </main>
  );
}
