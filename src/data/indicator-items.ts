export const CHARGING_OVERVIEW_KEYS = ['chargingPower', 'soc', 'maxSoc', 'selectedProgram'] as const;
export type ChargingOverviewKey = (typeof CHARGING_OVERVIEW_KEYS)[number];

export const INDICATOR_BASE_KEYS = ['lockSensor', 'parkBrake', 'titleServices', 'stateCharging'] as const;
export type IndicatorBaseKey = (typeof INDICATOR_BASE_KEYS)[number];

export const RANGE_INFO_KEYS = ['fuelLevel', 'rangeLiquid', 'rangeElectric', 'soc'] as const;
export type RangeInfoKey = (typeof RANGE_INFO_KEYS)[number];
export type CardIndicatorKey = ChargingOverviewKey | IndicatorBaseKey | RangeInfoKey;
export type CardIndicatorSection = 'chargingOverview' | 'baseIndicators' | 'rangeInfo';

export enum INDICATOR_SECTIONS {
  CHARGING_OVERVIEW = 'chargingOverview',
  BASE_INDICATORS = 'baseIndicators',
  RANGE_INFO = 'rangeInfo',
}

export interface IndicatorItems {
  baseIndicators: readonly IndicatorBaseKey[];
  chargingOverview: readonly ChargingOverviewKey[];
  rangeInfo: readonly RangeInfoKey[];
}

export function getIndicatorItems(): IndicatorItems {
  return {
    baseIndicators: INDICATOR_BASE_KEYS,
    chargingOverview: CHARGING_OVERVIEW_KEYS,
    rangeInfo: RANGE_INFO_KEYS,
  };
}

export const INDICATOR_ITEMS: Record<CardIndicatorSection, readonly CardIndicatorKey[]> = {
  baseIndicators: INDICATOR_BASE_KEYS,
  chargingOverview: CHARGING_OVERVIEW_KEYS,
  rangeInfo: RANGE_INFO_KEYS,
};
