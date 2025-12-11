export * from './ha-frontend/index';
export * from './config';
export * from './card-types';
export * from './actions-config';
export * from './section';
export * from './config-area';

import { VehicleInfoCard } from '../vehicle-info-card';
import { VehicleInfoCardEditor } from '../vehicle-info-card-editor';

declare global {
  interface Window {
    VicCard: VehicleInfoCard;
    VicEditor: VehicleInfoCardEditor;
  }
}
