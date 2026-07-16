import {
  CardIndicatorKey,
  getSubCardItems,
  INDICATOR_ITEMS,
  INDICATOR_SECTIONS,
  SUBCARD,
  SubCardItemKey,
  SubCardItems,
  SubSubSection,
} from 'data';
import {
  ATTR_SECTION_ITEMS,
  ATTR_SECTION,
  AttributeItemKey,
  getAttrSectionType,
  ENTITY_NOT_ATTR,
  NON_ATTR_ENTITY_KEYS,
  NonAttrEntityKey,
} from 'data/attributes-items';
import { CarEntityKey } from 'data/car-device-entities';
import { ButtonInfo, DEFAULT_CARD, DEFAULT_ITEMS } from 'data/default-button-items';
import setupFindCarEntity from 'data/find-car-entity';
import { CardItem, CardItemKey, computeCardItems, findCardItemByKey } from 'data/services/card-item';
import { HassEntity } from 'home-assistant-js-websocket';
import { CarEntities, CarEntityFunc, CarItemDisplay, HomeAssistant, LocalizeFunc } from 'types';
import { DefaultCardKey } from 'types/card-config/button-card';
import { getEntityStateValue } from 'utils/entity-helper';
import { getMax, getMin } from 'utils/helpers';
import { VehicleInfoCard } from 'vehicle-info-card';

import { computeStateManager, StateDisplayManager } from '../data/services/state-display';
import { Store } from './store';

export class Car {
  private _card: VehicleInfoCard;
  private carEntityConfig: CarEntityFunc;
  protected translate: LocalizeFunc;
  constructor(store: Store) {
    this._card = store.card;
    this.carEntityConfig = setupFindCarEntity(this._card._carEntities);
    window.VicCar = this;
    console.log('%cCAR:', 'color: #bada55;', 'Car model initialized');
    this.translate = store.translate;
  }

  get hass(): HomeAssistant {
    return this._card.hass;
  }

  get _carItems() {
    return computeCardItems(this.translate);
  }

  get _carEntities(): CarEntities {
    return this._card._carEntities;
  }

  get _displayManager(): StateDisplayManager {
    return computeStateManager(this.translate);
  }

  get _isCarCharging(): boolean {
    const chargingEntity = this._carEntities.rangeElectric?.entity_id;
    if (!chargingEntity) {
      return false;
    }
    const chargingState = this.hass.states[chargingEntity].attributes?.chargingactive;
    return Boolean(chargingState);
  }

  _getAttrSectionItemConfig(section: ATTR_SECTION): Record<AttributeItemKey, CarItemDisplay> {
    const items = {} as Record<AttributeItemKey, CarItemDisplay>;
    const itemKeys = ATTR_SECTION_ITEMS[section];
    itemKeys.forEach((itemKey) => {
      items[itemKey] = this._getFallbackEntityConfig(itemKey, section);
    });
    return items;
  }

  _getIndicatorSectionItems(section: INDICATOR_SECTIONS): Record<CardIndicatorKey, CarItemDisplay> {
    const items = {} as Record<CardIndicatorKey, CarItemDisplay>;
    const indicatorKeys = INDICATOR_ITEMS[section];
    indicatorKeys.forEach((key) => {
      items[key] = this._getEntityConfigByKey(key);
    });
    return items;
  }

  _getSubCardSectionItems(
    section: SUBCARD
  ): Record<SubSubSection, Record<SubCardItemKey, CarItemDisplay>> | Record<SubCardItemKey, CarItemDisplay> {
    const sectionItems: SubCardItems = getSubCardItems();
    switch (section) {
      case SUBCARD.TRIP:
      case SUBCARD.VEHICLE: {
        const items = {} as Record<SubSubSection, Record<SubCardItemKey, CarItemDisplay>>;
        const subCardConfig = sectionItems[section];
        for (const subSection in subCardConfig) {
          const itemKeys = subCardConfig[subSection as SubSubSection] as SubCardItemKey[];
          const sectionItems = {} as Record<SubCardItemKey, CarItemDisplay>;
          itemKeys.forEach((itemKey) => {
            sectionItems[itemKey] = this._getEntityConfigByKey(itemKey);
          });
          items[subSection as SubSubSection] = sectionItems;
        }
        return items;
      }
      case SUBCARD.ECO:
      case SUBCARD.TYRE: {
        const itemKeys = sectionItems[section] as SubCardItemKey[];
        const items = {} as Record<SubCardItemKey, CarItemDisplay>;
        itemKeys.forEach((itemKey) => {
          items[itemKey] = this._getEntityConfigByKey(itemKey);
        });
        return items;
      }
    }
  }

