export const CHARGING_OVERVIEW_KEYS = ['chargingPower', 'soc', 'maxSoc', 'selectedProgram'] as const;
export type ChargingOverviewKey = (typeof CHARGING_OVERVIEW_KEYS)[number];

export type CardIndicatorKey = ChargingOverviewKey;

export interface IndicatorItems {
  chargingOverview: readonly ChargingOverviewKey[];
}
export function getIndicatorItems(): IndicatorItems {
  return {
    chargingOverview: CHARGING_OVERVIEW_KEYS,
  };
}
