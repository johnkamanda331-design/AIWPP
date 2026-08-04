/**
 * Kenya EPRA Schedule of Tariffs (2024)
 * Small Commercial (SC-11) — effective all-inclusive rate per kWh
 *
 * Breakdown:
 *   Energy charge (Band 1, 0–1500 kWh): KSh 15.80/kWh
 *   Fuel Cost Charge (FCC):              KSh  4.35/kWh
 *   FERFA (forex adjustment):            KSh  0.42/kWh
 *   Inflation Adjustment Factor:         KSh  0.28/kWh
 *   ERC Levy:                            KSh  0.05/kWh
 *   REP Levy:                            KSh  0.38/kWh
 *   WRMA Levy:                           KSh  0.10/kWh
 *   Sub-total before VAT:                KSh 21.38/kWh
 *   VAT (16%):                           KSh  3.42/kWh
 *   ─────────────────────────────────────────────────
 *   Effective rate incl. all charges:    KSh 24.80/kWh
 */
export const EPRA_RATE_KSH_PER_KWH = 24.80;

/** Calculate cost in Kenya Shillings given energy in kWh */
export function calcEPRACostKSh(kWh: number): number {
  return kWh * EPRA_RATE_KSH_PER_KWH;
}

/** Format a KSh amount with thousands separator */
export function formatKSh(amount: number, decimals = 2): string {
  return `KSh ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** WiFi signal quality label based on dBm */
export function wifiLabel(dBm: number): { label: string; color: string } {
  if (dBm >= -60) return { label: "Strong", color: "text-primary" };
  if (dBm >= -70) return { label: "Good",   color: "text-warning" };
  return                 { label: "Weak",   color: "text-destructive" };
}
