'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { isIsoDate, todayInIndia } from '@/lib/ar/dates';

/**
 * The as-at date picker (R10). The date lives in the URL (?asof=2026-08-31),
 * so any view can be bookmarked or shared. Changing it keeps the other
 * parameters (filters, sort) and reloads the page's figures on the server.
 */
export function AsOfPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const fromUrl = params.get('asof');
  const today = todayInIndia();
  const value = fromUrl && isIsoDate(fromUrl) ? fromUrl : today;

  function go(date: string) {
    if (!isIsoDate(date)) return;
    const next = new URLSearchParams(params.toString());
    next.set('asof', date);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-slate-700">
      <span className="font-medium">As at</span>
      <input
        type="date"
        value={value}
        onChange={(e) => go(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1"
        aria-label="As-at date"
      />
      {value !== today && (
        <button type="button" onClick={() => go(today)} className="text-xs text-blue-700 underline">
          Today
        </button>
      )}
    </label>
  );
}
