import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="wire-panel mb-2 flex items-center justify-between text-xs text-wire-300">
        <Link href="/welcome" className="wire-action py-1">
          NU Atrium
        </Link>
        <Link href="/home" className="wire-action py-1">
          Skip to App
        </Link>
      </div>
      <div className="flex-1 pt-2">{children}</div>
    </div>
  );
}
