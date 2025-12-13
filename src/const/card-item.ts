import { AttributeItemKey, CardAttributesSection, getAttributeSectionItems } from 'data/attributes-items';
import { getIndicatorItems, CardIndicatorKey } from 'data/indicator-items';
import { SubCardItemKey, SubCardSection, getSubCardItems } from 'data/subcard-items';
import { forEach } from 'es-toolkit/compat';
import { LocalizeFunc } from 'types';
export type CardSectionType = SubCardSection | CardAttributesSection | CardIndicatorKey;

export interface CardItem {
  key: CardItemKey;
  name: string;
  icon?: string;
}

export type CardItemKey = SubCardItemKey | CardIndicatorKey | AttributeItemKey;

const ICON: Record<CardItemKey | string, string> = {
  // Trip Overview
  odometer: 'mdi:counter',
  adBlueLevel: 'mdi:fuel',
  // Trip Data
  drivenTimeStart: 'mdi:clock',
  drivenTimeZEStart: 'mdi:clock',
  averageSpeedStart: 'mdi:speedometer-slow',
  // Vehicle card
  doorStatusOverall: 'mdi:car-door-lock',
  // Vehicle Warnings
  lowCoolantLevel: 'mdi:car-coolant-level',
  lowBrakeFluid: 'mdi:car-brake-fluid-level',
  // Tyre Pressures
  tirePressureFrontLeft: 'mdi:tire',
  tirePressureFrontRight: 'mdi:tire',
  tirePressureRearLeft: 'mdi:tire',
  tirePressureRearRight: 'mdi:tire',
  // Charging Overview
  chargingPower: 'mdi:flash',
  selectedProgram: 'mdi:ev-station',
};

const createItem = (localize: LocalizeFunc, section: CardSectionType, key: CardItemKey): CardItem => {
  if (key === 'sunroofstatus') {
    section = 'doorAttributes';
  }
  return {
    key,
    name: localize(`card.${section}.${key}`),
    ...(ICON[key] ? { icon: ICON[key] } : {}),
  };
};

export const computeCardItems = (localize: LocalizeFunc) => {
  const subCardItems = getSubCardItems();
  const attrinutesItems = getAttributeSectionItems();
  const indicatorItems = getIndicatorItems();
  const sections = {
    ...subCardItems,
    ...indicatorItems,
    ...attrinutesItems,
  };

  const cardItems: any = {};

  forEach(sections, (sectionValue, sectionKey) => {
    if (Array.isArray(sectionValue)) {
      // Simple array of keys
      cardItems[sectionKey] = sectionValue.map((key) => createItem(localize, sectionKey as CardSectionType, key));
    } else {
      // Nested object of subsections
      cardItems[sectionKey] = {};
      forEach(sectionValue, (subsectionValue, subsectionKey) => {
        cardItems[sectionKey][subsectionKey] = [...subsectionValue].map((key) =>
          createItem(localize, sectionKey as CardSectionType, key)
        );
      });
    }
  });

  return cardItems;
};

export function findCardItemByKey(obj: any, key: string): CardItem | undefined {
  if (!obj) return undefined;

  // Case 1: it's an array → inspect each item
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = findCardItemByKey(item, key);
      if (result) return result;
    }
    return undefined;
  }

  // Case 2: it's an object with "key" property → match found
  if (typeof obj === 'object' && 'key' in obj) {
    return obj.key === key ? obj : undefined;
  }

  // Case 3: it's a nested object → search each property
  if (typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      const result = findCardItemByKey(value, key);
      if (result) return result;
    }
  }

  return undefined;
}
