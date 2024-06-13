/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';

// Third-party Libraries
import ApexCharts from 'apexcharts';

// Custom Helpers
import {
  fireEvent,
  formatDateTime,
  hasConfigOrEntityChanged,
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceCardEditor,
  computeStateDisplay,
} from 'custom-card-helpers';

// Custom Types and Constants
import { ExtendedThemes, VehicleCardConfig, defaultConfig, EntityConfig, VehicleEntity, EntityAttr } from './types';
import { CARD_VERSION, lockAttrMapping, lockStateMapping, cardTypes, selectedProgramMapping } from './const';
import { localize } from './localize/localize';
import { formatTimestamp } from './utils/helpers';
import { getVehicleEntities } from './utils/utils';
import { tapFeedback } from './utils/tap-action.js';

// Styles and Assets
import styles from './css/styles.css';
import { amgBlack, amgWhite } from './utils/imgconst';
import './components/map-card.js';
import './components/header-slide.js';
import './components/eco-chart';
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

  @state() private vehicleEntities: { [key: string]: VehicleEntity } = {};
  @state() private additionalCards: { [key: string]: any[] } = {};
  @state() private activeCardType: string | null = null;

  private lockAttributesVisible = false;
  private windowAttributesVisible = false;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.configureAsync();
  }

  private async configureAsync(): Promise<void> {
    this.vehicleEntities = await getVehicleEntities(this.hass, this.config);
    this.requestUpdate();
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.BenzCard = this;
    this.addCustomEventListener('toggle-map-popup', this.showMapOnCard);
    this.setButtonEventListeners();
  }

  disconnectedCallback(): void {
    if (window.BenzCard === this) {
      window.BenzCard = undefined;
    }
    this.removeCustomEventListener('toggle-map-popup', this.showMapOnCard);
    this.removeButtonEventListeners();
    super.disconnectedCallback();
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
        ${this.activeCardType ? this._renderCustomCard() : this._renderMainCard()}
      </ha-card>
    `;
  }

  private _renderHeaderBackground(): TemplateResult {
    if (!this.config.show_background) return html``;
    const isDark = this.isDark();
    const background = isDark ? amgWhite : amgBlack;

    return html` <div class="header-background" style="background-image: url(${background})"></div> `;
  }

  private _renderMainCard(): TemplateResult {
    return html`
      <main id="main-wrapper">
        <div class="header-info-box">${this._renderWarnings()} ${this._renderRangeInfo()}</div>
        ${this._renderHeaderSlides()} ${this._renderMap()} ${this._renderButtons()}
      </main>
    `;
  }

  private _renderWarnings(): TemplateResult {
    const { vehicleEntities } = this;
    // Get the current state of the lock and park brake
    const lockState = this.getEntityState(vehicleEntities.lockSensor?.entity_id);
    const parkBrakeState = this.getBooleanState(vehicleEntities.parkBrake?.entity_id);

    // Determine the display text for the lock state
    // Default to "Unknown" if the lock state is not in the formatting object
    const lockDisplayText = lockStateMapping[lockState] || lockStateMapping['4'];

    return html`
      <div class="info-box">
        <div class="item">
          <ha-icon icon=${lockState === '2' || lockState === '1' ? 'mdi:lock' : 'mdi:lock-open'}></ha-icon>
          <div><span>${lockDisplayText}</span></div>
        </div>
        <div class="item">
          <ha-icon icon="mdi:car-brake-parking"></ha-icon>
          <div><span>${parkBrakeState ? 'Parked' : 'Released'}</span></div>
        </div>
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult | void {
    const { fuelLevel, rangeLiquid, rangeElectric } = this.vehicleEntities;

    const fuelInfo = this.getEntityInfo(fuelLevel?.entity_id);
    const rangeLiquidInfo = this.getEntityInfo(rangeLiquid?.entity_id);
    const rangeElectricInfo = this.getEntityInfo(rangeElectric?.entity_id);
    const socInfo = {
      state: this.getEntityAttribute(rangeElectric?.entity_id, 'soc'),
      unit: '%',
    };

    const renderInfoBox = (icon: string, state: string, unit: string, rangeState: string, rangeUnit: string) => html`
      <div class="info-box">
        <div class="item">
          <ha-icon icon="${icon}"></ha-icon>
          <div><span>${state} ${unit}</span></div>
        </div>
        <div class="fuel-wrapper">
          <div class="fuel-level-bar" style="width: ${state}%;"></div>
        </div>
        <div class="item">
          <span>${rangeState} ${rangeUnit}</span>
        </div>
      </div>
    `;

    if (fuelInfo.state && rangeLiquidInfo.state) {
      return renderInfoBox(
        'mdi:gas-station',
        fuelInfo.state,
        fuelInfo.unit,
        rangeLiquidInfo.state,
        rangeLiquidInfo.unit,
      );
    } else if (rangeElectricInfo.state && socInfo.state) {
      return renderInfoBox(
        'mdi:ev-station',
        socInfo.state,
        socInfo.unit,
        rangeElectricInfo.state,
        rangeElectricInfo.unit,
      );
    }
  }

  private _renderHeaderSlides(): TemplateResult | void {
    if (!this.config.images || !this.config.show_slides) return;
    return html` <header-slide .images=${this.config.images}></header-slide> `;
  }

  private _renderMap(): TemplateResult | void {
    const { config, hass } = this;
    if (!config.show_map) {
      return;
    }
    if (!config.device_tracker && config.show_map) {
      return this._showWarning('No device_tracker entity provided.');
    }
    return html`
      <div id="map-box">
        <vehicle-map
          .hass=${hass}
          .apiKey=${config.google_api_key}
          .deviceTracker=${config.device_tracker}
          .popup=${config.enable_map_popup}
        ></vehicle-map>
      </div>
    `;
  }

  private _renderEcoChart(): TemplateResult | void {
    if (this.activeCardType !== 'ecoCards') return html``;

    const ecoData = {
      bonusRange: parseFloat(this.getEntityState(this.vehicleEntities.ecoScoreBonusRange?.entity_id)) || 0,
      acceleration: parseFloat(this.getEntityState(this.vehicleEntities.ecoScoreAcceleraion?.entity_id)) || 0,
      constant: parseFloat(this.getEntityState(this.vehicleEntities.ecoScoreConstant?.entity_id)) || 0,
      freeWheel: parseFloat(this.getEntityState(this.vehicleEntities.ecoScoreFreeWheel?.entity_id)) || 0,
    };

    return html`<eco-chart .ecoData=${ecoData}></eco-chart>`;
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

  private _renderCustomCard(): TemplateResult | LovelaceCard | void {
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

  private createItemDataRow(
    title: string,
    data: { key: string; name?: string; icon?: string; state?: string }[],
  ): TemplateResult {
    return html`
      <div class="default-card">
        <div class="data-header">${title}</div>
        ${data.map(({ key, name, icon, state }) => {
          if (key && name && state) {
            return html`
              <div class="data-row">
                <div>
                  <ha-icon class="data-icon" .icon="${icon}"></ha-icon>
                  <span>${name}</span>
                </div>
                <div class="data-value-unit" @click=${() => this.toggleMoreInfo(this.vehicleEntities[key]?.entity_id)}>
                  <span>${state}</span>
                </div>
              </div>
            `;
          } else {
            return html``;
          }
        })}
      </div>
    `;
  }

  private _renderDefaultTripCard(): TemplateResult | void {
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
      { key: 'liquidConsumptionStart', name: 'Consumption start' },
      { key: 'electricConsumptionStart', name: 'Consumption start' },
    ];

    const overViewData = this.createDataArray(overViewDataKeys);
    const tripFromStartData = this.createDataArray(tripFromStartDataKeys);
    const tripFromResetData = this.createDataArray(tripFromResetDataKeys);

    return html`
      ${this.createItemDataRow('Overview', overViewData)} ${this.createItemDataRow('From start', tripFromStartData)}
      ${this.createItemDataRow('From reset', tripFromResetData)}
    `;
  }

  private _renderDefaultVehicleCard(): TemplateResult | void {
    const { vehicleEntities } = this;

    const vehicleDataKeys = [{ key: 'parkBrake' }, { key: 'windowsClosed' }];

    const warningsDataKeys = [
      { key: 'tirePressureWarning' },
      { key: 'lowBrakeFluid' },
      { key: 'lowCoolantLevel' },
      { key: 'engineLight' },
      { key: 'lowWashWater' },
    ];

    const lockInfoData = this.getLockEntityInfo();
    const vehicleData = this.createDataArray(vehicleDataKeys);
    const warningsData = this.createDataArray(warningsDataKeys);

    return html`
      <div class="default-card">
        <div class="data-header">Vehicle status</div>
        <div class="data-row">
          <div>
            <ha-icon class="data-icon ${lockInfoData.color}" .icon=${lockInfoData.icon}></ha-icon>
            <span>${lockInfoData.name}</span>
          </div>
          <div class="data-value-unit">
            <span @click=${() => this.toggleMoreInfo(lockInfoData.lockId ?? '')}>${lockInfoData.state}</span>
            <ha-icon
              icon="${this.lockAttributesVisible ? 'mdi:chevron-up' : 'mdi:chevron-right'}"
              @click=${() => this.toggleLockAttributes()}
            ></ha-icon>
          </div>
        </div>

        ${this._renderLockAttributes()}
        ${vehicleData.map(
          ({ key, icon, state, name }) => html`
            <div class="data-row">
              <div>
                <ha-icon
                  class="data-icon ${this.getBooleanState(vehicleEntities[key]?.entity_id) ? 'warning' : ''} "
                  icon="${icon}"
                  @click=${() => this.toggleMoreInfo(vehicleEntities[key]?.entity_id)}
                ></ha-icon>
                <span>${name}</span>
              </div>
              <div class="data-value-unit" @click=${() => this.toggleMoreInfo(vehicleEntities[key]?.entity_id)}>
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
          ({ key, icon, state, name }) => html`
            <div class="data-row">
              <div>
                <ha-icon
                  class="data-icon"
                  icon="${icon}"
                  @click=${() => this.toggleMoreInfo(vehicleEntities[key]?.entity_id)}
                ></ha-icon>
                <span>${name}</span>
              </div>
              <div
                class="data-value-unit ${this.getBooleanState(vehicleEntities[key]?.entity_id) ? 'error' : ''} "
                @click=${() => this.toggleMoreInfo(vehicleEntities[key]?.entity_id)}
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

  private _renderLockAttributes(): TemplateResult {
    const lockAttributeStates: Record<string, any> = {};
    // Iterate over the keys of the lockAttrMapping object
    Object.keys(lockAttrMapping).forEach((attribute) => {
      const attributeState = this.getEntityAttribute(this.vehicleEntities.lockSensor?.entity_id, attribute);
      if (attributeState !== undefined && attributeState !== null) {
        lockAttributeStates[attribute] = attributeState;
      }
    });

    const attributesClass = this.lockAttributesVisible ? 'sub-attributes active' : 'sub-attributes';
    // Render the lock attributes
    return html`
      <div class=${attributesClass}>
        ${Object.keys(lockAttributeStates).map((attribute) => {
          const rawState = lockAttributeStates[attribute];

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
    const ecoDataKeys = [
      { key: 'ecoScoreBonusRange', name: 'Bonus range' },
      { key: 'ecoScoreAcceleraion', name: 'Acceleration' },
      { key: 'ecoScoreConstant', name: 'Constant' },
      { key: 'ecoScoreFreeWheel', name: 'Free wheel' },
    ];

    const ecoData = this.createDataArray(ecoDataKeys);

    return html`<div class="default-card">
        <div class="data-header">Eco display</div>
        ${this._renderEcoChart()}
      </div>
      ${this.createItemDataRow('Scores', ecoData)}`;
  }

  private initializeEcoChart(): void {
    const chartElement = this.shadowRoot?.querySelector('#chart');
    if (!chartElement) return;

    const { ecoScoreBonusRange, ecoScoreAcceleraion, ecoScoreConstant, ecoScoreFreeWheel } = this.vehicleEntities;

    const bonusRange = this.getEntityState(ecoScoreBonusRange?.entity_id);
    const acceleration = this.getEntityState(ecoScoreAcceleraion?.entity_id);
    const constant = this.getEntityState(ecoScoreConstant?.entity_id);
    const freeWheel = this.getEntityState(ecoScoreFreeWheel?.entity_id);

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
    const tyreDataKeys = [
      { key: 'tirePressureFrontLeft', name: 'Front left', icon: 'mdi:tire' },
      { key: 'tirePressureFrontRight', name: 'Front right', icon: 'mdi:tire' },
      { key: 'tirePressureRearLeft', name: 'Rear left', icon: 'mdi:tire' },
      { key: 'tirePressureRearRight', name: 'Rear right', icon: 'mdi:tire' },
    ];

    const tyreData = this.createDataArray(tyreDataKeys);
    return this.createItemDataRow('Tyre pressures', tyreData);
  }

  /* -------------------------------------------------------------------------- */
  /* GET ENTITIES STATE AND ATTRIBUTES                                          */
  /* -------------------------------------------------------------------------- */

  private getEntityInfoByKey({ key, name, icon, state, unit }: Partial<EntityConfig>): {
    key: string;
    name: string;
    icon: string;
    state: string;
    unit: string;
  } {
    if (!key) {
      return {
        key: '',
        name: '',
        icon: '',
        unit: '',
        state: '',
      };
    }
    if (!this.vehicleEntities[key]) {
      if (key === 'selectedProgram') {
        return {
          key,
          name: name ?? 'Program',
          icon: icon ?? 'mdi:ev-station',
          state:
            selectedProgramMapping[
              this.getEntityAttribute(this.vehicleEntities.rangeElectric?.entity_id, 'selectedChargeProgram')
            ] ?? '',
          unit: unit ?? '',
        };
      }
    }

    if (this.vehicleEntities[key]) {
      if (key === 'soc') {
        const currentState = this.getEntityAttribute(this.vehicleEntities.rangeElectric?.entity_id, 'soc');
        const stateValue = currentState ? parseFloat(currentState) : 0;
        const socIcon =
          stateValue < 35
            ? 'mdi:battery-charging-low'
            : stateValue < 70
            ? 'mdi:battery-charging-medium'
            : 'mdi:battery-charging-high';
        return {
          key,
          name: name ?? 'State of charger',
          icon: icon ?? socIcon ?? '',
          state: state ?? currentState ?? '',
          unit: unit ?? '%',
        };
      } else if (key === 'maxSoc') {
        const maxSocState = this.getEntityAttribute(this.vehicleEntities.rangeElectric?.entity_id, 'maxSoc');
        return {
          key,
          name: name ?? this.vehicleEntities.maxSoc?.original_name ?? 'Max state of charger',
          icon: icon ?? `mdi:battery-charging-${maxSocState}`,
          state: state ?? maxSocState,
          unit: unit ?? '%',
        };
      } else if (key === 'parkBrake') {
        return {
          key,
          name: name ?? 'Park brake',
          icon: icon ?? 'mdi:car-brake-parking',
          state: state ?? this.getBooleanState(this.vehicleEntities.parkBrake?.entity_id) ? 'Engaged' : 'Released',
          unit: unit ?? '',
        };
      } else if (key === 'windowsClosed') {
        return {
          key,
          name: name ?? 'Windows',
          state: state ?? this.getBooleanState(this.vehicleEntities.windowsClosed?.entity_id) ? 'Closed' : 'Opened',
          icon: icon ?? this.getEntityAttribute(this.vehicleEntities.windowsClosed?.entity_id, 'icon'),
          unit: unit ?? '',
        };
      }
    }

    // Directly handle warning states
    if (['tirePressureWarning', 'lowBrakeFluid', 'lowCoolantLevel', 'engineLight', 'lowWashWater'].includes(key)) {
      return {
        key,
        name: name ?? this.vehicleEntities[key]?.original_name,
        icon: icon ?? this.getEntityAttribute(this.vehicleEntities[key]?.entity_id, 'icon') ?? '',
        state: this.getBooleanState(this.vehicleEntities[key]?.entity_id) ? 'Problem' : 'OK',
        unit: unit ?? '',
      };
    }

    const entityId = this.vehicleEntities[key]?.entity_id;

    return {
      key,
      name: name ?? this.vehicleEntities[key]?.original_name,
      icon: icon ?? this.getEntityAttribute(entityId, 'icon'),
      unit: unit ?? this.getEntityUnit(entityId),
      state: state ?? this.getStateDisplay(entityId),
    };
  }

  private createDataArray(
    keys: Partial<EntityConfig>[],
  ): { key: string; name: string; icon: string; state: string; unit: string }[] {
    return keys.map((config) => this.getEntityInfoByKey(config));
  }

  private getLockEntityInfo(): Partial<EntityAttr & { lockId: string; color: string }> {
    const lockState = this.getEntityState(this.vehicleEntities.lockSensor?.entity_id);
    const lockStateFormatted = lockStateMapping[lockState] || lockStateMapping['4'];
    const lockIcon = lockState === '2' || lockState === '1' ? 'mdi:lock' : 'mdi:lock-open';
    const lockColor = lockState === '2' || lockState === '1' ? 'warning' : '';
    const lockName = this.vehicleEntities.lock?.original_name;
    return {
      key: 'lock',
      name: lockName,
      icon: lockIcon,
      state: lockStateFormatted,
      color: lockColor,
      lockId: this.vehicleEntities.lockSensor?.entity_id,
    };
  }

  private getStateDisplay(entityId: string | undefined): string {
    if (!entityId || !this.hass.states[entityId] || !this.hass.locale) return '';
    return computeStateDisplay(this.hass.localize, this.hass.states[entityId], this.hass.locale);
  }

  private getSecondaryInfo(cardType: string): string {
    const { vehicleEntities } = this;

    switch (cardType) {
      case 'tripCards':
        const odometerDisplayText = this.getStateDisplay(vehicleEntities.odometer?.entity_id);

        return odometerDisplayText;

      case 'vehicleCards':
        const lockedState = this.getEntityState(vehicleEntities.lockSensor?.entity_id);
        const lockedDisplayText = lockStateMapping[lockedState] || lockStateMapping['4'];
        return lockedDisplayText;

      case 'ecoCards':
        const bonusRangeDisplayText = this.getStateDisplay(vehicleEntities.ecoScoreBonusRange?.entity_id);
        return bonusRangeDisplayText;

      case 'tyreCards':
        const tireAttributes = [
          'tirePressureFrontRight',
          'tirePressureFrontRight',
          'tirePressureRearLeft',
          'tirePressureRearRight',
        ];

        // Store pressures with their original units
        const pressuresWithUnits = tireAttributes.map((key) => ({
          pressure: this.getEntityState(vehicleEntities[key]?.entity_id) || '',
          unit: this.getEntityUnit(vehicleEntities[key]?.entity_id),
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
