import { LovelaceCardConfig } from 'custom-card-helpers';

import { CustomButtonEntity } from './config';
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
};

export type EntityConfig = {
  key: string;
  name?: string;
  icon?: string;
  unit?: string;
  state?: string;
  active?: boolean;
};

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

interface Address {
  streetNumber: string;
  streetName: string;
  sublocality: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

export interface MapData {
  lat: number;
  lon: number;
  address?: Partial<Address>;
  popUpCard?: LovelaceCardConfig[];
}

export interface PreviewCard {
  cardPreview?: LovelaceCardConfig[];
  buttonPreview?: Partial<CustomButtonEntity>;
}
