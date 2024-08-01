import { localize } from '../localize/localize';

export const lockAttributes = {
  doorlockstatusfrontleft: {
    state: { false: localize('common.stateLocked'), true: localize('common.stateUnlocked') },
    name: localize('lockAttributes.doorlockstatusfrontleft'),
  },
  doorlockstatusfrontright: {
    state: { false: localize('common.stateLocked'), true: localize('common.stateUnlocked') },
    name: localize('lockAttributes.doorlockstatusfrontright'),
  },
  doorlockstatusrearleft: {
    state: { false: localize('common.stateLocked'), true: localize('common.stateUnlocked') },
    name: localize('lockAttributes.doorlockstatusrearleft'),
  },
  doorlockstatusrearright: {
    state: { false: localize('common.stateLocked'), true: localize('common.stateUnlocked') },
    name: localize('lockAttributes.doorlockstatusrearright'),
  },
  doorlockstatusgas: {
    state: { false: localize('common.stateLocked'), true: localize('common.stateUnlocked') },
    name: localize('lockAttributes.doorlockstatusgas'),
  },
};

export const doorStatus = {
  '0': localize('common.stateOpen'), // Open
  '1': localize('common.stateClosed'), // Closed
  '2': localize('common.stateNotExisting'), // Not existing
  '3': localize('common.stateUnknown'), // Unknown
};

export const doorAttributes = {
  decklidstatus: {
    name: localize('doorAttributes.decklidstatus'),
    state: { false: localize('common.stateClosed'), true: localize('common.stateOpen') },
  },
  doorstatusfrontleft: {
    name: localize('doorAttributes.doorstatusfrontleft'),
    state: { false: localize('common.stateClosed'), true: localize('common.stateOpen') },
  },
  doorstatusfrontright: {
    name: localize('doorAttributes.doorstatusfrontright'),
    state: { false: localize('common.stateClosed'), true: localize('common.stateOpen') },
  },
  doorstatusrearleft: {
    name: localize('doorAttributes.doorstatusrearleft'),
    state: { false: localize('common.stateClosed'), true: localize('common.stateOpen') },
  },
  doorstatusrearright: {
    name: localize('doorAttributes.doorstatusrearright'),
    state: { false: localize('common.stateClosed'), true: localize('common.stateOpen') },
  },
  enginehoodstatus: {
    name: localize('doorAttributes.enginehoodstatus'),
    state: { false: localize('common.stateClosed'), true: localize('common.stateOpen') },
  },
  sunroofstatus: {
    name: localize('doorAttributes.sunroofstatus'),
    state: {
      '0': localize('sunroofState.stateClosed'), // Default: Closed
      '1': localize('sunroofState.stateOpen'), // Default: Open
      '2': localize('sunroofState.liftingOpen'), // Default: Lifting open
      '3': localize('sunroofState.running'), // Default: Running
      '4': localize('sunroofState.antiBoomingPosition'), // Default: Anti-booming position
      '5': localize('sunroofState.slidingIntermediate'), // Default: Sliding intermediate
      '6': localize('sunroofState.liftingIntermediate'), // Default: Lifting intermediate
      '7': localize('sunroofState.opening'), // Default: Opening
      '8': localize('sunroofState.closing'), // Default: Closing
      '9': localize('sunroofState.antiBoomingLifting'), // Default: Anti-booming lifting
      '10': localize('sunroofState.intermediatePosition'), // Default: Intermediate position
      '11': localize('sunroofState.openingLifting'), // Default: Opening lifting
      '12': localize('sunroofState.closingLifting'), // Default: Closing lifting
    },
  },
};

export const lockStates = {
  '0': localize('common.stateUnlocked'), // Unlocked
  '1': localize('common.stateLockedInt'), // Locked int
  '2': localize('common.stateLocked'), // Locked
  '3': localize('common.statePartlyUnlocked'), // Partly unlocked
  '4': localize('common.stateUnknown'), // Unknown
};

export const chargeSelectedProgram = {
  '0': 'Standard',
  '1': localize('common.stateUnknown'),
  '2': 'Home',
  '3': 'Work',
};

export const windowAttributes = {
  windowstatusrearleft: {
    name: localize('windowAttributes.windowstatusrearleft'),
    state: {
      2: localize('common.stateClosed'),
      0: localize('common.stateOpen'),
    },
  },
  windowstatusrearright: {
    name: localize('windowAttributes.windowstatusrearright'),
    state: {
      2: localize('common.stateClosed'),
      0: localize('common.stateOpen'),
    },
  },
  windowstatusfrontleft: {
    name: localize('windowAttributes.windowstatusfrontleft'),
    state: {
      2: localize('common.stateClosed'),
      0: localize('common.stateOpen'),
    },
  },
  windowstatusfrontright: {
    name: localize('windowAttributes.windowstatusfrontright'),
    state: {
      2: localize('common.stateClosed'),
      0: localize('common.stateOpen'),
    },
  },
  windowstatusrearleftblind: {
    name: localize('windowAttributes.windowstatusrearleftblind'),
    state: {
      2: localize('common.stateClosed'),
      0: localize('common.stateOpen'),
    },
  },
  windowstatusrearrightblind: {
    name: localize('windowAttributes.windowstatusrearrightblind'),
    state: {
      2: localize('common.stateClosed'),
      0: localize('common.stateOpen'),
    },
  },
  windowstatusfrontleftblind: {
    name: localize('windowAttributes.windowstatusfrontleftblind'),
    state: {
      2: localize('common.stateClosed'),
      0: localize('common.stateOpen'),
    },
  },
  windowstatusfrontrightblind: {
    name: localize('windowAttributes.windowstatusfrontrightblind'),
    state: {
      2: localize('common.stateClosed'),
      0: localize('common.stateOpen'),
    },
  },
};

export const starterBattery = {
  '0': localize('starterBattery.stateOk'), // OK
  '1': localize('starterBattery.partlyCharged'), // Partly charged
  '2': localize('starterBattery.notAvailable'), // Not available
  '3': localize('starterBattery.remoteServiceDisabled'), // Remote service disabled
  '4': localize('starterBattery.vehicleNoLongerAvailable'), // Vehicle no longer available
};
