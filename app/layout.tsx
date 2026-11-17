import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';
import { Nav } from '@/components/Nav';
import { AsOfPicker } from '@/components/AsOfPicker';
import { SELLER } from '@/lib/seller';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AR Manager · Brightwater Advisory',
  description: 'Accounts receivable manager for Brightwater Advisory Pvt. Ltd.',
};

/**
 * Every page in this app reads live data and the ?asof= date for each request,
 * so no route can be prerendered as an "instant" static shell. This opts the
 * whole app out of that check (Next.js Cache Components); pages still render fresh on every request.
 */
export const instant = false;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen font-sans text-sm">
        <header className="border-b border-slate-200 bg-white print:hidden">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">AR Manager</div>
              <div className="text-xs text-slate-500">{SELLER.name}</div>
            </div>
            <Suspense fallback={<div className="flex-1" />}>
              <Nav />
              <AsOfPicker />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
      </body>
    </html>
  );
}
