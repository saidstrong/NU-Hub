"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-wire-950 px-4 py-10 text-wire-100">
        <main className="mx-auto max-w-xl rounded-2xl border border-wire-700 bg-wire-900 p-6">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-wire-300">
            An unexpected error occurred. Please try again.
          </p>
          <button type="button" onClick={reset} className="wire-action-primary mt-4">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
