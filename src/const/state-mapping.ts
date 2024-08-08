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
  '0': localize('card.common.stateOpen', lang),
  '1': localize('card.common.stateClosed', lang),
  '2': localize('card.common.stateNotExisting', lang),
  '3': localize('card.common.stateUnknown', lang),
});

const createLockStates = (lang: string) => ({
  '0': localize('card.common.stateUnlocked', lang),
  '1': localize('card.common.stateLockedInt', lang),
  '2': localize('card.common.stateLocked', lang),
  '3': localize('card.common.statePartlyUnlocked', lang),
  '4': localize('card.common.stateUnknown', lang),
});

const createChargeSelectedProgram = (lang: string) => ({
  '0': 'Standard',
  '1': localize('card.common.stateUnknown', lang),
  '2': 'Home',
  '3': 'Work',
});

const createWindowStatus = (nameKey: string, lang: string) =>
  createNameStateWithMap(
    nameKey,
    {
      '2': 'card.common.stateClosed',
      '0': 'card.common.stateOpen',
    },
    lang,
  );

const createStarterBattery = (lang: string) => ({
  '0': localize('card.starterBattery.stateOk', lang),
  '1': localize('card.starterBattery.partlyCharged', lang),
  '2': localize('card.starterBattery.notAvailable', lang),
  '3': localize('card.starterBattery.remoteServiceDisabled', lang),
  '4': localize('card.starterBattery.vehicleNoLongerAvailable', lang),
});

export const lockAttributes = (lang: string) => ({
  doorlockstatusfrontleft: createNameState(
    'card.lockAttributes.doorlockstatusfrontleft',
    'card.common.stateLocked',
    'card.common.stateUnlocked',
    lang,
  ),
  doorlockstatusfrontright: createNameState(
    'card.lockAttributes.doorlockstatusfrontright',
    'card.common.stateLocked',
    'card.common.stateUnlocked',
    lang,
  ),
  doorlockstatusrearleft: createNameState(
    'card.lockAttributes.doorlockstatusrearleft',
    'card.common.stateLocked',
    'card.common.stateUnlocked',
    lang,
  ),
  doorlockstatusrearright: createNameState(
    'card.lockAttributes.doorlockstatusrearright',
    'card.common.stateLocked',
    'card.common.stateUnlocked',
    lang,
  ),
  doorlockstatusgas: createNameState(
    'card.lockAttributes.doorlockstatusgas',
    'card.common.stateLocked',
    'card.common.stateUnlocked',
    lang,
  ),
});

export const doorStatus = createDoorStatus;

export const doorAttributes = (lang: string) => ({
  decklidstatus: createNameState(
    'card.doorAttributes.decklidstatus',
    'card.common.stateClosed',
    'card.common.stateOpen',
    lang,
  ),
  doorstatusfrontleft: createNameState(
    'card.doorAttributes.doorstatusfrontleft',
    'card.common.stateClosed',
    'card.common.stateOpen',
    lang,
  ),
  doorstatusfrontright: createNameState(
    'card.doorAttributes.doorstatusfrontright',
    'card.common.stateClosed',
    'card.common.stateOpen',
    lang,
  ),
  doorstatusrearleft: createNameState(
    'card.doorAttributes.doorstatusrearleft',
    'card.common.stateClosed',
    'card.common.stateOpen',
    lang,
  ),
  doorstatusrearright: createNameState(
    'card.doorAttributes.doorstatusrearright',
    'card.common.stateClosed',
    'card.common.stateOpen',
    lang,
  ),
  enginehoodstatus: createNameState(
    'card.doorAttributes.enginehoodstatus',
    'card.common.stateClosed',
    'card.common.stateOpen',
    lang,
  ),
  sunroofstatus: createNameStateWithMap(
    'card.doorAttributes.sunroofstatus',
    {
      '0': 'card.sunroofState.stateClosed',
      '1': 'card.sunroofState.stateOpen',
      '2': 'card.sunroofState.liftingOpen',
      '3': 'card.sunroofState.running',
      '4': 'card.sunroofState.antiBoomingPosition',
      '5': 'card.sunroofState.slidingIntermediate',
      '6': 'card.sunroofState.liftingIntermediate',
      '7': 'card.sunroofState.opening',
      '8': 'card.sunroofState.closing',
      '9': 'card.sunroofState.antiBoomingLifting',
      '10': 'card.sunroofState.intermediatePosition',
      '11': 'card.sunroofState.openingLifting',
      '12': 'card.sunroofState.closingLifting',
    },
    lang,
  ),
});

export const lockStates = createLockStates;
export const starterBattery = createStarterBattery;
export const chargeSelectedProgram = createChargeSelectedProgram;

export const windowAttributes = (lang: string) => ({
  windowstatusrearleft: createWindowStatus('card.windowAttributes.windowstatusrearleft', lang),
  windowstatusrearright: createWindowStatus('card.windowAttributes.windowstatusrearright', lang),
  windowstatusfrontleft: createWindowStatus('card.windowAttributes.windowstatusfrontleft', lang),
  windowstatusfrontright: createWindowStatus('card.windowAttributes.windowstatusfrontright', lang),
  windowstatusrearleftblind: createWindowStatus('card.windowAttributes.windowstatusrearleftblind', lang),
  windowstatusrearrightblind: createWindowStatus('card.windowAttributes.windowstatusrearrightblind', lang),
  windowstatusfrontleftblind: createWindowStatus('card.windowAttributes.windowstatusfrontleftblind', lang),
  windowstatusfrontrightblind: createWindowStatus('card.windowAttributes.windowstatusfrontrightblind', lang),
});
