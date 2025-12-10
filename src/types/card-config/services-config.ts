export const ServiceKeys = [
  'auxheat',
  'charge',
  'doorsLock',
  'engine',
  'preheat',
  'sendRoute',
  'sigPos',
  'sunroof',
  'windows',
] as const;

export type ServicesItem = (typeof ServiceKeys)[number];

export type Services = {
  [key in ServicesItem]?: boolean;
};

export interface ServicesConfig {
  enabled?: boolean;
  items?: ServicesItem[];
}
