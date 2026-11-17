'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/** A submit button that asks "Are you sure?" first. Used for corrections. */
export function ConfirmButton({ message, children }: { message: string; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="text-xs text-red-700 underline hover:text-red-900 disabled:opacity-50 print:hidden"
    >
      {pending ? 'Working…' : children}
    </button>
  );
}
