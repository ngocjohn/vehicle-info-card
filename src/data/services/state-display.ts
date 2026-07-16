import { LocalizeFunc } from 'types';

import {
  AttributeItemKey,
  CardAttributesSection,
  ATTR_SECTION_ITEMS,
  getAttrSectionType,
  CARD_ATTRIBUTES_SECTION,
} from '../attributes-items';

type StateDisplay = {
  [key: string]: string;
};

export interface StateMapping {
  [key: string]: StateDisplay;
}

export type AttributeStateMapping = Record<keyof AttributeItemKey, StateDisplay>;
export type StateDisplayManager = StateMapping & AttributeStateMapping;

export const LOCK_STATES: StateDisplay = {
  '0': 'stateUnlocked',
  '1': 'stateLockedInt',
  '2': 'stateLocked',
  '3': 'statePartlyUnlocked',
  '4': 'stateUnknown',
};

export const DOOR_STATES: StateDisplay = {
  '0': 'stateOpen',
  '1': 'stateClosed',
  '2': 'stateNotExisting',
  '3': 'stateUnknown',
};

export const CHARGE_PROGRAMS: StateDisplay = {
  '0': 'Standard',
  '1': 'stateUnknown',
  '2': 'Home',
  '3': 'Work',
};

export const STARTER_BATTERY_STATES: StateDisplay = {
  '0': 'stateOk',
  '1': 'partlyCharged',
  '2': 'notAvailable',
  '3': 'remoteServiceDisabled',
  '4': 'vehicleNoLongerAvailable',
};

export const IGNITION_STATES: StateDisplay = {
  '0': 'ignitionLock',
  '1': 'ignitionOff',
  '2': 'ignitionAccessory',
  '3': 'ignitionOn',
  '5': 'ignitionStart',
};

export const SUNROOF_STATES: StateDisplay = {
  '0': 'stateClosed',
  '1': 'stateOpen',
  '2': 'liftingOpen',
  '3': 'running',
  '4': 'antiBoomingPosition',
  '5': 'slidingIntermediate',
  '6': 'liftingIntermediate',
  '7': 'opening',
  '8': 'closing',
  '9': 'antiBoomingLifting',
  '10': 'intermediatePosition',
  '11': 'openingLifting',
  '12': 'closingLifting',
};
export const LOCKED_UNLOCKED: StateDisplay = {
  false: 'stateLocked',
  true: 'stateUnlocked',
};

export const DOOR_BOOLEAN_STATES: StateDisplay = {
  true: 'stateOpen',
  false: 'stateClosed',
};

export const WINDOW_STATES: StateDisplay = {
  '0': 'stateOpen',
  '2': 'stateClosed',
};

export const FLAP_STATES: StateDisplay = {
  '0': 'stateOpen',
  '1': 'stateClosed',
  '2': 'statePressed',
  '3': 'stateUnknown',
};

export const PARK_BRAKE_STATES: StateDisplay = {
  off: 'stateParkBrakeOff',
  on: 'stateParkBrakeOn',
};
const STATE_DISPLAY_ITEMS: Record<string, StateDisplay> = {
  lockSensor: LOCK_STATES,
  doorStatusOverall: DOOR_BOOLEAN_STATES,
  selectedProgram: CHARGE_PROGRAMS,
  starterBattery: STARTER_BATTERY_STATES,
  ignitionState: IGNITION_STATES,
  sunroofstatus: SUNROOF_STATES,
  chargeflapdcstatus: FLAP_STATES,
  parkBrake: PARK_BRAKE_STATES,
  lockAttributes: LOCKED_UNLOCKED,
  doorAttributes: DOOR_BOOLEAN_STATES,
  windowAttributes: WINDOW_STATES,
};

const CARD_LOCALIZE_SECTIONS: Record<string, string> = {
  starterBattery: 'starterBattery',
  ignitionState: 'ignitionState',
  sunroofstatus: 'sunroofState',
};

export function getStateDisplayType(key: string): StateDisplay | undefined {
  if (key in STATE_DISPLAY_ITEMS) {
    return STATE_DISPLAY_ITEMS[key];
  } else if (getAttrSectionType(key) !== undefined) {
    const section = getAttrSectionType(key) as CardAttributesSection;
    return STATE_DISPLAY_ITEMS[section];
  }
  return undefined;
}

export function getLocalizeSection(key: string): string | undefined {
  if (key in CARD_LOCALIZE_SECTIONS) {
    return CARD_LOCALIZE_SECTIONS[key];
  }
  return undefined;
}

export const createNameState = (
  localize: LocalizeFunc,
  stateMap: StateDisplay,
  sector: string = 'common'
): StateDisplay => ({
  ...Object.keys(stateMap).reduce((acc, key) => {
    acc[key] = ['Standard', 'Home', 'Work'].includes(stateMap[key])
      ? stateMap[key]
      : localize(`card.${sector}.${stateMap[key]}`);
    return acc;
  }, {} as { [key: string]: string }),
});

export const computeStateManager = (localize: LocalizeFunc): StateDisplayManager => {
  const manager: StateDisplayManager = {} as StateDisplayManager;
  Object.keys(STATE_DISPLAY_ITEMS).forEach((key) => {
    if (CARD_ATTRIBUTES_SECTION.includes(key as CardAttributesSection)) {
      const mapping: Record<string, AttributeStateMapping> = {};
      const attributeKeys = ATTR_SECTION_ITEMS[key as CardAttributesSection];
      const stateMapping: Record<string, StateDisplay> = {};
      attributeKeys.forEach((attrKey) => {
        const stateDisplayType = getStateDisplayType(attrKey);
        const sectorLocalize = getLocalizeSection(attrKey);
        if (stateDisplayType) {
          stateMapping[attrKey] = createNameState(localize, stateDisplayType, sectorLocalize);
        }
      });
      mapping[key] = stateMapping as AttributeStateMapping;
      Object.assign(manager, mapping);
    } else {
      const stateDisplayType = getStateDisplayType(key);
      if (stateDisplayType) {
        manager[key] = createNameState(localize, stateDisplayType, getLocalizeSection(key));
      }
    }
  });
  return manager;
};
