import { LocalizeFunc } from 'types';

import { LOCK_ATTIBUTES_KEYS, DOOR_ATTRIBUTES_KEYS, WINDOW_ATTRIBUTES_KEYS, AttributeItemKey } from './card-item';
import { CardAttributesSection } from './card-item';

type StateDisplay = {
  [key: string]: string;
};

export interface StateMapping {
  [key: string]: StateDisplay;
}

export type AttributeStateMapping = Record<keyof AttributeItemKey, StateDisplay>;
export type StateDisplayManager = StateMapping & AttributeStateMapping;

const SECTORS: Record<CardAttributesSection, readonly string[]> = {
  lockAttributes: LOCK_ATTIBUTES_KEYS,
  doorAttributes: DOOR_ATTRIBUTES_KEYS,
  windowAttributes: WINDOW_ATTRIBUTES_KEYS,
};

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

const createNameState = (localize: LocalizeFunc, stateMap: StateDisplay, sector: string = 'common'): StateDisplay => ({
  ...Object.keys(stateMap).reduce((acc, key) => {
    acc[key] = ['Standard', 'Home', 'Work'].includes(stateMap[key])
      ? stateMap[key]
      : localize(`card.${sector}.${stateMap[key]}`);
    return acc;
  }, {} as { [key: string]: string }),
});

const createAttributeStateMapping = (
  localize: LocalizeFunc,
  sector: CardAttributesSection,
  stateMapping: StateDisplay
): AttributeStateMapping => {
  const attributeKeys = SECTORS[sector];
  const mapping: Record<string, StateDisplay> = {};
  attributeKeys.forEach((key) => {
    stateMapping = key === 'chargeflapdcstatus' ? FLAP_STATES : key === 'sunroofstatus' ? SUNROOF_STATES : stateMapping;

    mapping[key] = createNameState(localize, stateMapping, key === 'sunroofstatus' ? 'sunroofState' : undefined);
  });
  return mapping as AttributeStateMapping;
};

export const computeStateMappingWithAttributes = (localize: LocalizeFunc): Record<string, AttributeStateMapping> => ({
  lockAttributes: createAttributeStateMapping(localize, 'lockAttributes', LOCKED_UNLOCKED),
  doorAttributes: createAttributeStateMapping(localize, 'doorAttributes', DOOR_BOOLEAN_STATES),
  windowAttributes: createAttributeStateMapping(localize, 'windowAttributes', WINDOW_STATES),
});

export const computeStateMapping = (localize: LocalizeFunc): StateMapping => ({
  lockStatus: createNameState(localize, LOCK_STATES),
  doorStatus: createNameState(localize, DOOR_STATES),
  chargeSelectedProgram: createNameState(localize, CHARGE_PROGRAMS),
  starterBattery: createNameState(localize, STARTER_BATTERY_STATES, 'starterBattery'),
  ignitionStatus: createNameState(localize, IGNITION_STATES, 'ignitionState'),
});

export const getStateDisplay = (localize: LocalizeFunc): StateDisplayManager =>
  ({
    ...computeStateMapping(localize),
    ...computeStateMappingWithAttributes(localize),
  } as StateDisplayManager);
