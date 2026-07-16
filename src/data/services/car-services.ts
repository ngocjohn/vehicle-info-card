import { getMainAttributeEntity } from 'data/attributes-items';
import { HomeAssistant, LocalizeFunc, CarEntityFunc } from 'types';
import { VehicleInfoCard } from 'vehicle-info-card';

import setupFindCarEntity from '../find-car-entity';
import { computeCardItems, ICardItems } from './card-item';
import * as CARD_ITEM from './card-item';
import { StateDisplayManager, computeStateManager } from './state-display';
import * as STATE_DISPLAY from './state-display';

export class CarServices {
  private readonly _hass: HomeAssistant;
  public readonly card: VehicleInfoCard;
  public carEntityConfig: CarEntityFunc;
  public cardItems: ICardItems;
  public stateDisplayManager: StateDisplayManager;
  private readonly _stateDisplay = STATE_DISPLAY;
  private readonly _cardItem = CARD_ITEM;

  constructor(hass: HomeAssistant, card: VehicleInfoCard, localize: LocalizeFunc) {
    this._hass = hass;
    this.card = card;
    this.carEntityConfig = setupFindCarEntity(this.card._carEntities);
    this.cardItems = computeCardItems(localize);
    this.stateDisplayManager = computeStateManager(localize);
    console.log('%cCAR-SERVICES:', 'color: #bada55;', 'Initialized Car Services');
    window.VicCarServices = this;
  }
  _findMainAttributeEntity(key: string): string | undefined {
    const attrType = getMainAttributeEntity(key);
    if (attrType && attrType !== key) {
      return this.carEntityConfig(attrType)!['entity_id'];
    } else if (this.carEntityConfig(key)) {
      return this.carEntityConfig(key)!['entity_id'];
    }
    return undefined;
  }
}
