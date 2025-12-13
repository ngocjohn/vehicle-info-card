import {
  ATTR_SECTION_ITEMS,
  ATTR_SECTON_TYPE,
  AttributeItemKey,
  CardItemKey,
  computeCardItems,
  findCardItemByKey,
  getAttrSectionType,
} from 'const/card-item';
import { CarEntityKey } from 'const/const';
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

  private _getAttrSectionItemConfig(section: ATTR_SECTON_TYPE): Record<AttributeItemKey, CarItemDisplay> {
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

  private _getFallbackEntityConfig(key: CarEntityKey | CardItemKey, attrType?: ATTR_SECTON_TYPE): CarItemDisplay {
    const item = findCardItemByKey(this._carItems, key);
    let state: string | undefined = undefined;
    let display_state: string | undefined = undefined;
    let active: boolean | undefined = undefined;

    if (attrType) {
      const itemKey = key as AttributeItemKey;
      const mainEntity =
        attrType === ATTR_SECTON_TYPE.WINDOW ? this._carEntities.windowsClosed : this._carEntities.lockSensor;
      const mainStateObj = this.hass.states[mainEntity?.entity_id || ''];
      switch (attrType) {
        case ATTR_SECTON_TYPE.LOCK:
          const lockState = mainStateObj.attributes[itemKey];
          state = lockState;
          display_state = this._stateManager[ATTR_SECTON_TYPE.LOCK][itemKey][lockState as string] || lockState;
          active = this.isActive(state);
          break;
        case ATTR_SECTON_TYPE.DOOR:
          if (itemKey === 'chargeflapdcstatus') {
            const doorStateObj = this.hass.states[this._carEntities.chargeFlapDCStatus?.entity_id || ''];
            const doorState = doorStateObj?.state;
            state = doorState;
            display_state = this._stateManager[ATTR_SECTON_TYPE.DOOR][itemKey][doorState as string] || doorState;
          } else {
            const doorState = mainStateObj.attributes[itemKey];
            state = doorState;
            display_state = this._stateManager[ATTR_SECTON_TYPE.DOOR][itemKey][doorState as string] || doorState;
          }
          active = this.isActive(state);
          break;
        case ATTR_SECTON_TYPE.WINDOW:
          if (itemKey === 'sunroofstatus') {
            const sunroofStateObj = this.hass.states[this._carEntities.sunroofStatus?.entity_id || ''];
            const sunroofState = sunroofStateObj?.state;
            state = sunroofState;
            display_state =
              this._stateManager[ATTR_SECTON_TYPE.WINDOW][itemKey][sunroofState as string] || sunroofState;
            active = state !== '0';
            break;
          } else {
            const windowState = mainStateObj.attributes[itemKey];
            state = windowState;
            display_state = this._stateManager[ATTR_SECTON_TYPE.WINDOW][itemKey][windowState as string] || windowState;
            active = this.isActive(state);
            break;
          }
      }
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
    const closedState = ['2', '1', false, 'false'];
    return !Boolean(closedState.includes(state.toString()));
  };
}
