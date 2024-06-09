export const CARD_VERSION = '1.0.1';

export const cardTypes = ['tripCards', 'vehicleCards', 'ecoCards', 'tyreCards'];

export const lockAttrMapping = {
  decklidstatus: { name: 'Deck lid', state: { false: 'closed', true: 'open' } },
  doorstatusfrontleft: { name: 'Door front left', state: { false: 'closed', true: 'open' } },
  doorstatusfrontright: { name: 'Door front right', state: { false: 'closed', true: 'open' } },
  doorstatusrearleft: { name: 'Door rear left', state: { false: 'closed', true: 'open' } },
  doorstatusrearright: { name: 'Door rear right', state: { false: 'closed', true: 'open' } },
  doorlockstatusfrontleft: { name: 'Door lock front left', state: { false: 'locked', true: 'unlocked' } },
  doorlockstatusfrontright: { name: 'Door lock front right', state: { false: 'locked', true: 'unlocked' } },
  doorlockstatusrearleft: { name: 'Door lock rear left', state: { false: 'locked', true: 'unlocked' } },
  doorlockstatusrearright: { name: 'Door lock rear right', state: { false: 'locked', true: 'unlocked' } },
  doorlockstatusgas: { name: 'Gas lock', state: { false: 'locked', true: 'unlocked' } },
  enginehoodstatus: { name: 'Engine hood', state: { false: 'closed', true: 'open' } },
  doorstatusoverall: {
    name: 'Door status overall',
    state: {
      '0': 'open',
      '1': 'closed',
      '2': 'not existing',
      '3': 'unknown',
    },
  },
  sunroofstatus: {
    name: 'Sunroof status',
    state: {
      '0': 'closed',
      '1': 'open',
      '2': 'lifting open',
      '3': 'running',
      '4': 'anti-booming position',
      '5': 'sliding intermediate',
      '6': 'lifting intermediate',
      '7': 'opening',
      '8': 'closing',
      '9': 'anti-booming lifting',
      '10': 'intermediate position',
      '11': 'opening lifting',
      '12': 'closing lifting',
    },
  },
};

export const lockStateMapping = {
  '0': 'Unlocked',
  '1': 'Locked int',
  '2': 'Locked',
  '3': 'Partly unlocked',
  '4': 'Unknown',
};
