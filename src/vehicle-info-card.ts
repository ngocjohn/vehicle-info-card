/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';

// Third-party Libraries
import ApexCharts from 'apexcharts';

// Custom Helpers
import {
  fireEvent,
  formatDateTime,
  formatNumber,
  hasConfigOrEntityChanged,
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceCardEditor,
} from 'custom-card-helpers';

// Custom Types and Constants
import {
  BinarySensorDevice,
  binarySensorsFilters,
  ExtendedThemes,
  SensorDevice,
  sensorDeviceFilters,
  VehicleCardConfig,
  defaultConfig,
  EntityConfig,
} from './types';
import { CARD_VERSION, lockAttrMapping, lockStateMapping, cardTypes } from './const';
import { localize } from './localize/localize';
import { formatTimestamp } from './utils/helpers';
import { getDeviceEntities } from './utils/utils';
import { tapFeedback } from './utils/tap-action.js';

// Styles and Assets
import styles from './css/styles.css';
import './components/map-card.js';
import './components/header-slide.js';
import amgWhite from './images/amg_bg_white.png';
import amgBlack from './images/amg_bg_black.png';

declare global {
  interface Window {
    customCards: any[];
    loadCardHelpers: () => Promise<void>;
  }
}

console.info(
  `%c  VEHICLE-INFO-CARD %c  ${CARD_VERSION}  `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

window.customCards = window.customCards || [];
window.customCards.push({
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

  // https://lit.dev/docs/components/styles/
  public static get styles(): CSSResultGroup {
    return styles;
  }

  public static getStubConfig(): Record<string, unknown> {
    return {
      ...defaultConfig,
    };
  }

  public setConfig(config: VehicleCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    this.config = {
      ...config,
    };

    // // Helper function to handle creating cards based on config property names
    // const createConfigCards = (configProperty: keyof VehicleCardConfig, target: string) => {
    //   const cardConfig = this.config[configProperty];
    //   if (cardConfig) {
    //     this.createCards(cardConfig, target);
    //   }
    // };

    // // Create cards for each specific config property
    // createConfigCards('trip_card', 'tripCards');
    // createConfigCards('vehicle_card', 'vehicleCards');
    // createConfigCards('eco_card', 'ecoCards');
    // createConfigCards('tyre_card', 'tyreCards');

    for (const cardType of cardTypes) {
      if (this.config[cardType.config]) {
        this.createCards(this.config[cardType.config], cardType.type);
      }
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

  private lockAttributesVisible = false;
  private windowAttributesVisible = false;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.configureAsync();
  }

  private async configureAsync(): Promise<void> {
    [this.sensorDevices, this.binaryDevices] = await Promise.all([
      getDeviceEntities(this.hass, this.config, sensorDeviceFilters),
      getDeviceEntities(this.hass, this.config, binarySensorsFilters),
    ]);

    this.requestUpdate();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addCustomEventListener('toggle-map-popup', this.showMapOnCard);
    this.setButtonEventListeners();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeCustomEventListener('toggle-map-popup', this.showMapOnCard);
    this.removeButtonEventListeners();
  }

  private addCustomEventListener(event: string, handler: EventListenerOrEventListenerObject): void {
    this.addEventListener(event, handler);
  }

  private removeCustomEventListener(event: string, handler: EventListenerOrEventListenerObject): void {
    this.removeEventListener(event, handler);
  }

  private setButtonEventListeners(): void {
    this.manageButtonEventListeners('addEventListener');
  }

  private removeButtonEventListeners(): void {
    this.manageButtonEventListeners('removeEventListener');
  }

  private manageButtonEventListeners(action: 'addEventListener' | 'removeEventListener'): void {
    const buttons = this.shadowRoot?.querySelectorAll('.grid-item');
    if (!buttons) return;
    buttons.forEach((button) => {
      button[action]('click', () => tapFeedback(button));
    });
  }

  private showMapOnCard(): void {
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
    if (changedProps.has('activeCardType') && this.activeCardType === 'ecoCards') {
      this.initializeEcoChart();
    }

    if (changedProps.has('activeCardType') && this.activeCardType === null) {
      this.manageButtonEventListeners('addEventListener');
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

    const isDark = this.isDark() ? 'dark' : '';
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
    // Get the current state of the lock and park brake
    const lockState = this.getEntityState(this.sensorDevices.lock?.entity_id);
    const parkBrakeState = this.getBooleanState(this.binaryDevices.parkBrake?.entity_id);

    // Determine the display text for the lock state
    // Default to "Unknown" if the lock state is not in the formatting object
    const lockDisplayText = lockStateMapping[lockState] || lockStateMapping['4'];

    return html`
      <div class="info-box">
        <div class="item">
          <ha-icon icon=${lockState === '2' || lockState === '1' ? 'mdi:lock' : 'mdi:lock-open'}></ha-icon>
          <div><span>${lockDisplayText} </span></div>
        </div>
        <div class="item">
          <ha-icon icon="mdi:car-brake-parking"></ha-icon>
          <div><span>${parkBrakeState ? 'Parked' : 'Released'}</span></div>
        </div>
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult | void {
    const { fuelLevel, rangeLiquid, rangeElectric } = this.sensorDevices;
    const { state: fuelState, unit: fuelUnit } = this.getEntityInfo(fuelLevel?.entity_id);
    const { state: rangeLiquidState, unit: rangeUnit } = this.getEntityInfo(rangeLiquid?.entity_id);
    const { state: rangeElectricState, unit: electricUnit } = this.getEntityInfo(rangeElectric?.entity_id);
    const { state: socState, unit: socUnit } = {
      state: this.getEntityAttribute(rangeElectric?.entity_id, 'soc'),
      unit: '%',
    };

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
            <div><span>${fuelState} ${fuelUnit}</span></div>
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
        ${cardTypes.map(
          (cardType) => html`
            <div class="grid-item" @click=${() => this.toggleCardFromButtons(cardType.type)}>
              <div class="item-icon">
                <ha-icon .icon="${cardType.icon}"></ha-icon>
              </div>
              <div class="item-content">
                <span class="primary">${cardType.name}</span>
                <span class="secondary">${this.getSecondaryInfo(cardType.type)}</span>
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }

  private _renderAdditionalCard(): TemplateResult | LovelaceCard | void {
    if (!this.activeCardType) return html``;

    const cardConfigMap = {
      tripCards: {
        config: this.config.trip_card,
        defaultRender: this._renderDefaultTripCard.bind(this),
      },
      vehicleCards: {
        config: this.config.vehicle_card,
        defaultRender: this._renderDefaultVehicleCard.bind(this),
      },
      ecoCards: {
        config: this.config.eco_card,
        defaultRender: this._renderDefaultEcoCard.bind(this),
      },
      tyreCards: {
        config: this.config.tyre_card,
        defaultRender: this._renderDefaultTyreCard.bind(this),
      },
      mapDialog: {
        config: [],
        defaultRender: () => this.additionalCards['mapDialog'],
      },
    };

    const cardInfo = cardConfigMap[this.activeCardType];

    if (!cardInfo) {
      return html``;
    }

    const isDefaultCard = !cardInfo.config || cardInfo.config.length === 0;
    const cards = isDefaultCard ? cardInfo.defaultRender() : this.additionalCards[this.activeCardType];

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
        ${isDefaultCard ? html`<div class="last-update"><span>Last update: ${formattedDate}</span></div>` : ''}
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
          <div class="headder-btn" @click=${() => this.toggleCard('prev')}>
            <ha-icon icon="mdi:chevron-left"></ha-icon>
          </div>
          <div class="headder-btn" @click=${() => this.toggleCard('next')}>
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
    console.log(cardElement);
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
            // Next card - swipe left
            cardElement.classList.add('swiping-left');
            setTimeout(() => {
              this.toggleCard('next');
              cardElement.classList.remove('swiping-left');
            }, 300);
          } else {
            // Previous card - swipe right
            cardElement.classList.add('swiping-right');
            setTimeout(() => {
              this.toggleCard('prev');
              cardElement.classList.remove('swiping-right');
            }, 300);
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

  private toggleCard(direction: 'next' | 'prev'): void {
    if (!this.activeCardType) return;
    const currentIndex = cardTypes.findIndex((card) => card.type === this.activeCardType);

    const newIndex =
      direction === 'next'
        ? (currentIndex + 1) % cardTypes.length
        : (currentIndex - 1 + cardTypes.length) % cardTypes.length;
    this.activeCardType = cardTypes[newIndex].type;
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
    data: Array<EntityConfig>, // icon is optional now
    entityCollection: any,
  ): TemplateResult {
    return html`
      <div class="default-card">
        <div class="data-header">${title}</div>
        ${data.map(({ key, name, icon, state }) => {
          const entity = entityCollection[key];
          const entityId = entity?.entity_id;
          const entityName = name ?? entity?.original_name;
          let entityState = state ?? this.getEntityState(entityId);
          const unitOfMeasurement = entityId ? this.getEntityUnit(entityId) : '';
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
      keys: { key: string; name?: string; icon?: string; state?: string }[],
    ): { key: string; name: string; icon: string; state: string }[] => {
      return keys.map(({ key, name, icon, state }) => ({
        key,
        name: name ?? this.sensorDevices[key]?.original_name,
        icon: icon ?? this.getEntityAttribute(this.sensorDevices[key]?.entity_id, 'icon'),
        state: state ?? this.getEntityState(this.sensorDevices[key]?.entity_id),
      }));
    };

    const overViewDataKeys = [
      { key: 'odometer' },
      { key: 'fuelLevel' },
      { key: 'rangeLiquid' },
      {
        key: 'soc',
        name: 'State of charger',
        state: this.getEntityAttribute(this.sensorDevices.rangeElectric?.entity_id, 'soc'),
      },
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
      { key: 'liquidConsumptionStart', name: 'Consumption start' },
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

    const generateDataArray = (keys: Array<EntityConfig>): { key: string; state: string; icon: string }[] => {
      return keys.map(({ key, state, icon, name }) => ({
        key,
        icon: icon ?? this.getEntityAttribute(this.binaryDevices[key]?.entity_id, 'icon'),
        state: state ?? this.getBooleanState(this.binaryDevices[key]?.entity_id) ? 'Problem' : 'OK',
        name: name ?? this.binaryDevices[key]?.original_name,
      }));
    };

    const vehicleData = [
      {
        key: 'parkBrake',
        name: 'Park brake',
        icon: this.getEntityAttribute(binarySensor.parkBrake?.entity_id, 'icon'),
        state: this.getBooleanState(binarySensor.parkBrake?.entity_id) ? 'Engaged' : 'Released',
      },
      {
        key: 'windowsClosed',
        name: 'Windows',
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

    const lockState = this.getEntityState(this.sensorDevices.lock?.entity_id);
    const lockStateFormatted = lockStateMapping[lockState] || lockStateMapping['4'];
    const lockIcon = lockState === '2' || lockState === '1' ? 'mdi:lock' : 'mdi:lock-open';
    const lockColor = lockState === '2' || lockState === '1' ? 'warning' : '';
    const lockName = this.sensorDevices.lock?.original_name;
    const lockEntity = this.sensorDevices.lock?.entity_id;

    const warningsData = generateDataArray(warningsDataKeys);

    const lockAttributeStates: Record<string, any> = {};

    // Iterate over the keys of the lockAttrMapping object
    Object.keys(lockAttrMapping).forEach((attribute) => {
      const attributeState = this.getEntityAttribute(this.sensorDevices.lock?.entity_id, attribute);
      if (attributeState !== undefined && attributeState !== null) {
        lockAttributeStates[attribute] = attributeState;
      }
    });

    const lockAttrVisible = this.lockAttributesVisible ? 'mdi:chevron-up' : 'mdi:chevron-right';

    return html`
      <div class="default-card">
        <div class="data-header">Vehicle status</div>
        <div id="lockelement" class="data-row">
          <div>
            <ha-icon class="data-icon ${lockColor}" icon=${lockIcon}></ha-icon>
            <span>${lockName}</span>
          </div>
          <div class="data-value-unit">
            <span style="text-transform: capitalize" @click=${() => this.toggleMoreInfo(lockEntity)}
              >${lockStateFormatted}</span
            >
            <ha-icon icon="${lockAttrVisible}" @click=${() => this.toggleLockAttributes()}></ha-icon>
          </div>
        </div>

        ${this._renderLockAttributes(lockAttributeStates)}
        ${vehicleData.map(
          ({ key, icon, state, name }) => html`
            <div class="data-row">
              <div>
                <ha-icon
                  class="data-icon ${this.getBooleanState(binarySensor[key]?.entity_id) ? 'warning' : ''} "
                  icon="${icon}"
                  @click=${() => this.toggleMoreInfo(binarySensor[key]?.entity_id)}
                ></ha-icon>
                <span>${name}</span>
              </div>
              <div class="data-value-unit" @click=${() => this.toggleMoreInfo(binarySensor[key]?.entity_id)}>
                <span>${state}</span>
                <ha-icon icon="mdi:chevron-right" style="opacity: 0;"></ha-icon>
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

  // Method to toggle the visibility of lock attributes
  private toggleLockAttributes() {
    this.lockAttributesVisible = !this.lockAttributesVisible;
    this.requestUpdate(); // Trigger a re-render
  }

  private _renderLockAttributes(attributeStates: Record<string, string>): TemplateResult {
    const attributesClass = this.lockAttributesVisible ? 'sub-attributes active' : 'sub-attributes';
    // Render the lock attributes
    return html`
      <div class=${attributesClass}>
        ${Object.keys(attributeStates).map((attribute) => {
          const rawState = attributeStates[attribute];

          // Check if the state is valid and the attribute mapping exists
          if (rawState !== undefined && rawState !== null && lockAttrMapping[attribute]) {
            const readableState = lockAttrMapping[attribute].state[rawState] || 'Unknown';

            return html`
              <div class="data-row">
                <span>${lockAttrMapping[attribute].name}</span>
                <div class="data-value-unit">
                  <span style="text-transform: capitalize">${readableState}</span>
                </div>
              </div>
            `;
          }
          // Return nothing if the attribute state is not valid or attribute mapping does not exist
          return '';
        })}
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
    return html`<div class="default-card">
        <div class="data-header">Eco display</div>
        <div id="chart"></div>
      </div>
      ${this.generateDataRow('', ecoData, this.sensorDevices)}`;
  }

  private initializeEcoChart(): void {
    const chartElement = this.shadowRoot?.querySelector('#chart');

    if (!chartElement) return;

    const bonusRange = this.getEntityState(this.sensorDevices.ecoScoreBonusRange?.entity_id);
    const acceleration = this.getEntityState(this.sensorDevices.ecoScoreAcceleraion?.entity_id);
    const constant = this.getEntityState(this.sensorDevices.ecoScoreConstant?.entity_id);
    const freeWheel = this.getEntityState(this.sensorDevices.ecoScoreFreeWheel?.entity_id);

    const options = {
      series: [acceleration, constant, freeWheel],
      chart: {
        height: 350,
        width: 350,
        type: 'radialBar',
      },
      plotOptions: {
        radialBar: {
          offsetY: 0,
          startAngle: 0,
          endAngle: 270,
          hollow: {
            margin: 5,
            size: '40%',
            background: '#ffffff',
            image: undefined,
          },
          dataLabels: {
            textAnchor: 'middle',
            distributed: false,

            name: {
              show: true,
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 'bold',
            },
            total: {
              show: true,
              label: 'Bonus range',
              formatter: function () {
                return bonusRange + ' km';
              },
              offsetX: 50,
              offsetY: 10,
            },
          },
          barLabels: {
            enabled: true,
            useSeriesColors: true,
            margin: 8,
            fontSize: '16px',
            formatter: function (seriesName, opts) {
              return seriesName + ':  ' + opts.w.globals.series[opts.seriesIndex];
            },
          },
        },
      },
      colors: ['#1ab7ea', '#0084ff', '#39539E'],
      labels: ['Acceleration', 'Constant', 'Free wheel'],
      responsive: [
        {
          breakpoint: 480,
          options: {
            legend: {
              show: false,
            },
          },
        },
      ],
    };

    const chart = new ApexCharts(chartElement, options);
    chart.render();
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

  /* -------------------------------------------------------------------------- */
  /* GET ENTITIES STATE AND ATTRIBUTES                                          */
  /* -------------------------------------------------------------------------- */

  private getSecondaryInfo(cardType: string): string {
    const { sensorDevices } = this;
    switch (cardType) {
      case 'tripCards':
        const odometerState = parseFloat(this.getEntityState(sensorDevices.odometer?.entity_id));
        const odometerUnit = this.getEntityUnit(sensorDevices.odometer?.entity_id);
        const formatedState = formatNumber(odometerState, this.hass.locale);
        return `${formatedState} ${odometerUnit}`;

      case 'vehicleCards':
        const lockedState = this.getEntityState(sensorDevices.lock?.entity_id);
        const lockedDisplayText = lockStateMapping[lockedState] || lockStateMapping['4'];
        return lockedDisplayText;
      case 'ecoCards':
        return `${this.getEntityState(sensorDevices.ecoScoreBonusRange?.entity_id)} ${this.getEntityUnit(
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
          unit: this.getEntityUnit(sensorDevices[attr]?.entity_id),
        }));

        // Find the minimum and maximum pressures
        const minPressure = Math.min(...pressuresWithUnits.map(({ pressure }) => parseFloat(pressure)));
        const maxPressure = Math.max(...pressuresWithUnits.map(({ pressure }) => parseFloat(pressure)));

        // Format the minimum and maximum pressures with their original units
        const tireUnit = pressuresWithUnits[0]?.unit || '';
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

  private getEntityAttribute(entity: string | undefined, attribute: string): any {
    if (!entity || !this.hass.states[entity] || !this.hass.states[entity].attributes) return undefined;
    return this.hass.states[entity].attributes[attribute];
  }

  private getEntityInfo = (entityId: string | undefined) => {
    const state = this.getEntityState(entityId);
    const unit = this.getEntityUnit(entityId);
    return { state, unit };
  };

  // Method to get the unit of measurement of an entity
  private getEntityUnit(entity: string | undefined): string {
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
