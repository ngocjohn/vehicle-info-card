import { localize } from '../localize/localize';

const createState = (locked: string, unlocked: string, lang: string) => ({
  state: { false: localize(locked, lang), true: localize(unlocked, lang) },
});

const createNameState = (nameKey: string, locked: string, unlocked: string, lang: string) => ({
  name: localize(nameKey, lang),
  ...createState(locked, unlocked, lang),
});

const createNameStateWithMap = (nameKey: string, stateMap: { [key: string]: string }, lang: string) => ({
  name: localize(nameKey, lang),
  state: Object.keys(stateMap).reduce(
    (acc, key) => {
      acc[key] = localize(stateMap[key], lang);
      return acc;
    },
    {} as { [key: string]: string },
  ),
});

const createDoorStatus = (lang: string) => ({
  '0': localize('common.stateOpen', lang),
  '1': localize('common.stateClosed', lang),
  '2': localize('common.stateNotExisting', lang),
  '3': localize('common.stateUnknown', lang),
});

const createLockStates = (lang: string) => ({
  '0': localize('common.stateUnlocked', lang),
  '1': localize('common.stateLockedInt', lang),
  '2': localize('common.stateLocked', lang),
  '3': localize('common.statePartlyUnlocked', lang),
  '4': localize('common.stateUnknown', lang),
});

const createChargeSelectedProgram = (lang: string) => ({
  '0': 'Standard',
  '1': localize('common.stateUnknown', lang),
  '2': 'Home',
  '3': 'Work',
});

const createWindowStatus = (nameKey: string, lang: string) =>
  createNameStateWithMap(
    nameKey,
    {
      '2': 'common.stateClosed',
      '0': 'common.stateOpen',
    },
    lang,
  );

const createStarterBattery = (lang: string) => ({
  '0': localize('starterBattery.stateOk', lang),
  '1': localize('starterBattery.partlyCharged', lang),
  '2': localize('starterBattery.notAvailable', lang),
  '3': localize('starterBattery.remoteServiceDisabled', lang),
  '4': localize('starterBattery.vehicleNoLongerAvailable', lang),
});

export const lockAttributes = (lang: string) => ({
  doorlockstatusfrontleft: createNameState(
    'lockAttributes.doorlockstatusfrontleft',
    'common.stateLocked',
    'common.stateUnlocked',
    lang,
  ),
  doorlockstatusfrontright: createNameState(
    'lockAttributes.doorlockstatusfrontright',
    'common.stateLocked',
    'common.stateUnlocked',
    lang,
  ),
  doorlockstatusrearleft: createNameState(
    'lockAttributes.doorlockstatusrearleft',
    'common.stateLocked',
    'common.stateUnlocked',
    lang,
  ),
  doorlockstatusrearright: createNameState(
    'lockAttributes.doorlockstatusrearright',
    'common.stateLocked',
    'common.stateUnlocked',
    lang,
  ),
  doorlockstatusgas: createNameState(
    'lockAttributes.doorlockstatusgas',
    'common.stateLocked',
    'common.stateUnlocked',
    lang,
  ),
});

export const doorStatus = createDoorStatus;

export const doorAttributes = (lang: string) => ({
  decklidstatus: createNameState('doorAttributes.decklidstatus', 'common.stateClosed', 'common.stateOpen', lang),
  doorstatusfrontleft: createNameState(
    'doorAttributes.doorstatusfrontleft',
    'common.stateClosed',
    'common.stateOpen',
    lang,
  ),
  doorstatusfrontright: createNameState(
    'doorAttributes.doorstatusfrontright',
    'common.stateClosed',
    'common.stateOpen',
    lang,
  ),
  doorstatusrearleft: createNameState(
    'doorAttributes.doorstatusrearleft',
    'common.stateClosed',
    'common.stateOpen',
    lang,
  ),
  doorstatusrearright: createNameState(
    'doorAttributes.doorstatusrearright',
    'common.stateClosed',
    'common.stateOpen',
    lang,
  ),
  enginehoodstatus: createNameState('doorAttributes.enginehoodstatus', 'common.stateClosed', 'common.stateOpen', lang),
  sunroofstatus: createNameStateWithMap(
    'doorAttributes.sunroofstatus',
    {
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
    },
    lang,
  ),
});

export const lockStates = createLockStates;
export const starterBattery = createStarterBattery;
export const chargeSelectedProgram = createChargeSelectedProgram;

export const windowAttributes = (lang: string) => ({
  windowstatusrearleft: createWindowStatus('windowAttributes.windowstatusrearleft', lang),
  windowstatusrearright: createWindowStatus('windowAttributes.windowstatusrearright', lang),
  windowstatusfrontleft: createWindowStatus('windowAttributes.windowstatusfrontleft', lang),
  windowstatusfrontright: createWindowStatus('windowAttributes.windowstatusfrontright', lang),
  windowstatusrearleftblind: createWindowStatus('windowAttributes.windowstatusrearleftblind', lang),
  windowstatusrearrightblind: createWindowStatus('windowAttributes.windowstatusrearrightblind', lang),
  windowstatusfrontleftblind: createWindowStatus('windowAttributes.windowstatusfrontleftblind', lang),
  windowstatusfrontrightblind: createWindowStatus('windowAttributes.windowstatusfrontrightblind', lang),
});