  public _getEntityConfigByKey(key: CardItemKey): CarItemDisplay {
    const entity = this._carEntities![key];
    let attrType = getAttrSectionType(key);
    if (!entity) {
      // console.log('%cCAR:', 'color: #bada55;', ' No entity found for key:', key);
      attrType = attrType && attrType in ATTR_SECTION ? (attrType as ATTR_SECTION) : undefined;
      return this._getFallbackEntityConfig(key, attrType) as CarItemDisplay;
    }
    let item = findCardItemByKey(this._carItems, key);
    if (attrType && attrType === INDICATOR_SECTIONS.CHARGING_OVERVIEW) {
      const chargingObj = this._carItems.chargingOverview;
      item = findCardItemByKey(chargingObj, key);
    }
    if (key === 'windowsClosed') {
      // console.log('%cCAR:', 'color: #bada55;', ' Handling windowsClosed key separately');
      const stateDisplayResult = this._getFallbackEntityConfig(key) as CarItemDisplay;
      return { ...stateDisplayResult, ...entity };
    }
    const { state, display_state, icon } = this._getEntityDisplayState(key as CarEntityKey, item);
    const result: CarItemDisplay = {
      display_state,
      state,
      icon,
      ...entity,
      ...item,
    };
    // console.log('%cCAR:', 'color: #bada55;', ' results', key, result);

    return result;
  }

  private _getFallbackEntityConfig(key: CardItemKey, attrType?: ATTR_SECTION): CarItemDisplay {
    const item = findCardItemByKey(this._carItems, key);
    let state: string | undefined = undefined;
    let display_state: string | undefined = undefined;
    let active: boolean | undefined = undefined;
    let entity_id: string | undefined = undefined;

    if (attrType) {
      return this._getAttrItemConfig(key as AttributeItemKey, attrType);
    } else {
      switch (key) {
        case 'selectedProgram':
          entity_id = this._carEntities.rangeElectric?.entity_id || '';
          const carEntity = this.hass.states[entity_id];
          const programState = this.hass.formatEntityAttributeValue(carEntity, 'selectedChargeProgram');
          state = programState;
          display_state = this._displayManager.selectedProgram?.[programState] || programState;
          break;
        case 'stateCharging':
          const isCharging = this._isCarCharging;
          state = isCharging.toString();
          display_state = item?.name || '';
          active = isCharging;
          entity_id = this._carEntities.rangeElectric?.entity_id || '';
          break;
        case 'titleServices':
          display_state = item?.name || '';
          break;

        case 'doorStatusOverall':
        case 'windowsClosed':
          const attrSec = key === 'doorStatusOverall' ? ATTR_SECTION.DOOR : ATTR_SECTION.WINDOW;
          const attrEntities = this._getAttrSectionItemConfig(attrSec);
          const activeCount = Object.values(attrEntities).filter((entry) => entry.active).length;
          const isAnyActive = Boolean(activeCount > 0);
          state = isAnyActive.toString();
          const overallStateStr = this._displayManager.doorStatusOverall?.[state as string] || '';
          display_state = isAnyActive ? `${activeCount} ${overallStateStr}` : overallStateStr;
          active = isAnyActive;
          break;
      }
    }
    return {
      ...item,
      display_state,
      state,
      active,
      entity_id,
    };
  }

