'use client';

/** Shown when a page or action fails unexpectedly, in plain language with a way to retry. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl rounded border border-red-300 bg-red-50 p-4 text-red-900">
      <h1 className="mb-2 text-base font-semibold">Something went wrong</h1>
      <p className="mb-3">{error.message || 'The page could not be loaded.'}</p>
      <button onClick={reset} className="rounded bg-red-700 px-3 py-1.5 text-white hover:bg-red-600">
        Try again
      </button>
    </div>
  );
}
