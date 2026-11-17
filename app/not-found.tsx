import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-xl rounded border border-slate-200 bg-white p-4">
      <h1 className="mb-2 text-base font-semibold">Not found</h1>
      <p className="mb-3">That customer, invoice or page does not exist.</p>
      <Link href="/" className="text-blue-700 underline">
        Back to Overdue at a glance
      </Link>
    </div>
  );
}
