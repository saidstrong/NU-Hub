import { BottomNav } from "@/components/shell/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-wire-900">
      <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-6 lg:px-8">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
