import { LocalizeFunc } from 'types';

import { TYRE_PRESSURE_KEYS } from './subcard-items';

export const DEFAULT_CARD_KEYS = ['trip_card', 'vehicle_card', 'eco_card', 'tyre_card'] as const;
export type DefaultCardKey = (typeof DEFAULT_CARD_KEYS)[number];

export type ButtonInfo = {
  name: string;
  icon: string;
  main_entity: string | string[];
  notify?: boolean;
  secondary?: string;
};
export interface DefaultButtonInfo {
  [key: string]: ButtonInfo;
}

// type DefaultButtonInfo = {
//   [key in DefaultCardKey]: { name: string; icon: string; main_entity: string | string[], notify?: boolean, secondary?: string  };
// };

export enum DEFAULT_CARD {
  TRIP = 'trip_card',
  VEHICLE = 'vehicle_card',
  ECO = 'eco_card',
  TYRE = 'tyre_card',
}

const DEFAULT_ITEMS: Record<DefaultCardKey, ButtonInfo> = {
  trip_card: {
    name: 'tripCards',
    icon: 'mdi:map-marker-path',
    main_entity: 'odometer',
  },
  vehicle_card: {
    name: 'vehicleCards',
    icon: 'mdi:car-info',
    main_entity: 'lockSensor',
  },
  eco_card: {
    name: 'ecoCards',
    icon: 'mdi:leaf',
    main_entity: 'ecoScoreBonusRange',
  },
  tyre_card: {
    name: 'tyreCards',
    icon: 'mdi:tire',
    main_entity: [...TYRE_PRESSURE_KEYS],
  },
};

export const baseButtonItems = (localize: LocalizeFunc): DefaultButtonInfo => ({
  ...DEFAULT_CARD_KEYS.reduce((acc, key) => {
    const item = DEFAULT_ITEMS[key];
    acc[key] = {
      name: localize(`card.cardType.${item.name}`),
      icon: item.icon,
      main_entity: item.main_entity,
    };
    return acc;
  }, {} as DefaultButtonInfo),
});
