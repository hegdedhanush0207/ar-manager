/**
 * Exact rounding for displayed ratios. `toFixed` on a floating-point number can
 * round a true half the wrong way (1.005 → "1.00"), so ratios are rounded from
 * their whole-number numerator and denominator instead.
 */

/** num ÷ den shown with `decimals` places, rounded half away from zero. num and den are whole numbers, den > 0. */
export function ratioText(num: number, den: number, decimals: number): string {
  const scale = 10 ** decimals;
  const sign = num < 0 ? -1 : 1;
  const n = Math.abs(num) * scale;
  const units = Math.floor((2 * n + den) / (2 * den)); // round half up on the absolute value
  const whole = Math.floor(units / scale);
  const frac = String(units % scale).padStart(decimals, '0');
  const text = decimals ? `${whole}.${frac}` : String(whole);
  return sign < 0 && units !== 0 ? `-${text}` : text;
}
