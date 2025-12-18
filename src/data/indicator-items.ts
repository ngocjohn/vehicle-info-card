export const CHARGING_OVERVIEW_KEYS = ['chargingPower', 'soc', 'maxSoc', 'selectedProgram'] as const;
export type ChargingOverviewKey = (typeof CHARGING_OVERVIEW_KEYS)[number];
export const INDICATOR_BASE_KEYS = ['lockSensor', 'parkBrake', 'titleServices', 'stateCharging'] as const;
export type IndicatorBaseKey = (typeof INDICATOR_BASE_KEYS)[number];
export type CardIndicatorKey = ChargingOverviewKey | IndicatorBaseKey;
export type CardIndicatorSection = 'chargingOverview' | 'baseIndicators';

export enum INDICATOR_SECTIONS {
  CHARGING_OVERVIEW = 'chargingOverview',
  BASE_INDICATORS = 'baseIndicators',
}

export interface IndicatorItems {
  baseIndicators: readonly IndicatorBaseKey[];
  chargingOverview: readonly ChargingOverviewKey[];
}

export function getIndicatorItems(): IndicatorItems {
  return {
    baseIndicators: INDICATOR_BASE_KEYS,
    chargingOverview: CHARGING_OVERVIEW_KEYS,
  };
}

export const INDICATOR_ITEMS: Record<CardIndicatorSection, readonly CardIndicatorKey[]> = {
  baseIndicators: INDICATOR_BASE_KEYS,
  chargingOverview: CHARGING_OVERVIEW_KEYS,
};
