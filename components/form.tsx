'use client';

/**
 * Form building blocks for client-side forms. They show the field errors that
 * the server action returns; all checking happens on the server.
 */
import { useActionState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import type { ActionState } from '@/lib/actions/shared';

export const inputClass =
  'w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100';

export function Field({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

export function SubmitButton({ children, pendingText = 'Saving…', danger = false, disabled = false, pending: pendingProp = false }: { children: ReactNode; pendingText?: string; danger?: boolean; disabled?: boolean; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp || status.pending;
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${danger ? 'bg-red-700 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-700'}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ error, warning, message }: { error?: string; warning?: string; message?: string }) {
  return (
    <>
      {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800">{error}</div>}
      {warning && <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">{warning}</div>}
      {message && <div className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900">{message}</div>}
    </>
  );
}

/**
 * Submits a form to a server action without React's automatic form reset, so
 * that after an error every field (including dropdowns) keeps what the user
 * typed. After a successful action the page comes back with a new ?n= token,
 * and the form key changes so the form starts fresh.
 */
export function useActionForm(fn: (prev: ActionState, fd: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(fn, {});
  const [, startTransition] = useTransition();
  const formKey = useSearchParams().get('n') ?? '';
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  }
  return { state, pending, onSubmit, formKey };
}
