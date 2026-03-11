import { BottomNav } from "@/components/shell/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-wire-900 px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      {children}
      <BottomNav />
    </div>
  );
}
