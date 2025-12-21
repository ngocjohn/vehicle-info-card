export * from './base-element';
export * from './vic-indicator-row';
export * from './vic-button-group';

import { Car } from '../model/car';
import { VicButtonGroup } from './vic-button-group';
import { VicIndicatorRow } from './vic-indicator-row';

declare global {
  interface Window {
    VicIndicatorRow: VicIndicatorRow | undefined;
    VicButtonGroup: VicButtonGroup | undefined;
    VicCar?: Car;
  }
}
