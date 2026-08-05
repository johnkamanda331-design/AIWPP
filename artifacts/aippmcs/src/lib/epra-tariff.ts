/**
 * Kenya EPRA Schedule of Tariffs (2024) — SC-11 Small Commercial
 *
 * Energy charge (tiered):
 *   Band 1  0–1 500 kWh :  KSh 15.80 / kWh
 *   Band 2  > 1 500 kWh :  KSh 15.95 / kWh
 *
 * Variable levies per kWh (all bands):
 *   Fuel Cost Charge (FCC)        :  KSh  4.35
 *   Forex Adjustment (FERFA)      :  KSh  0.42
 *   Inflation Adj. Factor (IAF)   :  KSh  0.28
 *   ERC Levy                      :  KSh  0.05
 *   REP Levy                      :  KSh  0.38
 *   WRMA Levy                     :  KSh  0.10
 *   ─────────────────────────────────────────────
 *   Total variable levies         :  KSh  5.58 / kWh
 *
 * Fixed monthly standing charge   :  KSh 200 (before VAT)
 * VAT                             :  16 %
 *
 * All-inclusive Band 1 rate (excl. fixed charge):
 *   (15.80 + 5.58) × 1.16 = KSh 24.80 / kWh
 */

// Energy charge per kWh
export const EPRA_BAND1_ENERGY  = 15.80;
export const EPRA_BAND2_ENERGY  = 15.95;
export const EPRA_BAND1_LIMIT   = 1_500; // kWh — threshold between bands

// Variable levies
export const EPRA_FCC           =  4.35;
export const EPRA_FERFA         =  0.42;
export const EPRA_IAF           =  0.28;
export const EPRA_ERC           =  0.05;
export const EPRA_REP           =  0.38;
export const EPRA_WRMA          =  0.10;
export const EPRA_TOTAL_LEVIES  =  EPRA_FCC + EPRA_FERFA + EPRA_IAF + EPRA_ERC + EPRA_REP + EPRA_WRMA; // 5.58

// Standing charges
export const EPRA_FIXED_MONTHLY = 200;   // KSh / month (before VAT)
export const EPRA_VAT_RATE      = 0.16;

/** Convenience: effective per-kWh all-in rate for Band 1, no fixed charge */
export const EPRA_RATE_KSH_PER_KWH =
  (EPRA_BAND1_ENERGY + EPRA_TOTAL_LEVIES) * (1 + EPRA_VAT_RATE); // ≈ 24.80

// ─────────────────────────────────────────────────────────────────────────────

/** Full itemised monthly bill for a given consumption. */
export function calcEPRAMonthlyBill(kWh: number): {
  energyCharge:   number;
  variableLevies: number;
  fixedCharge:    number;
  subtotal:       number;
  vat:            number;
  total:          number;
  /** Effective per-kWh cost including the fixed charge portion */
  effectiveRate:  number;
} {
  const energyCharge   =
    kWh <= EPRA_BAND1_LIMIT
      ? kWh * EPRA_BAND1_ENERGY
      : EPRA_BAND1_LIMIT * EPRA_BAND1_ENERGY + (kWh - EPRA_BAND1_LIMIT) * EPRA_BAND2_ENERGY;

  const variableLevies = kWh * EPRA_TOTAL_LEVIES;
  const fixedCharge    = EPRA_FIXED_MONTHLY;
  const subtotal       = energyCharge + variableLevies + fixedCharge;
  const vat            = subtotal * EPRA_VAT_RATE;
  const total          = subtotal + vat;
  const effectiveRate  = kWh > 0 ? total / kWh : EPRA_RATE_KSH_PER_KWH;

  return {
    energyCharge:   round2(energyCharge),
    variableLevies: round2(variableLevies),
    fixedCharge,
    subtotal:       round2(subtotal),
    vat:            round2(vat),
    total:          round2(total),
    effectiveRate:  round4(effectiveRate),
  };
}

/**
 * Calculate electricity cost for a given kWh quantity.
 *
 * @param kWh              Energy consumed
 * @param prorateDays      If provided, prorates the fixed monthly charge over
 *                         this many days (e.g. 1 for daily cost, 7 for weekly).
 *                         Pass undefined / 0 to exclude the fixed charge.
 */
export function calcEPRACostKSh(kWh: number, prorateDays?: number): number {
  const energyCharge =
    kWh <= EPRA_BAND1_LIMIT
      ? kWh * EPRA_BAND1_ENERGY
      : EPRA_BAND1_LIMIT * EPRA_BAND1_ENERGY + (kWh - EPRA_BAND1_LIMIT) * EPRA_BAND2_ENERGY;

  const variableLevies = kWh * EPRA_TOTAL_LEVIES;
  const fixedProrated  = prorateDays ? (EPRA_FIXED_MONTHLY / 30) * prorateDays : 0;
  return round2((energyCharge + variableLevies + fixedProrated) * (1 + EPRA_VAT_RATE));
}

/** Format a KSh amount with Kenyan thousands separator */
export function formatKSh(amount: number, decimals = 2): string {
  return `KSh\u202f${amount.toLocaleString("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** WiFi signal quality label based on dBm */
export function wifiLabel(dBm: number): { label: string; color: string } {
  if (dBm >= -60) return { label: "Strong", color: "text-primary"     };
  if (dBm >= -70) return { label: "Good",   color: "text-warning"     };
  return                  { label: "Weak",  color: "text-destructive" };
}

// ─── Internal helpers ────────────────────────────────────────────────────────
const round2 = (n: number) => parseFloat(n.toFixed(2));
const round4 = (n: number) => parseFloat(n.toFixed(4));
