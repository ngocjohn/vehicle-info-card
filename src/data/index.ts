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
    /** Last car-entity resolution report; see getCarEntities for the shape. */
    VicCarEntities?: {
      resolved: number;
      total: number;
      unavailable: string[];
      entities: Record<string, { entity_id: string }>;
    };
    /** Build fingerprint; see reportResolution in utils/ha-helpers.ts. */
    VicCardBuild?: { version: string; features: string[] };
  }
}
