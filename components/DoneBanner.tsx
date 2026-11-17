'use client';

import { useSearchParams } from 'next/navigation';

/** Shows the confirmation an action sent back in ?done=, on whichever page the user returned to. */
export function DoneBanner() {
  const done = useSearchParams().get('done');
  if (!done) return null;
  return (
    <div role="status" className="mb-4 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900 print:hidden">
      {done}
    </div>
  );
}
