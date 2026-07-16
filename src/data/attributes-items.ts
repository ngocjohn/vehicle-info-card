import { CHARGING_OVERVIEW_KEYS, ChargingOverviewKey, INDICATOR_SECTIONS } from './indicator-items';

export const LOCK_ATTIBUTES_KEYS = [
  'doorlockstatusfrontleft',
  'doorlockstatusfrontright',
  'doorlockstatusrearleft',
  'doorlockstatusrearright',
  'doorlockstatusgas',
] as const;
export type LockAttributesKey = (typeof LOCK_ATTIBUTES_KEYS)[number];

export const DOOR_ATTRIBUTES_KEYS = [
  'decklidstatus',
  'doorstatusfrontleft',
  'doorstatusfrontright',
  'doorstatusrearleft',
  'doorstatusrearright',
  'enginehoodstatus',
  'chargeflapdcstatus',
] as const;
export type DoorAttributesKey = (typeof DOOR_ATTRIBUTES_KEYS)[number];

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
export type WindowAttributesKey = (typeof WINDOW_ATTRIBUTES_KEYS)[number];

export type AttributeItemKey = LockAttributesKey | DoorAttributesKey | WindowAttributesKey;

export const CARD_ATTRIBUTES_SECTION = ['lockAttributes', 'doorAttributes', 'windowAttributes'] as const;
export type CardAttributesSection = (typeof CARD_ATTRIBUTES_SECTION)[number];

export const ATTR_SECTION_ITEMS: Record<CardAttributesSection, readonly AttributeItemKey[]> = {
  lockAttributes: LOCK_ATTIBUTES_KEYS,
  doorAttributes: DOOR_ATTRIBUTES_KEYS,
  windowAttributes: WINDOW_ATTRIBUTES_KEYS,
};

export enum ATTR_SECTION {
  LOCK = 'lockAttributes',
  DOOR = 'doorAttributes',
  WINDOW = 'windowAttributes',
}

export function getAttrSectionType(
  key: AttributeItemKey | ChargingOverviewKey | string
): ATTR_SECTION | INDICATOR_SECTIONS | undefined {
  if (LOCK_ATTIBUTES_KEYS.includes(key as LockAttributesKey)) {
    return ATTR_SECTION.LOCK;
  } else if (DOOR_ATTRIBUTES_KEYS.includes(key as DoorAttributesKey)) {
    return ATTR_SECTION.DOOR;
  } else if (WINDOW_ATTRIBUTES_KEYS.includes(key as WindowAttributesKey)) {
    return ATTR_SECTION.WINDOW;
  } else if (CHARGING_OVERVIEW_KEYS.includes(key as ChargingOverviewKey)) {
    return INDICATOR_SECTIONS.CHARGING_OVERVIEW;
  }
  return undefined;
}

export function getAttributeSectionItems(): Record<CardAttributesSection, readonly AttributeItemKey[]> {
  return ATTR_SECTION_ITEMS;
}

export const NON_ATTR_ENTITY_KEYS = ['chargeflapdcstatus', 'sunroofstatus'] as const;
export type NonAttrEntityKey = (typeof NON_ATTR_ENTITY_KEYS)[number];

export const enum ENTITY_NOT_ATTR {
  CHARGE_FLAP_DC_STATUS = 'chargeflapdcstatus',
  SUNROOF_STATUS = 'sunroofstatus',
}

export const ATTR_MAIN_ENTITY: Record<CardAttributesSection | NonAttrEntityKey | string, string> = {
  chargeflapdcstatus: 'chargeFlapDCStatus',
  sunroofstatus: 'sunroofStatus',
  lockAttributes: 'lockSensor',
  doorAttributes: 'lockSensor',
  windowAttributes: 'windowClosed',
};

export function getMainAttributeEntity(key: AttributeItemKey | NonAttrEntityKey | string): string | undefined {
  if (key in ATTR_MAIN_ENTITY) {
    return ATTR_MAIN_ENTITY[key];
  } else if (getAttrSectionType(key) !== undefined) {
    const section = getAttrSectionType(key) as CardAttributesSection;
    return ATTR_MAIN_ENTITY[section];
  } else {
    return undefined;
  }
}
