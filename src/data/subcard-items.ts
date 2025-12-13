export const TRIP_OVERVIEW_KEYS = [
  'odometer',
  'fuelLevel',
  'adBlueLevel',
  'rangeLiquid',
  'rangeElectric',
  'soc',
  'maxSoc',
] as const;

export type TripOverviewKey = (typeof TRIP_OVERVIEW_KEYS)[number];

export const TRIP_FROM_RESET_KEYS = [
  'distanceReset',
  'drivenTimeReset',
  'distanceZEReset',
  'drivenTimeZEReset',
  'averageSpeedReset',
  'liquidConsumptionReset',
  'electricConsumptionReset',
] as const;
export type TripFromResetKey = (typeof TRIP_FROM_RESET_KEYS)[number];

export const TRIP_FROM_START_KEYS = [
  'distanceStart',
  'drivenTimeStart',
  'distanceZEStart',
  'drivenTimeZEStart',
  'averageSpeedStart',
  'liquidConsumptionStart',
  'electricConsumptionStart',
] as const;

export type TripFromStartKey = (typeof TRIP_FROM_START_KEYS)[number];

export type TripCardItemKey = TripOverviewKey | TripFromResetKey | TripFromStartKey;
export const TRIP_CARD_SECTIONS = ['overview', 'fromReset', 'fromStart'] as const;
export type TripCardSection = (typeof TRIP_CARD_SECTIONS)[number];

export const TRIP_CARD_ITEMS: Record<TripCardSection, readonly TripCardItemKey[]> = {
  overview: TRIP_OVERVIEW_KEYS,
  fromReset: TRIP_FROM_RESET_KEYS,
  fromStart: TRIP_FROM_START_KEYS,
};

export const VEHICLE_OVERVIEW_KEYS = [
  'lockSensor',
  'windowsClosed',
  'doorStatusOverall',
  'parkBrake',
  'ignitionState',
] as const;
export type VehicleOverviewKey = (typeof VEHICLE_OVERVIEW_KEYS)[number];

export const VEHICLE_WARNINGS_KEYS = [
  'starterBatteryState',
  'lowCoolantLevel',
  'lowBrakeFluid',
  'lowWashWater',
  'tirePressureWarning',
] as const;
export type VehicleWarningsKey = (typeof VEHICLE_WARNINGS_KEYS)[number];

export type VehicleCardItemKey = VehicleOverviewKey | VehicleWarningsKey;

export const VEHICLE_CARD_SECTIONS = ['overview', 'warnings'] as const;
export type VehicleCardSection = (typeof VEHICLE_CARD_SECTIONS)[number];

export const VEHICLE_CARD_ITEMS: Record<VehicleCardSection, readonly VehicleCardItemKey[]> = {
  overview: VEHICLE_OVERVIEW_KEYS,
  warnings: VEHICLE_WARNINGS_KEYS,
};

export const ECO_SCORE_KEYS = [
  'ecoScoreBonusRange',
  'ecoScoreAcceleration',
  'ecoScoreConstant',
  'ecoScoreFreeWheel',
] as const;
export type EcoScoreKey = (typeof ECO_SCORE_KEYS)[number];

export const TYRE_PRESSURE_KEYS = [
  'tirePressureFrontLeft',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
] as const;
export type TyrePressureKey = (typeof TYRE_PRESSURE_KEYS)[number];

export type SubCardItemKey = TripCardItemKey | VehicleCardItemKey | EcoScoreKey | TyrePressureKey;

export const SubCardSections = ['tripCard', 'vehicleCard', 'ecoCard', 'tyreCard'] as const;
export type SubCardSection = (typeof SubCardSections)[number];

export enum SUBCARD {
  TRIP = 'tripCard',
  VEHICLE = 'vehicleCard',
  ECO = 'ecoCard',
  TYRE = 'tyreCard',
}

export interface SubCardItems {
  tripCard: Record<TripCardSection, readonly TripCardItemKey[]>;
  vehicleCard: Record<VehicleCardSection, readonly VehicleCardItemKey[]>;
  ecoCard: readonly EcoScoreKey[];
  tyreCard: readonly TyrePressureKey[];
}

export function getSubCardItems(): SubCardItems {
  return {
    tripCard: TRIP_CARD_ITEMS,
    vehicleCard: VEHICLE_CARD_ITEMS,
    ecoCard: ECO_SCORE_KEYS,
    tyreCard: TYRE_PRESSURE_KEYS,
  };
}
