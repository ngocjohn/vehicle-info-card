import { forEach } from 'es-toolkit/compat';
import { LocalizeFunc } from 'types';

export const CARD_SECTION = ['tripCard', 'vehicleCard', 'ecoCard', 'tyreCard'] as const;
export const CARD_ATTRIBUTES_SECTION = ['lockAttributes', 'doorAttributes', 'windowAttributes'] as const;
export const CARD_INDICATOR_SECTION = ['chargingOverview'] as const;

export enum ATTR_SECTON_TYPE {
  LOCK = 'lockAttributes',
  DOOR = 'doorAttributes',
  WINDOW = 'windowAttributes',
}
export enum CARD_SECTON_TYPE {
  TRIP = 'tripCard',
  VEHICLE = 'vehicleCard',
  ECO = 'ecoCard',
  TYRE = 'tyreCard',
}

export type CardSection = (typeof CARD_SECTION)[number];
export type CardAttributesSection = (typeof CARD_ATTRIBUTES_SECTION)[number];
export type CardIndicatorSection = (typeof CARD_INDICATOR_SECTION)[number];

export type CardSectionType = CardSection | CardAttributesSection | CardIndicatorSection;

export interface CardItem {
  key: CardItemKey;
  name: string;
  icon?: string;
}

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
  'ecoScoreBonusRange',
  'ecoScoreAcceleration',
  'ecoScoreConstant',
  'ecoScoreFreeWheel',
] as const;

export const TYRE_PRESSURE_KEYS = [
  'tirePressureFrontLeft',
  'tirePressureFrontRight',
  'tirePressureRearLeft',
  'tirePressureRearRight',
] as const;

export const CHARGING_OVERVIEW_KEYS = ['chargingPower', 'soc', 'maxSoc', 'selectedProgram'] as const;

export const LOCK_ATTIBUTES_KEYS = [
  'doorlockstatusfrontleft',
  'doorlockstatusfrontright',
  'doorlockstatusrearleft',
  'doorlockstatusrearright',
  'doorlockstatusgas',
] as const;

export const DOOR_ATTRIBUTES_KEYS = [
  'decklidstatus',
  'doorstatusfrontleft',
  'doorstatusfrontright',
  'doorstatusrearleft',
  'doorstatusrearright',
  'enginehoodstatus',
  'chargeflapdcstatus',
] as const;

export const WINDOW_ATTRIBUTES_KEYS = [
  'windowstatusrearleft',
  'windowstatusrearright',
  'windowstatusfrontleft',
  'windowstatusfrontright',
  'windowstatusrearleftblind',
  'windowstatusrearrightblind',
  'windowstatusfrontleftblind',
  'windowstatusfrontrightblind',
  'sunroofstatus',
] as const;

export type TripOverviewKey = (typeof TRIP_OVERVIEW_KEYS)[number];
export type TripFromResetKey = (typeof TRIP_FROM_RESET_KEYS)[number];
export type TripFromStartKey = (typeof TRIP_FROM_START_KEYS)[number];

export type VehicleOverviewKey = (typeof VEHICLE_OVERVIEW_KEYS)[number];
export type VehicleWarningsKey = (typeof VEHICLE_WARNINGS_KEYS)[number];

export type EcoScoreKey = (typeof ECO_SCORE_KEYS)[number];

export type TyrePressureKey = (typeof TYRE_PRESSURE_KEYS)[number];

export type ChargingOverviewKey = (typeof CHARGING_OVERVIEW_KEYS)[number];

export type LockAttributesKey = (typeof LOCK_ATTIBUTES_KEYS)[number];
export type DoorAttributesKey = (typeof DOOR_ATTRIBUTES_KEYS)[number];
export type WindowAttributesKey = (typeof WINDOW_ATTRIBUTES_KEYS)[number];

export type AttributeItemKey = LockAttributesKey | DoorAttributesKey | WindowAttributesKey;

export type CardItemKey =
  | TripOverviewKey
  | TripFromResetKey
  | TripFromStartKey
  | VehicleOverviewKey
  | VehicleWarningsKey
  | EcoScoreKey
  | TyrePressureKey
  | ChargingOverviewKey
  | AttributeItemKey;

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

export const ATTR_SECTION_ITEMS: Record<CardAttributesSection, readonly AttributeItemKey[]> = {
  lockAttributes: LOCK_ATTIBUTES_KEYS,
  doorAttributes: DOOR_ATTRIBUTES_KEYS,
  windowAttributes: WINDOW_ATTRIBUTES_KEYS,
};

const createItem = (localize: LocalizeFunc, section: CardSectionType, key: CardItemKey): CardItem => {
  if (key === 'sunroofstatus') {
    section = 'doorAttributes';
  }
  return {
    key,
    name: localize(`card.${section}.${key}`),
    ...(ICON[key] ? { icon: ICON[key] } : {}),
  };
};

export const computeCardItems = (localize: LocalizeFunc) => {
  const sections = {
    tripCard: {
      overview: TRIP_OVERVIEW_KEYS,
      fromReset: TRIP_FROM_RESET_KEYS,
      fromStart: TRIP_FROM_START_KEYS,
    },
    vehicleCard: {
      overview: VEHICLE_OVERVIEW_KEYS,
      warnings: VEHICLE_WARNINGS_KEYS,
    },
    ecoCard: ECO_SCORE_KEYS,
    tyreCard: TYRE_PRESSURE_KEYS,
    chargingOverview: CHARGING_OVERVIEW_KEYS,
    lockAttributes: LOCK_ATTIBUTES_KEYS,
    doorAttributes: DOOR_ATTRIBUTES_KEYS,
    windowAttributes: WINDOW_ATTRIBUTES_KEYS,
  };

  const cardItems: any = {};

  forEach(sections, (sectionValue, sectionKey) => {
    if (Array.isArray(sectionValue)) {
      // Simple array of keys
      cardItems[sectionKey] = sectionValue.map((key) => createItem(localize, sectionKey as CardSectionType, key));
    } else {
      // Nested object of subsections
      cardItems[sectionKey] = {};
      forEach(sectionValue, (subsectionValue, subsectionKey) => {
        cardItems[sectionKey][subsectionKey] = [...subsectionValue].map((key) =>
          createItem(localize, sectionKey as CardSectionType, key)
        );
      });
    }
  });

  return cardItems;
};

export function findCardItemByKey(obj: any, key: string): CardItem | undefined {
  if (!obj) return undefined;

  // Case 1: it's an array → inspect each item
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = findCardItemByKey(item, key);
      if (result) return result;
    }
    return undefined;
  }

  // Case 2: it's an object with "key" property → match found
  if (typeof obj === 'object' && 'key' in obj) {
    return obj.key === key ? obj : undefined;
  }

  // Case 3: it's a nested object → search each property
  if (typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      const result = findCardItemByKey(value, key);
      if (result) return result;
    }
  }

  return undefined;
}

export function getAttrSectionType(key: AttributeItemKey | string): ATTR_SECTON_TYPE | undefined {
  if (LOCK_ATTIBUTES_KEYS.includes(key as LockAttributesKey)) {
    return ATTR_SECTON_TYPE.LOCK;
  } else if (DOOR_ATTRIBUTES_KEYS.includes(key as DoorAttributesKey)) {
    return ATTR_SECTON_TYPE.DOOR;
  } else if (WINDOW_ATTRIBUTES_KEYS.includes(key as WindowAttributesKey)) {
    return ATTR_SECTON_TYPE.WINDOW;
  }
  return undefined;
}
