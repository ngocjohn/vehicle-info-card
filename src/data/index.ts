export * from './car-device-entities';
export * from './subcard-items';
export * from './attributes-items';
export * from './indicator-items';
export * from './default-button-items';

export * from './services/car-services';

import { CarServices } from './services/car-services';

declare global {
  interface Window {
    VicCarServices: CarServices;
  }
}
