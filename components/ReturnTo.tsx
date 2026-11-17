'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/** A hidden field holding the current page address, so an action can come back here with a confirmation. */
export function ReturnTo() {
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams().toString());
  params.delete('done');
  params.delete('n');
  const qs = params.toString();
  return <input type="hidden" name="returnTo" value={qs ? `${pathname}?${qs}` : pathname} />;
}
