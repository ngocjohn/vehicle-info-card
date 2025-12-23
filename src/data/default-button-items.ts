import { TYRE_PRESSURE_KEYS } from './subcard-items';

export type ButtonInfo = {
  name?: string;
  icon?: string;
  main_entity?: string | string[];
  notify?: boolean;
  secondary?: string;
};

// type DefaultButtonInfo = {
//   [key in DefaultCardKey]: { name: string; icon: string; main_entity: string | string[], notify?: boolean, secondary?: string  };
// };

export enum DEFAULT_CARD {
  TRIP = 'trip_card',
  VEHICLE = 'vehicle_card',
  ECO = 'eco_card',
  TYRE = 'tyre_card',
}

export const DEFAULT_ITEMS: Record<DEFAULT_CARD, ButtonInfo> = {
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
