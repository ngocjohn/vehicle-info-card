import { localize } from '../localize/localize';

const createState = (locked: string, unlocked: string) => ({
  state: { false: localize(locked), true: localize(unlocked) },
});

const createNameState = (nameKey: string, locked: string, unlocked: string) => ({
  name: localize(nameKey),
  ...createState(locked, unlocked),
});

const createNameStateWithMap = (nameKey: string, stateMap: { [key: string]: string }) => ({
  name: localize(nameKey),
  state: Object.keys(stateMap).reduce(
    (acc, key) => {
      acc[key] = localize(stateMap[key]);
      return acc;
    },
    {} as { [key: string]: string },
  ),
});

export const lockAttributes = {
  doorlockstatusfrontleft: createNameState(
    'lockAttributes.doorlockstatusfrontleft',
    'common.stateLocked',
    'common.stateUnlocked',
  ),
  doorlockstatusfrontright: createNameState(
    'lockAttributes.doorlockstatusfrontright',
    'common.stateLocked',
    'common.stateUnlocked',
  ),
  doorlockstatusrearleft: createNameState(
    'lockAttributes.doorlockstatusrearleft',
    'common.stateLocked',
    'common.stateUnlocked',
  ),
  doorlockstatusrearright: createNameState(
    'lockAttributes.doorlockstatusrearright',
    'common.stateLocked',
    'common.stateUnlocked',
  ),
  doorlockstatusgas: createNameState('lockAttributes.doorlockstatusgas', 'common.stateLocked', 'common.stateUnlocked'),
};

export const doorStatus = {
  '0': localize('common.stateOpen'),
  '1': localize('common.stateClosed'),
  '2': localize('common.stateNotExisting'),
  '3': localize('common.stateUnknown'),
};

export const doorAttributes = {
  decklidstatus: createNameState('doorAttributes.decklidstatus', 'common.stateClosed', 'common.stateOpen'),
  doorstatusfrontleft: createNameState('doorAttributes.doorstatusfrontleft', 'common.stateClosed', 'common.stateOpen'),
  doorstatusfrontright: createNameState(
    'doorAttributes.doorstatusfrontright',
    'common.stateClosed',
    'common.stateOpen',
  ),
  doorstatusrearleft: createNameState('doorAttributes.doorstatusrearleft', 'common.stateClosed', 'common.stateOpen'),
  doorstatusrearright: createNameState('doorAttributes.doorstatusrearright', 'common.stateClosed', 'common.stateOpen'),
  enginehoodstatus: createNameState('doorAttributes.enginehoodstatus', 'common.stateClosed', 'common.stateOpen'),
  sunroofstatus: createNameStateWithMap('doorAttributes.sunroofstatus', {
    '0': 'sunroofState.stateClosed',
    '1': 'sunroofState.stateOpen',
    '2': 'sunroofState.liftingOpen',
    '3': 'sunroofState.running',
    '4': 'sunroofState.antiBoomingPosition',
    '5': 'sunroofState.slidingIntermediate',
    '6': 'sunroofState.liftingIntermediate',
    '7': 'sunroofState.opening',
    '8': 'sunroofState.closing',
    '9': 'sunroofState.antiBoomingLifting',
    '10': 'sunroofState.intermediatePosition',
    '11': 'sunroofState.openingLifting',
    '12': 'sunroofState.closingLifting',
  }),
};

export const lockStates = {
  '0': localize('common.stateUnlocked'),
  '1': localize('common.stateLockedInt'),
  '2': localize('common.stateLocked'),
  '3': localize('common.statePartlyUnlocked'),
  '4': localize('common.stateUnknown'),
};

export const chargeSelectedProgram = {
  '0': 'Standard',
  '1': localize('common.stateUnknown'),
  '2': 'Home',
  '3': 'Work',
};

const createWindowStatus = (nameKey: string) =>
  createNameStateWithMap(nameKey, {
    '2': 'common.stateClosed',
    '0': 'common.stateOpen',
  });

export const windowAttributes = {
  windowstatusrearleft: createWindowStatus('windowAttributes.windowstatusrearleft'),
  windowstatusrearright: createWindowStatus('windowAttributes.windowstatusrearright'),
  windowstatusfrontleft: createWindowStatus('windowAttributes.windowstatusfrontleft'),
  windowstatusfrontright: createWindowStatus('windowAttributes.windowstatusfrontright'),
  windowstatusrearleftblind: createWindowStatus('windowAttributes.windowstatusrearleftblind'),
  windowstatusrearrightblind: createWindowStatus('windowAttributes.windowstatusrearrightblind'),
  windowstatusfrontleftblind: createWindowStatus('windowAttributes.windowstatusfrontleftblind'),
  windowstatusfrontrightblind: createWindowStatus('windowAttributes.windowstatusfrontrightblind'),
};

export const starterBattery = {
  '0': localize('starterBattery.stateOk'),
  '1': localize('starterBattery.partlyCharged'),
  '2': localize('starterBattery.notAvailable'),
  '3': localize('starterBattery.remoteServiceDisabled'),
  '4': localize('starterBattery.vehicleNoLongerAvailable'),
};
