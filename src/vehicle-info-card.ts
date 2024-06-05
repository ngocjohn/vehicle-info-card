/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  LovelaceCardEditor,
  LovelaceCard,
  LovelaceCardConfig,
  fireEvent,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import {
  VehicleCardConfig,
  ExtendedThemes,
  warningEntityFilters,
  tripEntityFilters,
  WarningEntity,
  TripEntity,
} from './types';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { addActions } from './utils/tap-action.js';
import styles from './css/styles.css';

import './components/map-card.js';
import './components/header-slide.js';
import amgWhite from './images/amg_bg_white.png';
import amgBlack from './images/amg_bg_black.png';

import { formatTimestamp } from './utils/helpers';
/* eslint no-console: 0 */
console.info(
  `%c  VEHICLE-INFO-CARD %c  ${CARD_VERSION}  `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'vehicle-info-card',
  name: 'Vehicle Card',
  preview: true,
  description: 'A custom card to display vehicle data with a map and additional cards.',
});

const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
@customElement('vehicle-info-card')
export class VehicleCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('vehicle-info-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {
      entity: '',
      name: 'Mercedes Benz',
      device_tracker: '',
      google_api_key: '',
      show_slides: false,
      show_map: false,
      show_buttons: true,
      show_background: true,
      images: [],
      vehicle_card: [],
      trip_card: [],
      eco_card: [],
      tyre_card: [],
    };
  }
  public setConfig(config: VehicleCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    this.config = {
      ...config,
    };

    if (this.config.trip_card) {
      this.createCards(this.config.trip_card, 'tripCards');
    }
    if (this.config.vehicle_card) {
      this.createCards(this.config.vehicle_card, 'vehicleCards');
    }
    if (this.config.eco_card) {
      this.createCards(this.config.eco_card, 'ecoCards');
    }
    if (this.config.tyre_card) {
      this.createCards(this.config.tyre_card, 'tyreCards');
    }
  }

  @property({ attribute: false }) public hass!: HomeAssistant & { themes: ExtendedThemes };

  @property({ type: Object }) private config!: VehicleCardConfig;

  @state() private warningEntities: { [key: string]: WarningEntity } = {};
  @state() private tripEntities: { [key: string]: TripEntity } = {};

  @state() private additionalCards: { [key: string]: Array<LovelaceCard> } = {
    tripCards: [],
    vehicleCards: [],
    ecoCards: [],
    tyreCards: [],
  };

  @state() private activeCardType: string | null = null;

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return styles;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.configureAsync();
  }

  private async configureAsync(): Promise<void> {
    [this.warningEntities, this.tripEntities] = await Promise.all([
      this.getEntities(warningEntityFilters),
      this.getEntities(tripEntityFilters),
    ]);
    this.requestUpdate();
  }

  private lockHandler(): void {
    console.log('lockHandler triggered');
    const lockElement = this.shadowRoot?.getElementById('lockelement');
    const lockState = this.getEntityState(this.warningEntities.lock?.entity_id);
    const actionConfig = {
      tap_action: {
        action: 'none',
      },
      hold_action: {
        action: 'call-service',
        service: lockState === 'locked' ? 'lock.unlock' : 'lock.lock',
        service_data: {
          entity_id: this.warningEntities.lock,
        },
      },
      double_tap_action: {
        action: 'none',
      },
    };
    const entity = this.warningEntities.lock;
    if (lockElement && entity) {
      addActions(lockElement, actionConfig, entity);
    }
  }

  private async createCards(cardConfigs: LovelaceCardConfig[], stateProperty: string): Promise<void> {
    if (HELPERS) {
      const helpers = await HELPERS;
      const cards = await Promise.all(
        cardConfigs.map(async (cardConfig) => {
          const element = await helpers.createCardElement(cardConfig);
          element.hass = this.hass;
          return element;
        }),
      );
      this.additionalCards[stateProperty] = cards;
    }
  }

  private async getEntities(filters: {
    [key: string]: { prefix: string; suffix: string };
  }): Promise<{ [key: string]: WarningEntity | TripEntity }> {
    const allEntities = await this.hass.callWS<{ entity_id: string; device_id: string }[]>({
      type: 'config/entity_registry/list',
    });
    const carEntity = allEntities.find((e) => e.entity_id === this.config.entity);
    if (!carEntity) {
      return {};
    }

    const deviceEntities = allEntities.filter((e) => e.device_id === carEntity.device_id);
    const entityIds: { [key: string]: WarningEntity | TripEntity } = {};

    for (const entityName of Object.keys(filters)) {
      const { prefix, suffix } = filters[entityName];
      const entity = deviceEntities.find((e) => e.entity_id.startsWith(prefix) && e.entity_id.endsWith(suffix));
      if (entity) {
        const original_name = await this.getOriginalName(entity.entity_id);
        entityIds[entityName] = { entity_id: entity.entity_id, original_name };
      } else {
        entityIds[entityName] = { entity_id: '', original_name: '' };
      }
    }

    return entityIds;
  }

  private isDark(): boolean {
    return this.hass.themes.darkMode;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has('hass')) {
      Object.values(this.additionalCards).forEach((cards) => {
        cards.forEach((card) => {
          card.hass = this.hass;
        });
      });
    }
    if (changedProps.has('activeCardType')) {
      console.log('activeCardType:' + this.activeCardType);
    }
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }
    if (changedProps.has('hass')) {
      return true;
    }
    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    if (!this.config || !this.hass) {
      return html``;
    }

    const isDark = this.isDark();
    const name = this.config.name || '';
    return html`
      <ha-card class=${isDark ? 'dark' : ''}>
        ${this._renderHeaderBackground()}
        <header>
          <h1>${name}</h1>
        </header>
        ${this.activeCardType ? this._renderAdditionalCard() : this._renderMainCard()}
      </ha-card>
    `;
  }

  private _renderHeaderBackground(): TemplateResult | void {
    if (!this.config.show_background) return;
    const isDark = this.isDark();
    return html` <div class="header-background" style="background-image: url(${isDark ? amgWhite : amgBlack})"></div> `;
  }

  private _renderWarnings(): TemplateResult {
    const lockState = this.getEntityState(this.warningEntities.lock?.entity_id);
    const parkBrakeState = this.getBooleanState(this.warningEntities.parkBrake?.entity_id);
    return html`
      <div class="info-box">
        ${lockState
          ? html` <div class="item">
              <ha-icon icon=${lockState === 'locked' ? 'mdi:lock' : 'mdi:lock-open'}></ha-icon>
              <div><span>${lockState}</span></div>
            </div>`
          : ''}
        ${parkBrakeState
          ? html`<div class="item">
              <ha-icon icon="mdi:car-brake-parking"></ha-icon>
              <div><span>${parkBrakeState ? 'Parked' : ' '}</span></div>
            </div>`
          : ''}
      </div>
    `;
  }

  private _renderFuelRangeInfo(): TemplateResult | void {
    const { state: fuelLevel, unit: fuelUnit } = this.getEntityInfo(this.tripEntities?.fuelLevel?.entity_id);
    const { state: rangeLiquid, unit: rangeUnit } = this.getEntityInfo(this.tripEntities?.rangeLiquid?.entity_id);
    if (!fuelLevel || !rangeLiquid) return;

    const fuelProgress = html`
      <div class="fuel-wrapper">
        <div class="fuel-level-bar" style="width: ${fuelLevel}%;"></div>
      </div>
    `;
    return html`
      <div class="info-box">
        <div class="item">
          <ha-icon icon="mdi:gas-station"></ha-icon>
          <div><span>${fuelLevel} ${fuelUnit}</span></div>
        </div>
        ${fuelProgress}
        <div class="item">
          <ha-icon></ha-icon>
          <div><span>${rangeLiquid} ${rangeUnit}</span></div>
        </div>
      </div>
    `;
  }
  getEntityInfo = (entityId: string | undefined) => {
    const state = this.getEntityState(entityId);
    const unit = this.getAttrUnitOfMeasurement(entityId);
    return { state, unit };
  };

  private _renderMainCard(): TemplateResult | void {
    return html`
      <main id="main-wrapper">
        <div class="header-info-box">${this._renderWarnings()} ${this._renderFuelRangeInfo()}</div>
        ${this._renderHeaderSlides()} ${this._renderMap()} ${this._renderButtons()}
      </main>
    `;
  }

  private _renderHeaderSlides(): TemplateResult | void {
    if (!this.config.images || !this.config.show_slides) return;

    return html` <header-slide .images=${this.config.images}></header-slide> `;
  }

  private _renderMap(): TemplateResult | void {
    if (!this.config.show_map) {
      return;
    }
    if (!this.config.device_tracker && this.config.show_map) {
      return this._showWarning('No device_tracker entity provided.');
    }
    return html`
      <div id="map-box">
        <vehicle-map
          .hass=${this.hass}
          .apiKey=${this.config.google_api_key}
          .deviceTracker=${this.config.device_tracker}
        ></vehicle-map>
      </div>
    `;
  }

  private _renderButtons(): TemplateResult {
    if (!this.config.show_buttons) return html``;

    return html`
      <div class="grid-container">
        ${Object.keys(this.additionalCards).map(
          (cardType) => html`
            <div class="grid-item" @click=${() => this.toggleCard(cardType)}>
              <div class="item-icon">
                <ha-icon icon="${this.getCardTypeData(cardType).icon}"></ha-icon>
              </div>
              <div class="item-content">
                <span class="primary">${this.getCardTypeData(cardType).name}</span>
                <span class="secondary">${this.getSecondaryInfo(cardType)}</span>
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }

  private _renderAdditionalCard(): TemplateResult | LovelaceCard | void {
    if (!this.activeCardType) return html``;

    let cards: any;
    let isDefaultCard = false;

    switch (this.activeCardType) {
      case 'tripCards':
        cards = this.additionalCards[this.activeCardType];
        break;
      case 'vehicleCards':
        cards = this.additionalCards[this.activeCardType];
        break;
      case 'ecoCards':
        cards = this.additionalCards[this.activeCardType];
        break;
      case 'tyreCards':
        cards = this.additionalCards[this.activeCardType];
        break;
      case 'default-tripCards':
        cards = this._renderDefaultTripCard();
        isDefaultCard = true;
        break;
      case 'default-vehicleCards':
        cards = this._renderDefaultVehicleCard();
        isDefaultCard = true;
        break;
      case 'default-ecoCards':
        cards = this._renderDefaultEcoCard();
        isDefaultCard = true;
        break;
      case 'default-tyreCards':
        cards = this._renderDefaultTyreCard();
        isDefaultCard = true;
        break;
      default:
        return html``;
    }

    const carLastUpdate = this.config.entity ? formatTimestamp(this.hass.states[this.config.entity].last_changed) : '';

    return html`
      <main id="cards-wrapper">
        ${this._renderAdditionalCardHeader()}
        <section>
          ${isDefaultCard ? cards : cards.map((card: any) => html`<div class="added-card">${card}</div>`)}
        </section>
        ${isDefaultCard
          ? html` <div class="last-update">
              <span>Last update: ${carLastUpdate}</span>
            </div>`
          : ''}
      </main>
    `;
  }

  private _renderAdditionalCardHeader(): TemplateResult {
    return html`
      <div class="added-card-header">
        <div class="headder-btn" @click="${() => this.activeCardType && this.toggleCard(this.activeCardType)}">
          <ha-icon icon="mdi:close"></ha-icon>
        </div>
        <div class="card-toggle ">
          <div class="headder-btn" @click="${this.togglePrevCard.bind(this)}">
            <ha-icon icon="mdi:chevron-left"></ha-icon>
          </div>
          <div class="headder-btn" @click="${this.toggleNextCard.bind(this)}">
            <ha-icon icon="mdi:chevron-right"></ha-icon>
          </div>
        </div>
      </div>
    `;
  }

  private toggleNextCard(): void {
    if (!this.activeCardType) return;

    const additionalCardTypes = Object.keys(this.additionalCards);
    const currentIndex = additionalCardTypes.indexOf(this.activeCardType);
    const newIndex = (currentIndex + 1) % additionalCardTypes.length;

    const newCardType = additionalCardTypes[newIndex];
    this.toggleCard(newCardType);
  }

  private togglePrevCard(): void {
    if (!this.activeCardType) return;

    const additionalCardTypes = Object.keys(this.additionalCards);
    const currentIndex = additionalCardTypes.indexOf(this.activeCardType);
    const newIndex = (currentIndex - 1 + additionalCardTypes.length) % additionalCardTypes.length;

    const newCardType = additionalCardTypes[newIndex];
    this.toggleCard(newCardType);
  }

  private toggleCard(cardType: string): void {
    if (this.additionalCards[cardType] && this.additionalCards[cardType].length > 0) {
      this.activeCardType = this.activeCardType === cardType ? null : cardType;
    } else {
      this.activeCardType = this.activeCardType === cardType ? null : `default-${cardType}`;
    }
  }

  private generateCardTemplate(
    title: string,
    data: Array<{ key: string; icon: string }>,
    entityCollection: any,
  ): TemplateResult {
    return html`
      <div class="default-card">
        <div class="data-header">${title}</div>
        ${data.map(({ key, icon }) => {
          return html`
            <div class="data-row" @click=${() => this.toggleMoreInfo(entityCollection[key].entity_id)}>
              <div>
                <ha-icon class="data-icon" icon="${icon}"></ha-icon>
                <span>${entityCollection[key].original_name}</span>
              </div>
              <div>
                <span
                  >${this.getEntityState(entityCollection[key].entity_id)}
                  ${this.getAttrUnitOfMeasurement(entityCollection[key].entity_id)}</span
                >
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderDefaultVehicleCard(): TemplateResult | void {
    const warningEntities = this.warningEntities;

    const generateDataArray = (keys: { key: string; iconEntity: string; stateEntity: string }[]) => {
      return keys.map(({ key, iconEntity, stateEntity }) => ({
        key,
        icon: this.getEntityAttribute(iconEntity, 'icon'),
        state: this.getBooleanState(stateEntity) ? 'Problem' : 'Ok',
      }));
    };

    const vehicleData = [
      {
        key: 'parkBrake',
        icon: this.getEntityAttribute(warningEntities.parkBrake?.entity_id, 'icon'),
        state: this.getBooleanState(warningEntities.parkBrake?.entity_id) ? 'Parked' : 'Not Parked',
      },
      {
        key: 'windowsClosed',
        icon: this.getEntityAttribute(warningEntities.windowsClosed?.entity_id, 'icon'),
        state: this.getBooleanState(warningEntities.windowsClosed?.entity_id) ? 'Closed' : 'Opened',
      },
    ];

    const warningsDataKeys = [
      { key: 'tire', iconEntity: warningEntities.tire?.entity_id, stateEntity: warningEntities.tire?.entity_id },
      {
        key: 'lowBrakeFluid',
        iconEntity: warningEntities.lowBrakeFluid?.entity_id,
        stateEntity: warningEntities.lowBrakeFluid?.entity_id,
      },
      {
        key: 'lowCoolantLevel',
        iconEntity: warningEntities.lowCoolantLevel?.entity_id,
        stateEntity: warningEntities.lowCoolantLevel?.entity_id,
      },
      {
        key: 'engineLight',
        iconEntity: warningEntities.engineLight?.entity_id,
        stateEntity: warningEntities.engineLight?.entity_id,
      },
      {
        key: 'lowWashWater',
        iconEntity: warningEntities.lowWashWater?.entity_id,
        stateEntity: warningEntities.lowWashWater?.entity_id,
      },
    ];

    const lockState = this.getEntityState(warningEntities.lock?.entity_id);
    const lockIcon = lockState === 'locked' ? 'mdi:lock' : 'mdi:lock-open';
    const lockColor = lockState === 'locked' ? 'warning' : '';
    const lockEntity = warningEntities.lock?.entity_id;

    const warningsData = generateDataArray(warningsDataKeys);

    return html`
      <div class="default-card">
        <div class="data-header">Vehicle status</div>
        <div id="lockelement" class="data-row" @click=${() => this.toggleMoreInfo(lockEntity)}>
          <div>
            <ha-icon class="data-icon ${lockColor}" icon=${lockIcon}></ha-icon>
            <span>${warningEntities.lock.original_name}</span>
          </div>
          <div>
            <span>${lockState}</span>
          </div>
        </div>
        ${vehicleData.map(
          ({ key, icon, state }) => html`
            <div class="data-row" @click=${() => this.toggleMoreInfo(warningEntities[key]?.entity_id)}>
              <div>
                <ha-icon
                  class="data-icon ${this.getBooleanState(warningEntities[key]?.entity_id) ? 'warning' : ''} "
                  icon="${icon}"
                ></ha-icon>
                <span>${warningEntities[key].original_name}</span>
              </div>
              <div>
                <span>${state}</span>
              </div>
            </div>
          `,
        )}
      </div>
      <div class="default-card">
        <div class="data-header">Warnings</div>
        ${warningsData.map(
          ({ key, icon, state }) => html`
            <div class="data-row" @click=${() => this.toggleMoreInfo(warningEntities[key]?.entity_id)}>
              <div>
                <ha-icon
                  class="data-icon ${this.getBooleanState(warningEntities[key]?.entity_id) ? 'warning' : ''} "
                  icon="${icon}"
                ></ha-icon>
                <span>${warningEntities[key].original_name}</span>
              </div>
              <div>
                <span>${state}</span>
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }

  private _renderDefaultEcoCard(): TemplateResult | void {
    const ecoData = [
      { key: 'ecoScoreBonusRange', icon: '' },
      { key: 'ecoScoreAcceleraion', icon: '' },
      { key: 'ecoScoreConstant', icon: '' },
      { key: 'ecoScoreFreeWheel', icon: '' },
    ];

    // Loop through each item in ecoData and assign the icon dynamically
    ecoData.forEach((item) => {
      item.icon = this.getEntityAttribute(this.tripEntities[item.key]?.entity_id, 'icon');
    });

    return this.generateCardTemplate('Eco display', ecoData, this.tripEntities);
  }

  private _renderDefaultTyreCard(): TemplateResult | void {
    const tyreData = [
      { key: 'tirePressureFrontLeft', icon: 'mdi:tire' },
      { key: 'tirePressureFrontRight', icon: 'mdi:tire' },
      { key: 'tirePressureRearLeft', icon: 'mdi:tire' },
      { key: 'tirePressureRearRight', icon: 'mdi:tire' },
    ];

    return this.generateCardTemplate('Tyre pressures', tyreData, this.tripEntities);
  }

  private _renderDefaultTripCard(): TemplateResult | void {
    const generateDataArray = (keys: { key: string; icon?: string }[]): { key: string; icon: string }[] => {
      return keys.map(({ key, icon }) => ({
        key,
        icon: icon ?? this.getEntityAttribute(this.tripEntities[key]?.entity_id, 'icon'),
      }));
    };

    const overViewDataKeys = [
      { key: 'odometer' },
      { key: 'fuelLevel', icon: this.getEntityAttribute(this.tripEntities.fuelLevel?.entity_id, 'icon') },
      { key: 'rangeLiquid', icon: this.getEntityAttribute(this.tripEntities.rangeLiquid?.entity_id, 'icon') },
    ];

    const tripFromStartDataKeys = [
      { key: 'distanceStart' },
      { key: 'averageSpeedStart', icon: 'mdi:speedometer-slow' },
      { key: 'liquidConsumptionStart' },
    ];
    const tripFromResetDataKeys = [
      { key: 'distanceReset' },
      { key: 'averageSpeedReset', icon: 'mdi:speedometer' },
      { key: 'liquidConsumptionReset' },
    ];

    const overViewData = generateDataArray(overViewDataKeys);
    const tripFromStartData = generateDataArray(tripFromStartDataKeys);
    const tripFromResetData = generateDataArray(tripFromResetDataKeys);

    return html`
      ${this.generateCardTemplate('Overview', overViewData, this.tripEntities)}
      ${this.generateCardTemplate('From start', tripFromStartData, this.tripEntities)}
      ${this.generateCardTemplate('From reset', tripFromResetData, this.tripEntities)}
    `;
  }
  private getCardTypeData(cardType: string): { name: string; icon: string } {
    const cardTypeData: Record<string, { name: string; icon: string }> = {
      tripCards: { name: 'Trip data', icon: 'mdi:map-marker-path' },
      vehicleCards: { name: 'Vehicle status', icon: 'mdi:car-info' },
      ecoCards: { name: 'Eco display', icon: 'mdi:leaf' },
      tyreCards: { name: 'Tyre pressure', icon: 'mdi:tire' },
    };
    return cardTypeData[cardType] || { name: 'Unknown Card', icon: 'mdi:car' };
  }

  private getSecondaryInfo(cardType: string): string {
    const { tripEntities, warningEntities } = this;
    switch (cardType) {
      case 'tripCards' || 'default-tripCards':
        return `${this.getEntityState(tripEntities.odometer?.entity_id)} ${this.getAttrUnitOfMeasurement(
          this.tripEntities.odometer?.entity_id,
        )}`;
      case 'vehicleCards' || 'default-vehicleCards':
        return this.getEntityState(warningEntities.lock?.entity_id);
      case 'ecoCards' || 'default-ecoCards':
        return `${this.getEntityState(tripEntities.ecoScoreBonusRange?.entity_id)} ${this.getAttrUnitOfMeasurement(
          tripEntities.ecoScoreBonusRange?.entity_id,
        )}`;
      case 'tyreCards' || 'default-tyreCards':
        const tireAttributes = [
          'tirepressureFrontLeft',
          'tirepressureFrontRight',
          'tirepressureRearLeft',
          'tirepressureRearRight',
        ];
        const pressures = tireAttributes.map((attr) =>
          parseInt(this.getEntityAttributes(warningEntities.tire?.entity_id)[attr] || '0'),
        );
        const minPressure = Math.min(...pressures);
        const maxPressure = Math.max(...pressures);
        const tireUnit = this.getAttrUnitOfMeasurement(tripEntities.tirePressureFrontLeft?.entity_id);
        return `${minPressure} - ${maxPressure} ${tireUnit}`;
      default:
        return 'Unknown Card';
    }
  }

  private getBooleanState(entity: string | undefined): boolean {
    if (!entity || !this.hass.states[entity]) return false;
    return this.hass.states[entity].state === 'on';
  }

  private getEntityState(entity: string | undefined): string {
    if (!entity || !this.hass.states[entity]) return '';
    return this.hass.states[entity].state;
  }

  private getEntityAttributes(entity: string | undefined): { [key: string]: any } {
    if (!entity || !this.hass.states[entity] || !this.hass.states[entity].attributes) return {};
    return this.hass.states[entity].attributes;
  }

  private getEntityAttribute(entity: string | undefined, attribute: string): any {
    if (!entity || !this.hass.states[entity] || !this.hass.states[entity].attributes) return undefined;
    return this.hass.states[entity].attributes[attribute];
  }

  private getEntityFilters = (): { prefix: string; suffix: string }[] => {
    return [...Object.values(warningEntityFilters), ...Object.values(tripEntityFilters)];
  };

  private async getOriginalName(entity: string): Promise<string> {
    if (!this.hass) return '';
    const entityObj = await this.hass.callWS<{ entity_id: string; original_name: string }>({
      type: 'config/entity_registry/get',
      entity_id: entity,
    });
    return entityObj.original_name;
  }

  // Method to get the unit of measurement of an entity
  private getAttrUnitOfMeasurement(entity: string | undefined): string {
    if (!entity || !this.hass.states[entity] || !this.hass.states[entity].attributes) return '';
    return this.hass.states[entity].attributes.unit_of_measurement || '';
  }

  private toggleMoreInfo(entity: string): void {
    fireEvent(this, 'hass-more-info', { entityId: entity });
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  public getCardSize(): number {
    return 3;
  }
}
