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

export const convertServicesConfig = (oldConfig: Services): ServicesConfig['items'] => {
  let items: ServicesItem[] = [];
  for (const key of ServiceKeys) {
    if (oldConfig[key]) {
      items.push(key);
    }
  }
  items = [...new Set(items)].filter((item) => ServiceKeys.includes(item));
  return items;
};
