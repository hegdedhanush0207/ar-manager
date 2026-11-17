/**
 * The headline figures for "Overdue at a glance", as at a date.
 */
import type { ArData, Paise } from './types';
import { customerPositions, totalPositions, type CustomerPosition, type PositionTotals } from './positions';
import { dsoDetail, type DsoResult } from './dso';

export interface DashboardSummary {
  outstanding: Paise; // Σ invoice outstanding
  unapplied: Paise; // Σ unapplied credit
  netReceivable: Paise; // outstanding − unapplied
  overdue: Paise;
  /** Overdue as a percentage of total outstanding, or null when nothing is outstanding. */
  overduePct: number | null;
  overdueCount: number;
  dso: DsoResult;
  rows: CustomerPosition[];
  totals: PositionTotals;
}

export function dashboardSummary(data: ArData, asOf: string): DashboardSummary {
  const rows = customerPositions(data, asOf);
  const totals = totalPositions(rows);
  return {
    outstanding: totals.outstanding,
    unapplied: totals.unapplied,
    netReceivable: totals.netBalance,
    overdue: totals.overdue,
    overduePct: totals.outstanding > 0 ? (totals.overdue / totals.outstanding) * 100 : null,
    overdueCount: totals.overdueCount,
    dso: dsoDetail(data, asOf),
    rows,
    totals,
  };
}
