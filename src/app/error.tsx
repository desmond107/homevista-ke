"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow mb-3">Something went wrong</p>
      <h1 className="text-4xl">We hit a snag</h1>
      <p className="mt-3 max-w-md text-ink-2">Please try again. If it keeps happening, contact support{error.digest ? ` with reference ${error.digest}` : ""}.</p>
      <button onClick={reset} className="btn-primary mt-8">Try again</button>
    </div>
  );
}
