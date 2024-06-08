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
  formatNumber,
  formatDateTime,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import {
  VehicleCardConfig,
  ExtendedThemes,
  sensorDeviceFilters,
  SensorDevice,
  binarySensorsFilters,
  BinarySensorDevice,
} from './types';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { formatTimestamp } from './utils/helpers';
import styles from './css/styles.css';

import './components/map-card.js';
import './components/header-slide.js';
import amgWhite from './images/amg_bg_white.png';
import amgBlack from './images/amg_bg_black.png';

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
  documentationURL: 'https://github.com/ngocjohn/vehicle-info-card?tab=readme-ov-file#configuration',
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
      enable_map_popup: false,
      images: [],
      trip_card: [],
      vehicle_card: [],
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

    if (this.config.device_tracker) {
      const haMapConfig = {
        type: 'map',
        zoom: 14,
        entities: [
          {
            entity: this.config.device_tracker,
          },
        ],
      };
      this.createCards([haMapConfig], 'mapDialog');
    }
  }

  @property({ attribute: false }) public hass!: HomeAssistant & { themes: ExtendedThemes };

  @property({ type: Object }) private config!: VehicleCardConfig;

  @state() private sensorDevices: { [key: string]: SensorDevice } = {};
  @state() private binaryDevices: { [key: string]: BinarySensorDevice } = {};
  @state() private additionalCards: { [key: string]: any[] } = {};

  @state() private activeCardType: string | null = null;

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return [styles];
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.configureAsync();
  }

  private async configureAsync(): Promise<void> {
    [this.sensorDevices, this.binaryDevices] = await Promise.all([
      this.getDeviceEntities(sensorDeviceFilters),
      this.getDeviceEntities(binarySensorsFilters),
    ]);

    this.requestUpdate();
  }

  private async getDeviceEntities(filter: {
    [key: string]: { suffix: string };
  }): Promise<{ [key: string]: SensorDevice | BinarySensorDevice }> {
    const allEntities = await this.hass.callWS<
      { entity_id: string; device_id: string; original_name: string; unique_id: string }[]
    >({
      type: 'config/entity_registry/list',
    });

    const carEntity = allEntities.find((e) => e.entity_id === this.config.entity);
    if (!carEntity) {
      return {};
    }

    const deviceEntities = allEntities.filter((e) => e.device_id === carEntity.device_id);
    const entityIds: { [key: string]: SensorDevice | BinarySensorDevice } = {};

    for (const entityName of Object.keys(filter)) {
      const { suffix } = filter[entityName];
      const entity = deviceEntities.find((e) => e.unique_id.endsWith(suffix));
      if (entity) {
        entityIds[entityName] = {
          entity_id: entity.entity_id,
          original_name: entity.original_name,
          device_id: entity.device_id,
        };
      } else {
        entityIds[entityName] = { entity_id: '', original_name: '', device_id: '' };
      }
    }
    return entityIds;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('toggle-map-popup', () => this.showMapOnCard());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('toggle-map-popup', () => this.showMapOnCard());
  }

  showMapOnCard(): void {
    this.activeCardType = 'mapDialog';
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
    if (changedProps.has('activeCardType') && this.activeCardType !== 'mapDialog') {
      this.setupCardListeners();
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

  /* -------------------------------------------------------------------------- */
  /* MAIN RENDER                                                                */
  /* -------------------------------------------------------------------------- */

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
    const background = isDark ? amgWhite : amgBlack;

    return html` <div class="header-background" style="background-image: url(${background})"></div> `;
  }

  private _renderMainCard(): TemplateResult | void {
    return html`
      <main id="main-wrapper">
        <div class="header-info-box">${this._renderWarnings()} ${this._renderRangeInfo()}</div>
        ${this._renderHeaderSlides()} ${this._renderMap()} ${this._renderButtons()}
      </main>
    `;
  }

  private _renderWarnings(): TemplateResult {
    const { lock, parkBrake } = this.binaryDevices;
    const lockState = this.getEntityState(lock?.entity_id);
    const parkBrakeState = this.getBooleanState(parkBrake?.entity_id);
    return html`
      <div class="info-box">
        <div class="item">
          <ha-icon icon=${lockState === 'locked' ? 'mdi:lock' : 'mdi:lock-open'}></ha-icon>
          <div><span style="text-transform: capitalize;">${lockState}</span></div>
        </div>
        <div class="item">
          <ha-icon icon="mdi:car-brake-parking"></ha-icon>
          <div><span>${parkBrakeState ? 'Parked' : 'Released'}</span></div>
        </div>
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult | void {
    const { fuelLevel, rangeLiquid, rangeElectric, soc } = this.sensorDevices;
    const { state: fuelState, unit: fuelUnit } = this.getEntityInfo(fuelLevel?.entity_id);
    const { state: rangeLiquidState, unit: rangeUnit } = this.getEntityInfo(rangeLiquid?.entity_id);
    const { state: rangeElectricState, unit: electricUnit } = this.getEntityInfo(rangeElectric?.entity_id);
    const { state: socState, unit: socUnit } = this.getEntityInfo(soc?.entity_id);

    if (fuelState && rangeLiquidState) {
      const fuelProgress = html`
        <div class="fuel-wrapper">
          <div class="fuel-level-bar" style="width: ${fuelState}%;"></div>
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
            <span>${rangeLiquidState} ${rangeUnit}</span>
          </div>
        </div>
      `;
    } else if (rangeElectricState && socState) {
      const socProgress = html`
        <div class="fuel-wrapper">
          <div class="fuel-level-bar" style="width: ${socState}%;"></div>
        </div>
      `;

      return html`
        <div class="info-box">
          <div class="item">
            <ha-icon icon="mdi:ev-station"></ha-icon>
            <div><span>${socState} ${socUnit}</span></div>
          </div>
          ${socProgress}
          <div class="item">
            <span>${rangeElectricState} ${electricUnit}</span>
          </div>
        </div>
      `;
    }
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
          .popup=${this.config.enable_map_popup}
        ></vehicle-map>
      </div>
    `;
  }

  private _renderButtons(): TemplateResult {
    if (!this.config.show_buttons) return html``;

    return html`
      <div class="grid-container">
        ${['tripCards', 'vehicleCards', 'ecoCards', 'tyreCards'].map(
          (cardType) => html`
            <div class="grid-item" @click=${() => this.toggleCardFromButtons(cardType)}>
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
        if (!this.config.trip_card || this.config.trip_card.length === 0) {
          cards = this._renderDefaultTripCard();
          isDefaultCard = true;
        } else {
          cards = this.additionalCards[this.activeCardType];
        }
        break;
      case 'vehicleCards':
        if (!this.config.vehicle_card || this.config.vehicle_card.length === 0) {
          cards = this._renderDefaultVehicleCard();
          isDefaultCard = true;
        } else {
          cards = this.additionalCards[this.activeCardType];
        }
        break;
      case 'ecoCards':
        if (!this.config.eco_card || this.config.eco_card.length === 0) {
          cards = this._renderDefaultEcoCard();
          isDefaultCard = true;
        } else {
          cards = this.additionalCards[this.activeCardType];
        }
        break;
      case 'tyreCards':
        if (!this.config.tyre_card || this.config.tyre_card.length === 0) {
          cards = this._renderDefaultTyreCard();
          isDefaultCard = true;
        } else {
          cards = this.additionalCards[this.activeCardType];
        }
        break;
      case 'mapDialog':
        cards = this.additionalCards[this.activeCardType];
        break;

      default:
        return html``;
    }

    const lastCarUpdate = this.config.entity ? this.hass.states[this.config.entity].last_changed : '';
    const formattedDate = this.hass.locale
      ? formatDateTime(new Date(lastCarUpdate), this.hass.locale)
      : formatTimestamp(lastCarUpdate);
    return html`
      <main id="cards-wrapper">
        ${this._renderAdditionalCardHeader()}
        <section class="card-element">
          ${isDefaultCard ? cards : cards.map((card: any) => html`<div class="added-card">${card}</div>`)}
        </section>
        ${isDefaultCard
          ? html` <div class="last-update">
              <span>Last update: ${formattedDate}</span>
            </div>`
          : ''}
      </main>
    `;
  }

  private _renderAdditionalCardHeader(): TemplateResult {
    return html`
      <div class="added-card-header">
        <div class="headder-btn" @click="${() => this.closeAddedCard()}">
          <ha-icon icon="mdi:close"></ha-icon>
        </div>
        <div class="card-toggle">
          <div class="headder-btn" @click=${() => this.togglePrevCard()}>
            <ha-icon icon="mdi:chevron-left"></ha-icon>
          </div>
          <div class="headder-btn" @click=${() => this.toggleNextCard()}>
            <ha-icon icon="mdi:chevron-right"></ha-icon>
          </div>
        </div>
      </div>
    `;
  }

  /* -------------------------------------------------------------------------- */
  /* ADDED CARD FUNCTIONALITY                                                   */
  /* -------------------------------------------------------------------------- */

  private setupCardListeners(): void {
    const cardElement = this.shadowRoot?.querySelector('.card-element');
    if (!cardElement) return;

    // Variables to store touch/mouse coordinates
    let xDown: number | null = null;
    let yDown: number | null = null;
    let xDiff: number | null = null;
    let yDiff: number | null = null;
    let isSwiping = false;

    const presDown = (e: TouchEvent | MouseEvent) => {
      e.stopImmediatePropagation();
      if (e instanceof TouchEvent) {
        xDown = e.touches[0].clientX;
        yDown = e.touches[0].clientY;
      } else if (e instanceof MouseEvent) {
        xDown = e.clientX;
        yDown = e.clientY;
      }

      ['touchmove', 'mousemove'].forEach((event) => {
        cardElement.addEventListener(event, pressMove as EventListener);
      });

      ['touchend', 'mouseup'].forEach((event) => {
        cardElement.addEventListener(event, pressRelease as EventListener);
      });
    };

    const pressMove = (e: TouchEvent | MouseEvent) => {
      if (xDown === null || yDown === null) return;

      if (e instanceof TouchEvent) {
        xDiff = xDown - e.touches[0].clientX;
        yDiff = yDown - e.touches[0].clientY;
      } else if (e instanceof MouseEvent) {
        xDiff = xDown - e.clientX;
        yDiff = yDown - e.clientY;
      }

      if (xDiff !== null && yDiff !== null) {
        if (Math.abs(xDiff) > 1 && Math.abs(yDiff) > 1) {
          isSwiping = true;
        }
      }
    };

    const pressRelease = (e: TouchEvent | MouseEvent) => {
      e.stopImmediatePropagation();

      ['touchmove', 'mousemove'].forEach((event) => {
        cardElement.removeEventListener(event, pressMove as EventListener);
      });

      ['touchend', 'mouseup'].forEach((event) => {
        cardElement.removeEventListener(event, pressRelease as EventListener);
      });

      const cardWidth = cardElement.clientWidth;

      if (isSwiping && xDiff !== null && yDiff !== null) {
        if (Math.abs(xDiff) > Math.abs(yDiff) && Math.abs(xDiff) > cardWidth / 3) {
          if (xDiff > 0) {
            this.toggleNextCard();
          } else {
            this.togglePrevCard();
          }
        }
        xDiff = yDiff = xDown = yDown = null;
        isSwiping = false;
      }
    };

    // Attach the initial pressDown listeners
    ['touchstart', 'mousedown'].forEach((event) => {
      cardElement.addEventListener(event, presDown as EventListener);
    });
  }

  private toggleNextCard(): void {
    if (!this.activeCardType) return;
    const cardTypes = ['tripCards', 'vehicleCards', 'ecoCards', 'tyreCards'];
    const currentIndex = cardTypes.indexOf(this.activeCardType);
    const nextIndex = currentIndex === cardTypes.length - 1 ? 0 : currentIndex + 1;
    this.activeCardType = cardTypes[nextIndex];
  }

  private togglePrevCard(): void {
    if (!this.activeCardType) return;
    const cardTypes = ['tripCards', 'vehicleCards', 'ecoCards', 'tyreCards'];
    const currentIndex = cardTypes.indexOf(this.activeCardType);
    const prevIndex = currentIndex === 0 ? cardTypes.length - 1 : currentIndex - 1;
    this.activeCardType = cardTypes[prevIndex];
  }

  private closeAddedCard(): void {
    this.activeCardType = null;
  }

  private toggleCardFromButtons(cardType: string): void {
    this.activeCardType = this.activeCardType === cardType ? null : cardType;
  }

  /* -------------------------------------------------------------------------- */
  /* RENDER DEFAULT CARDS                                                       */
  /* -------------------------------------------------------------------------- */

  private generateDataRow(
    title: string,
    data: Array<{ key: string; name?: string; icon?: string }>, // icon is optional now
    entityCollection: any,
  ): TemplateResult {
    return html`
      <div class="default-card">
        <div class="data-header">${title}</div>
        ${data.map(({ key, name, icon }) => {
          const entity = entityCollection[key];
          const entityId = entity?.entity_id;
          const entityName = name ?? entity?.original_name;
          let entityState = entityId ? this.getEntityState(entityId) : '';
          const unitOfMeasurement = entityId ? this.getAttrUnitOfMeasurement(entityId) : '';

          // Render correct formated state
          if (!isNaN(parseFloat(entityState)) && entityState !== '') {
            entityState = formatNumber(entityState, this.hass.locale);
          }

          // Render only if originalName and entityId are defined
          if (entityId) {
            return html`
              <div class="data-row">
                <div>
                  ${icon ? html`<ha-icon class="data-icon" icon="${icon}"></ha-icon>` : ''}
                  <span>${entityName}</span>
                </div>
                <div class="data-value-unit" @click=${() => this.toggleMoreInfo(entityId)}>
                  <span>${entityState} ${unitOfMeasurement}</span>
                </div>
              </div>
            `;
          } else {
            return html``; // Return an empty template if conditions are not met
          }
        })}
      </div>
    `;
  }

  private _renderDefaultTripCard(): TemplateResult | void {
    const generateDataArray = (
      keys: { key: string; name?: string; icon?: string }[],
    ): { key: string; name: string; icon: string }[] => {
      return keys.map(({ key, name, icon }) => ({
        key,
        name: name ?? this.sensorDevices[key]?.original_name,
        icon: icon ?? this.getEntityAttribute(this.sensorDevices[key]?.entity_id, 'icon'),
      }));
    };

    const overViewDataKeys = [
      { key: 'odometer' },
      { key: 'fuelLevel' },
      { key: 'rangeLiquid' },
      { key: 'soc' },
      { key: 'maxSoc' },
      { key: 'rangeElectric' },
    ];

    const tripFromResetDataKeys = [
      { key: 'distanceReset' },
      { key: 'averageSpeedReset', icon: 'mdi:speedometer' },
      { key: 'liquidConsumptionReset', name: 'Consumption reset' },
      { key: 'electricConsumptionReset', name: 'Consumption reset' },
    ];

    const tripFromStartDataKeys = [
      { key: 'distanceStart' },
      { key: 'averageSpeedStart', icon: 'mdi:speedometer-slow' },
      { key: 'liquidConsumptionStart', name: 'Consumption reset' },
      { key: 'electricConsumptionStart', name: 'Consumption start' },
    ];

    const overViewData = generateDataArray(overViewDataKeys);
    const tripFromStartData = generateDataArray(tripFromStartDataKeys);
    const tripFromResetData = generateDataArray(tripFromResetDataKeys);

    return html`
      ${this.generateDataRow('Overview', overViewData, this.sensorDevices)}
      ${this.generateDataRow('From start', tripFromStartData, this.sensorDevices)}
      ${this.generateDataRow('From reset', tripFromResetData, this.sensorDevices)}
    `;
  }

  private _renderDefaultVehicleCard(): TemplateResult | void {
    const binarySensor = this.binaryDevices;

    const generateDataArray = (
      keys: { key: string; state?: string; icon?: string }[],
    ): { key: string; state: string; icon: string }[] => {
      return keys.map(({ key, state, icon }) => ({
        key,
        icon: icon ?? this.getEntityAttribute(this.binaryDevices[key]?.entity_id, 'icon'),
        state: state ?? this.getBooleanState(this.binaryDevices[key]?.entity_id) ? 'Problem' : 'OK',
      }));
    };

    const vehicleData = [
      {
        key: 'parkBrake',
        icon: this.getEntityAttribute(binarySensor.parkBrake?.entity_id, 'icon'),
        state: this.getBooleanState(binarySensor.parkBrake?.entity_id) ? 'Engaged' : 'Released',
      },
      {
        key: 'windowsClosed',
        icon: this.getEntityAttribute(binarySensor.windowsClosed?.entity_id, 'icon'),
        state: this.getBooleanState(binarySensor.windowsClosed?.entity_id) ? 'Closed' : 'Opened',
      },
    ];

    const warningsDataKeys = [
      {
        key: 'tirePressureWarning',
      },
      {
        key: 'lowBrakeFluid',
      },
      {
        key: 'lowCoolantLevel',
      },
      {
        key: 'engineLight',
      },
      {
        key: 'lowWashWater',
      },
    ];

    const lockState = this.getEntityState(binarySensor.lock?.entity_id);
    const lockIcon = lockState === 'locked' ? 'mdi:lock' : 'mdi:lock-open';
    const lockColor = lockState === 'locked' ? 'warning' : '';
    const lockEntity = binarySensor.lock?.entity_id;
    const lockName = binarySensor.lock?.original_name;

    const warningsData = generateDataArray(warningsDataKeys);

    return html`
      <div class="default-card">
        <div class="data-header">Vehicle status</div>
        <div id="lockelement" class="data-row">
          <div>
            <ha-icon class="data-icon ${lockColor}" icon=${lockIcon}></ha-icon>
            <span>${lockName}</span>
          </div>
          <div class="data-value-unit">
            <span style="text-transform: capitalize" @click=${() => this.toggleMoreInfo(lockEntity)}>${lockState}</span>
          </div>
        </div>
        ${vehicleData.map(
          ({ key, icon, state }) => html`
            <div class="data-row">
              <div>
                <ha-icon
                  class="data-icon ${this.getBooleanState(binarySensor[key]?.entity_id) ? 'warning' : ''} "
                  icon="${icon}"
                  @click=${() => this.toggleMoreInfo(binarySensor[key]?.entity_id)}
                ></ha-icon>
                <span>${binarySensor[key]?.original_name}</span>
              </div>
              <div class="data-value-unit" @click=${() => this.toggleMoreInfo(binarySensor[key]?.entity_id)}>
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
            <div class="data-row">
              <div>
                <ha-icon
                  class="data-icon"
                  icon="${icon}"
                  @click=${() => this.toggleMoreInfo(binarySensor[key]?.entity_id)}
                ></ha-icon>
                <span>${binarySensor[key]?.original_name}</span>
              </div>
              <div
                class="data-value-unit   ${this.getBooleanState(binarySensor[key]?.entity_id) ? 'error' : ''} "
                @click=${() => this.toggleMoreInfo(binarySensor[key]?.entity_id)}
              >
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
      item.icon = this.getEntityAttribute(this.sensorDevices[item.key]?.entity_id, 'icon');
    });

    return this.generateDataRow('Eco display', ecoData, this.sensorDevices);
  }

  private _renderDefaultTyreCard(): TemplateResult | void {
    const tyreData = [
      { key: 'tirePressureFrontLeft', icon: 'mdi:tire' },
      { key: 'tirePressureFrontRight', icon: 'mdi:tire' },
      { key: 'tirePressureRearLeft', icon: 'mdi:tire' },
      { key: 'tirePressureRearRight', icon: 'mdi:tire' },
    ];

    return this.generateDataRow('Tyre pressures', tyreData, this.sensorDevices);
  }

  private getCardTypeData(cardType: string): { name: string; icon: string } {
    const cardTypeData: Record<string, { name: string; icon: string }> = {
      tripCards: { name: 'Trip data', icon: 'mdi:map-marker-path' },
      vehicleCards: { name: 'Vehicle status', icon: 'mdi:car-info' },
      ecoCards: { name: 'Eco display', icon: 'mdi:leaf' },
      tyreCards: { name: 'Tyre pressure', icon: 'mdi:tire' },
    };
    return cardTypeData[cardType];
  }

  /* -------------------------------------------------------------------------- */
  /* GET ENTITIES STATE AND ATTRIBUTES                                          */
  /* -------------------------------------------------------------------------- */

  private getSecondaryInfo(cardType: string): string {
    const { sensorDevices, binaryDevices } = this;
    switch (cardType) {
      case 'tripCards':
        const odometerState = parseFloat(this.getEntityState(sensorDevices.odometer?.entity_id));
        const odometerUnit = this.getAttrUnitOfMeasurement(sensorDevices.odometer?.entity_id);
        const formatedState = formatNumber(odometerState, this.hass.locale);
        return `${formatedState} ${odometerUnit}`;

      case 'vehicleCards':
        const lockedState = this.getEntityState(binaryDevices.lock?.entity_id) === 'locked' ? 'Locked' : 'Unlocked';
        if (!lockedState) return '';
        return lockedState;
      case 'ecoCards':
        return `${this.getEntityState(sensorDevices.ecoScoreBonusRange?.entity_id)} ${this.getAttrUnitOfMeasurement(
          sensorDevices.ecoScoreBonusRange?.entity_id,
        )}`;
      case 'tyreCards':
        const tireAttributes = [
          'tirePressureFrontRight',
          'tirePressureFrontRight',
          'tirePressureRearLeft',
          'tirePressureRearRight',
        ];

        // Store pressures with their original units
        const pressuresWithUnits = tireAttributes.map((attr) => ({
          pressure: this.getEntityState(sensorDevices[attr]?.entity_id) || '',
          unit: this.getAttrUnitOfMeasurement(sensorDevices[attr]?.entity_id),
        }));

        // Find the minimum and maximum pressures
        const minPressure = Math.min(...pressuresWithUnits.map(({ pressure }) => parseFloat(pressure)));
        const maxPressure = Math.max(...pressuresWithUnits.map(({ pressure }) => parseFloat(pressure)));

        // Format the minimum and maximum pressures with their original units
        const tireUnit = pressuresWithUnits[0]?.unit || ''; // Assuming all pressures have the same unit
        const formattedMinPressure = minPressure % 1 === 0 ? minPressure.toFixed(0) : minPressure.toFixed(1);
        const formattedMaxPressure = maxPressure % 1 === 0 ? maxPressure.toFixed(0) : maxPressure.toFixed(1);
        return `${formattedMinPressure} - ${formattedMaxPressure} ${tireUnit}`;
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

  private getEntityIcon(entity: string | undefined): string {
    if (!entity || !this.hass.states[entity]) return '';
    const icon = this.hass.states[entity].attributes.icon;
    return icon ? icon : '';
  }

  private getEntityAttributes(entity: string | undefined): { [key: string]: any } {
    if (!entity || !this.hass.states[entity] || !this.hass.states[entity].attributes) return {};
    return this.hass.states[entity].attributes;
  }

  private getEntityAttribute(entity: string | undefined, attribute: string): any {
    if (!entity || !this.hass.states[entity] || !this.hass.states[entity].attributes) return undefined;
    return this.hass.states[entity].attributes[attribute];
  }

  private getEntityInfo = (entityId: string | undefined) => {
    const state = this.getEntityState(entityId);
    const unit = this.getAttrUnitOfMeasurement(entityId);
    return { state, unit };
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
