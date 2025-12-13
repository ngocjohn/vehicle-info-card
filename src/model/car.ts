import { CardItemKey, computeCardItems, findCardItemByKey } from 'const/card-item';
import {
  ATTR_SECTION_ITEMS,
  ATTR_SECTION,
  AttributeItemKey,
  getAttrSectionType,
  ENTITY_NOT_ATTR,
  NON_ATTR_ENTITY_KEYS,
} from 'data/attributes-items';
import { CarEntityKey } from 'data/car-device-entities';
import { forEach } from 'es-toolkit/compat';
import { HassEntity } from 'home-assistant-js-websocket';
import { CarEntities, CarItemDisplay, HomeAssistant, LocalizeFunc } from 'types';
import { VehicleInfoCard } from 'vehicle-info-card';

import * as ITEMS_FROM_CONST from '../const/card-item';
import { Store } from './store';

export class Car {
  private _card: VehicleInfoCard;
  private translate: LocalizeFunc;
  private _itemsFromConst = ITEMS_FROM_CONST;
  constructor(store: Store) {
    this.translate = store.translate;
    this._card = store.card;
    console.log('%cCAR:', 'color: #bada55;', 'Car model initialized');
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
  get _stateManager() {
    return this._card._stateDisplayManager;
  }

  _loopEntities() {
    const entities = this._carEntities;
    console.group('%cCar Entities:', 'color: #bada55;');
    forEach(entities, (entity, key) => {
      console.log(`[${key}]:`, entity?.original_name || entity?.entity_id);
    });
    console.groupEnd();
  }

  _getAttrSectionItemConfig(section: ATTR_SECTION): Record<AttributeItemKey, CarItemDisplay> {
    const items: Record<AttributeItemKey, CarItemDisplay> = {} as Record<AttributeItemKey, CarItemDisplay>;
    const itemKeys = ATTR_SECTION_ITEMS[section];
    itemKeys.forEach((itemKey) => {
      items[itemKey] = this._getFallbackEntityConfig(itemKey, section);
    });
    return items;
  }

  public _getEntityConfigByKey(key: CarEntityKey | CardItemKey): CarItemDisplay {
    const entity = this._carEntities[key];
    const item = findCardItemByKey(this._carItems, key);
    if (!entity) {
      console.log(`Entity for key ${key} not found, using fallback config.`);
      const attrType = getAttrSectionType(key);
      return this._getFallbackEntityConfig(key, attrType) as CarItemDisplay;
    }
    const stateObj = this.hass.states[entity.entity_id || ''];
    const { state, display_state, icon } = this._getEntityDisplayState(stateObj);

    return {
      display_state,
      state,
      icon,
      ...item,
      ...entity,
    };
  }

  private _getFallbackEntityConfig(key: CarEntityKey | CardItemKey, attrType?: ATTR_SECTION): CarItemDisplay {
    const item = findCardItemByKey(this._carItems, key);
    let state: string | undefined = undefined;
    let display_state: string | undefined = undefined;
    let active: boolean | undefined = undefined;

    if (attrType) {
      return this._getAttrItemConfig(key as AttributeItemKey, attrType);
    } else {
      switch (key) {
        case 'selectedProgram':
          const carEntity = this.hass.states[this._carEntities.rangeElectric?.entity_id || ''];
          const programState = this.hass.formatEntityAttributeValue(carEntity, 'selectedChargeProgram');
          state = programState;
          display_state = this._stateManager.chargeSelectedProgram[programState] || programState;
          break;
      }
    }
    return {
      ...item,
      display_state,
      state,
      active,
    };
  }

  private _getAttrItemConfig(itemKey: AttributeItemKey, attrType: ATTR_SECTION): CarItemDisplay {
    const item = findCardItemByKey(this._carItems, itemKey);
    if ([...NON_ATTR_ENTITY_KEYS].includes(itemKey)) {
      // console.log('%cCAR:', 'color: #bada55;', 'Handling non-attribute entity key:', itemKey);
      const mainItemEntity =
        itemKey === ENTITY_NOT_ATTR.CHARGE_FLAP_DC_STATUS
          ? this._carEntities.chargeFlapDCStatus
          : this._carEntities.sunroofStatus;
      const mainStateObj = this.hass.states[mainItemEntity?.entity_id || ''];
      const mainState = mainStateObj?.state;
      const mainDisplayState = this._stateManager[attrType]?.[itemKey]?.[mainState as string] ?? mainState;
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

      const display_state = this._stateManager[attrType]?.[itemKey]?.[state as string] ?? state;

      const active = this.isActive(state);

      return {
        ...item,
        state,
        display_state,
        active,
      };
    }
  }

  private _getEntityDisplayState(stateObj: HassEntity | undefined): {
    state: string | undefined;
    display_state: string | undefined;
    icon: string | undefined;
  } {
    if (!stateObj) {
      return { state: undefined, display_state: undefined, icon: undefined };
    }
    const state = stateObj.state;
    const display_state = this.hass.formatEntityState(stateObj);
    const icon = stateObj.attributes?.icon || undefined;
    console.log('%cCAR:', 'color: #bada55;', { state, display_state, icon });
    return { state, display_state, icon };
  }

  private isActive = (state) => {
    if (state === undefined || state === null) {
      return undefined;
    }
    const closedState = ['2', '1', false, 'false'];
    return !Boolean(closedState.includes(state as string));
  };
}
