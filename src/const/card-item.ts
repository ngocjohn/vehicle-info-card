import { LocalizeFunc } from 'types';

export type CardSection = 'tripCard' | 'vehicleCard' | 'ecoCard' | 'tyreCard' | 'chargingOverview';

export const TRIP_OVERVIEW_KEYS = [
  'odometer',
  'fuelLevel',
  'adBlueLevel',
  'rangeLiquid',
  'rangeElectric',
  'soc',
  'maxSoc',
] as const;

export const TRIP_FROM_RESET_KEYS = [
  'distanceReset',
  'drivenTimeReset',
  'distanceZEReset',
  'drivenTimeZEReset',
  'averageSpeedReset',
  'liquidConsumptionReset',
  'electricConsumptionReset',
] as const;

export const TRIP_FROM_START_KEYS = [
  'distanceStart',
  'drivenTimeStart',
  'distanceZEStart',
  'drivenTimeZEStart',
  'averageSpeedStart',
  'liquidConsumptionStart',
  'electricConsumptionStart',
] as const;

export const VEHICLE_OVERVIEW_KEYS = [
  'lockSensor',
  'windowsClosed',
  'doorStatusOverall',
  'parkBrake',
  'ignitionState',
] as const;

export const VEHICLE_WARNINGS_KEYS = [
  'starterBatteryState',
  'lowCoolantLevel',
  'lowBrakeFluid',
  'lowWashWater',
  'tirePressureWarning',
] as const;

export const ECO_SCORE_KEYS = [
  'ecoScoreAcceleration',
  'ecoScoreBonusRange',
  'ecoScoreConstant',
  'ecoScoreFreeWheel',
  'ecoScoreTotal',
] as const;

export const TYRE_PRESSURE_KEYS = [
  'tirePressureFrontLeft',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
] as const;

export const CHARGING_OVERVIEW_KEYS = ['chargingPower', 'soc', 'maxSoc', 'selectedProgram'] as const;

export type TripOverviewKey = (typeof TRIP_OVERVIEW_KEYS)[number];
export type TripFromResetKey = (typeof TRIP_FROM_RESET_KEYS)[number];
export type TripFromStartKey = (typeof TRIP_FROM_START_KEYS)[number];
export type VehicleOverviewKey = (typeof VEHICLE_OVERVIEW_KEYS)[number];
export type VehicleWarningsKey = (typeof VEHICLE_WARNINGS_KEYS)[number];
export type EcoScoreKey = (typeof ECO_SCORE_KEYS)[number];
export type TyrePressureKey = (typeof TYRE_PRESSURE_KEYS)[number];
export type ChargingOverviewKey = (typeof CHARGING_OVERVIEW_KEYS)[number];

export type CardItemKey =
  | TripOverviewKey
  | TripFromResetKey
  | TripFromStartKey
  | VehicleOverviewKey
  | VehicleWarningsKey
  | EcoScoreKey
  | TyrePressureKey
  | ChargingOverviewKey;

export interface CardItem {
  key: CardItemKey;
  name: string;
  icon?: string;
}
const ICON: Record<CardItemKey | string, string> = {
  // Trip Overview
  odometer: 'mdi:counter',
  adBlueLevel: 'mdi:fuel',
  // Trip Data
  drivenTimeStart: 'mdi:clock',
  drivenTimeZEStart: 'mdi:clock',
  averageSpeedStart: 'mdi:speedometer-slow',
  // Vehicle card
  doorStatusOverall: 'mdi:car-door-lock',
  // Vehicle Warnings
  lowCoolantLevel: 'mdi:car-coolant-level',
  lowBrakeFluid: 'mdi:car-brake-fluid-level',
  // Tyre Pressures
  tirePressureFrontLeft: 'mdi:tire',
  tirePressureFrontRight: 'mdi:tire',
  tirePressureRearLeft: 'mdi:tire',
  tirePressureRearRight: 'mdi:tire',
  // Charging Overview
  chargingPower: 'mdi:flash',
  selectedProgram: 'mdi:ev-station',
};

const createItem = (localize: LocalizeFunc, section: CardSection, key: CardItemKey): CardItem => ({
  key,
  name: localize(`card.${section}.${key}`),
  ...(ICON[key] ? { icon: ICON[key] } : {}),
});

export const computeCardItems = (localize: LocalizeFunc) => ({
  tripCard: {
    overview: TRIP_OVERVIEW_KEYS.map((key) => createItem(localize, 'tripCard', key)),
    fromReset: TRIP_FROM_RESET_KEYS.map((key) => createItem(localize, 'tripCard', key)),
    fromStart: TRIP_FROM_START_KEYS.map((key) => createItem(localize, 'tripCard', key)),
  },
  vehicleCard: {
    overview: VEHICLE_OVERVIEW_KEYS.map((key) => createItem(localize, 'vehicleCard', key)),
    warnings: VEHICLE_WARNINGS_KEYS.map((key) => createItem(localize, 'vehicleCard', key)),
  },
  ecoCard: {
    scores: ECO_SCORE_KEYS.map((key) => createItem(localize, 'ecoCard', key)),
  },
  tyreCard: {
    pressures: TYRE_PRESSURE_KEYS.map((key) => createItem(localize, 'tyreCard', key)),
  },
  chargingOverview: [CHARGING_OVERVIEW_KEYS.map((key) => createItem(localize, 'chargingOverview', key))],
});
