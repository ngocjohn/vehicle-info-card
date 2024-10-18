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

export interface EcoData {
  bonusRange: number;
  acceleration: number;
  constant: number;
  freeWheel: number;
  unit: string;
}

export type CustomButton = {
  notify: boolean;
  state: string;
};
