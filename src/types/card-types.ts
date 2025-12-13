import { CarEntityKey } from 'const/const';

import { LovelaceCardConfig } from './ha-frontend/lovelace/lovelace';
import { CustomButtonEntity } from './legacy-card-config/legacy-button-config';

export type HEADER_ACTION = 'next' | 'prev' | 'close';

export type CardTypeConfig = {
  type: string;
  name: string;
  icon: string;
  config: string;
  button: string;
};

export interface VehicleEntities {
  [key: string]: VehicleEntity;
}

export type VehicleEntity = {
  entity_id: string;
  original_name: string;
  device_id?: string;
  unique_id?: string;
  translation_key?: string;
  disabled_by?: string | null;
  hidden_by?: string | null;
  icon?: string;
  unit?: string;
  state?: string;
  active?: boolean;
};

export interface EntityConfig {
  key: string;
  name?: string;
  icon?: string;
  unit?: string;
  state?: string;
  active?: boolean;
}

export interface ecoChartModel {
  bonusRange: {
    label: string;
    value: string;
  };
  chartData: {
    series: number;
    labels: string;
  }[];
}

export interface Address {
  streetNumber: string;
  streetName: string;
  sublocality: string;
  city: string;
}

export interface MapData {
  lat: number;
  lon: number;
  address: Partial<Address>;
  popUpCard?: LovelaceCardConfig[];
  entityPic?: string;
}

export interface PreviewCard {
  cardPreview?: LovelaceCardConfig[];
  buttonPreview?: Partial<CustomButtonEntity>;
}

export interface CarEntity {
  entity_id: string;
  original_name: string;
  name?: string;
  icon?: string;
  unit?: string;
  state?: string;
  active?: boolean;
}

export type CarEntities = {
  [K in CarEntityKey]?: CarEntity;
};

export type CarItemDisplay = Partial<CarEntity & EntityConfig> & {
  display_state?: string;
};
