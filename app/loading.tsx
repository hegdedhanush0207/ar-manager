/**
 * Shown while a page loads its data. It also wraps every page in a Suspense
 * boundary, which Next.js (Cache Components) needs for pages that read live
 * data and the as-at date on each request.
 */
export default function Loading() {
  return <div className="animate-pulse py-10 text-slate-400">Loading figures…</div>;
}