  private _getAttrItemConfig(itemKey: AttributeItemKey, attrType: ATTR_SECTION): CarItemDisplay {
    const itemObj = this._carItems[attrType];
    const item = findCardItemByKey(itemObj, itemKey);
    if ([...NON_ATTR_ENTITY_KEYS].includes(itemKey as NonAttrEntityKey)) {
      // console.log('%cCAR:', 'color: #bada55;', 'Handling non-attribute entity key:', itemKey);
      const mainItemEntity =
        itemKey === ENTITY_NOT_ATTR.CHARGE_FLAP_DC_STATUS
          ? this._carEntities.chargeFlapDCStatus
          : this._carEntities.sunroofStatus;
      const mainStateObj = this.hass.states[mainItemEntity?.entity_id || ''];
      const mainState = mainStateObj?.state;
      const mainDisplayState =
        this._displayManager[attrType]?.[itemKey]?.[mainState as string] ?? this.hass.formatEntityState(mainStateObj);
      const mainActive = itemKey === ENTITY_NOT_ATTR.SUNROOF_STATUS ? mainState !== '0' : this.isActive(mainState);
      return {
        ...item,
        state: mainState,
        display_state: mainDisplayState,
        active: mainActive,
      };
    } else {
      // pick main entity based on section
      const mainEntity =
        attrType === ATTR_SECTION.WINDOW ? this._carEntities.windowsClosed : this._carEntities.lockSensor;

      const stateObj = this.hass.states[mainEntity?.entity_id ?? ''];

      // value source: special-cases use .state, otherwise use attributes[itemKey]
      const state = stateObj?.attributes?.[itemKey];

      const display_state =
        this._displayManager[attrType]?.[itemKey]?.[state as string] ||
        this.hass.formatEntityAttributeValue(stateObj, itemKey);

      const active = this.isActive(state);

      return {
        ...item,
        state,
        display_state,
        active,
      };
    }
  }

  private _getEntityDisplayState(
    key: CarEntityKey,
    item?: CardItem
  ): Pick<CarItemDisplay, 'state' | 'display_state' | 'icon'> {
    const entity = this._carEntities[key];
    const stateObj: HassEntity | undefined = this.hass.states[entity?.entity_id || ''];
    if (!stateObj) {
      return { state: undefined, display_state: undefined, icon: undefined };
    }
    const state = stateObj.state;
    const display_state = this._displayManager[key]?.[state as string] || this.hass.formatEntityState(stateObj);
    const icon = item?.icon || stateObj.attributes?.icon;
    // console.log('%cCAR:', 'color: #bada55;', { state, display_state, icon });
    return { state, display_state, icon };
  }

  private isActive = (state) => {
    if (state === undefined || state === null) {
      return undefined;
    }
    const closedState = ['2', '1', false, 'false'];
    return !Boolean(closedState.includes(state as string));
  };

  _getDefaultButtonNotifyByKey(key: DefaultCardKey): boolean {
    if (key === DEFAULT_CARD.VEHICLE) {
      const warnings = this._getSubCardSectionItems(SUBCARD.VEHICLE)['warnings'];
      const warningItems = Object.values(warnings)
        .map((entry) => entry as CarItemDisplay)
        .filter((entry) => entry.key !== 'tirePressureWarning' && !['off', '0'].includes(entry.state as string));
      return warningItems.length > 0;
    }
    return false;
  }

  _getDefaultButtonSecondaryByKey(key: DefaultCardKey): string {
    const mainEntity = DEFAULT_ITEMS[key].main_entity;
    const getEntityId = (eId: string) => this._carEntities[eId]?.entity_id || '';
    switch (key) {
      case DEFAULT_CARD.TRIP:
      case DEFAULT_CARD.ECO: {
        return getEntityStateValue(this.hass, getEntityId(mainEntity as string), true);
      }
      case DEFAULT_CARD.VEHICLE: {
        const lockState = getEntityStateValue(this.hass, getEntityId(mainEntity as string)) || '4';
        return this._displayManager.lockSensor?.[lockState as string] || '';
      }
      case DEFAULT_CARD.TYRE: {
        const tireItems = this._getSubCardSectionItems(SUBCARD.TYRE);
        const pressures = Array.from(Object.values(tireItems));
        const maxPressureItem = getMax(pressures, 'state');
        const minPressureItem = getMin(pressures, 'state');
        return `${minPressureItem.state} - ${maxPressureItem.display_state}`;
      }
      default:
        return '';
    }
  }
  _getDefaultButtonInfo<K extends keyof ButtonInfo>(key: DefaultCardKey, type: K): ButtonInfo[K] {
    if (type === 'secondary') return this._getDefaultButtonSecondaryByKey(key) as ButtonInfo[K];
    if (type === 'notify') return this._getDefaultButtonNotifyByKey(key) as ButtonInfo[K];
    if (type === 'name') return this.translate(`card.cardType.${DEFAULT_ITEMS[key].name}`) as ButtonInfo[K];
    if (type === 'icon') return DEFAULT_ITEMS[key].icon as ButtonInfo[K];
    if (type === 'main_entity') return DEFAULT_ITEMS[key].main_entity as ButtonInfo[K];
    return undefined as unknown as ButtonInfo[K];
  }
}
