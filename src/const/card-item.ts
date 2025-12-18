import type { CardIndicatorSection, CarEntityKey } from 'data';
import { AttributeItemKey, CardAttributesSection, getAttributeSectionItems } from 'data/attributes-items';
import { getIndicatorItems, CardIndicatorKey } from 'data/indicator-items';
import type { SubCardItemKey, SubCardSection } from 'data/subcard-items';
import { getSubCardItems } from 'data/subcard-items';
import { forEach } from 'es-toolkit/compat';
import memoizeOne from 'memoize-one';
import { LocalizeFunc } from 'types';

export type CardSectionType = SubCardSection | CardAttributesSection | CardIndicatorSection;

export interface CardItem {
  key: string;
  name: string;
  icon?: string;
}

export type CardItemKey = SubCardItemKey | CardIndicatorKey | AttributeItemKey | CarEntityKey;

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
  lockSensor: 'mdi:lock',
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
  // Indicator Base
  titleServices: 'mdi:car-cog',
  stateCharging: 'mdi:ev-station',
  soc: 'mdi:ev-station',
};

const createItem = (localize: LocalizeFunc, section: CardSectionType | string, key: CardItemKey): CardItem => {
  if (key === 'sunroofstatus') {
    section = 'doorAttributes';
  }
  if (section === 'baseIndicators') {
    if (['lockSensor', 'parkBrake'].includes(key)) {
      section = 'vehicleCard';
    } else {
      section = 'common';
    }
  }

  return {
    key,
    name: localize(`card.${section}.${key}`),
    ...(ICON[key] ? { icon: ICON[key] } : {}),
  };
};

export const computeCardItems = memoizeOne((localize: LocalizeFunc) => {
  const subCardItems = getSubCardItems();
  const attrinutesItems = getAttributeSectionItems();
  const indicatorItems = getIndicatorItems();
  const sections = {
    ...subCardItems,
    ...indicatorItems,
    ...attrinutesItems,
  };

  const cardItems: Record<string, CardItem[] | Record<string, Record<string, CardItem[]>>> = {};

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
});

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
