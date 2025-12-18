export * from './base-element';
export * from './vic-indicator-row';

import { VicIndicatorRow } from './vic-indicator-row';

declare global {
  interface Window {
    VicIndicatorRow: VicIndicatorRow | undefined;
  }
}
