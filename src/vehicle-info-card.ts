/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';

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
import { lockAttrMapping, lockStateMapping, cardTypes, selectedProgramMapping } from './const';
import { localize } from './localize/localize';
import { formatTimestamp } from './utils/helpers';
import { logCardInfo, getVehicleEntities, setupCardListeners } from './utils/utils';
import { tapFeedback } from './utils/tap-action.js';

// Styles and Assets
import styles from './css/styles.css';
import { amgBlack, amgWhite } from './utils/imgconst';
import './components/map-card';
import './components/header-slide';
import './components/eco-chart';

console.info(
  `%c  VEHICLE-INFO-CARD %c  FIX  `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

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
  // https://lit.dev/docs/components/styles/
  public static get styles(): CSSResultGroup {
    return styles;
  }

  public static getStubConfig = (): Record<string, unknown> => {
    return {
      ...defaultConfig,
    };
  };

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
  private chargingInfoVisible = false;

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
    this.manageButtonEventListeners('addEventListener');
  }

  disconnectedCallback(): void {
    if (window.BenzCard === this) {
      window.BenzCard = undefined;
    }
    this.manageButtonEventListeners('removeEventListener');
    super.disconnectedCallback();
  }

  private manageButtonEventListeners(action: 'addEventListener' | 'removeEventListener'): void {
    const buttons = this.shadowRoot?.querySelectorAll('.grid-item');
    if (!buttons) return;
    buttons.forEach((button) => {
      button[action]('click', () => tapFeedback(button));
    });
  }

  private showMapOnCard = (): void => {
    this.activeCardType = 'mapDialog';
  };

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
    console.log('Additional cards created:', this.additionalCards);
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
      const cardElement = this.shadowRoot?.querySelector('.card-element');
      if (!cardElement) return;
      setupCardListeners(cardElement, this.toggleCard.bind(this));
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

    const isDark = this.isDark ? 'dark' : '';
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
    const isDark = this.isDark;
    const background = isDark ? amgWhite : amgBlack;

    return html` <div class="header-background" style="background-image: url(${background})"></div> `;
  }

  private _renderMainCard(): TemplateResult {
    return html`
      <main id="main-wrapper">
        <div class="header-info-box">
          ${this._renderWarnings()} ${this._renderChargingInfo()} ${this._renderRangeInfo()}
        </div>
        ${this._renderHeaderSlides()} ${this._renderMap()} ${this._renderButtons()}
      </main>
    `;
  }

  private isCharging = true;
  private _renderWarnings(): TemplateResult {
    const { vehicleEntities } = this;
    // Get the current state of the lock and park brake
    const lockState =
      lockStateMapping[this.getEntityState(this.sensorDevices.lock?.entity_id)] || lockStateMapping['4'];
    const lockSensorState = this.getEntityState(this.sensorDevices.lock?.entity_id);
    const lockIconDisplay = lockSensorState === '2' || lockSensorState === '1' ? 'mdi:lock' : 'mdi:lock-open';

    const parkBrakeState = this.getBooleanState(this.binaryDevices.parkBrake?.entity_id) ? 'Parked' : 'Released';

    const itemsData = [
      { key: 'lock', state: lockState, icon: lockIconDisplay },
      { key: 'parkBrake', state: parkBrakeState, icon: 'mdi:car-brake-parking' },
    ];

    const chargingIcon = 'mdi:ev-station';

    const defaultIdicator = itemsData.map(({ state, icon }) => {
      return html`
        <div class="item">
          <ha-icon icon=${icon}></ha-icon>
          <div><span>${state}</span></div>
        </div>
      `;
    });

    const addedChargingInfo = this.isCharging
      ? html` <div class="item charge" @click=${() => this.toggleChargingInfo()}>
          <ha-icon icon=${chargingIcon}></ha-icon>
          <div>
            <span>Charging</span>
            <ha-icon icon=${this.chargingInfoVisible ? 'mdi:chevron-up' : 'mdi:chevron-right'}></ha-icon>
          </div>
        </div>`
      : html``;

    return html`<div class="info-box">${defaultIdicator} ${addedChargingInfo}</div> `;
  }

  toggleChargingInfo(): void {
    this.chargingInfoVisible = !this.chargingInfoVisible;
    console.log('charging toggle: ', this.chargingInfoVisible);
    this.requestUpdate();
  }

  private _renderChargingInfo(): TemplateResult | void {
    if (!this.isCharging) return;
    const chargingClass = this.chargingInfoVisible ? 'info-box charge active' : 'info-box charge';
    const currentChargingState = 80;
    const stateUnit = '%';
    const maxSoc = 100;
    const mode = 'Standard';
    const power = 3.7;
    const powerUnit = 'kW';

    const chargingItems = [
      { name: 'Power', value: `${power} ${powerUnit}`, icon: 'mdi:flash' },
      { name: 'Current state', value: `${currentChargingState} ${stateUnit}`, icon: 'mdi:battery-charging-medium' },
      { name: 'Maximum', value: `${maxSoc} ${stateUnit}`, icon: 'mdi:battery-charging-100' },
      { name: 'Program', value: mode, icon: 'mdi:ev-station' },
    ];

    return html`
      <div class=${chargingClass}>
        ${chargingItems.map(({ name, value, icon }) => {
          return html`
            <div class="item">
              <ha-icon icon=${icon}></ha-icon>
              <div class="item-secondary">
                <span>${name}</span>
                <span>${value}</span>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderRangeInfo(): TemplateResult | void {
    const { fuelLevel, rangeLiquid, rangeElectric, soc } = this.vehicleEntities;

    const fuelInfo = this.getEntityInfo(fuelLevel?.entity_id);
    const rangeLiquidInfo = this.getEntityInfo(rangeLiquid?.entity_id);
    const rangeElectricInfo = this.getEntityInfo(rangeElectric?.entity_id);
    const socInfo = this.getEntityInfo(soc?.entity_id);

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

  private _renderHeaderSlides(): TemplateResult {
    if (!this.config.images || !this.config.show_slides) return html``;

    const images: string[] = this.config.images;

    return html`<header-slide .images=${images}></header-slide>`;
  }

  private _renderMap(): TemplateResult | void {
    const { config, hass } = this;
    if (!config.show_map) {
      return;
    }
    if (!config.device_tracker && config.show_map) {
      return this._showWarning('No device_tracker entity provided.');
    }
    const darkMode = this.isDark;
    return html`
      <div id="map-box">
        <vehicle-map
          .hass=${hass}
          .darkMode=${darkMode}
          .apiKey=${this.config.google_api_key || ''}
          .deviceTracker=${config.device_tracker || ''}
          .popup=${config.enable_map_popup || false}
          @toggle-map-popup=${this.showMapOnCard}
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
            <div class="grid-item click-shrink" @click=${() => this.toggleCardFromButtons(cardType.type)}>
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

  private getCardTypeData(cardType: string): { name: string; icon: string } {
    const cardTypeData: Record<string, { name: string; icon: string }> = {
      tripCards: { name: 'Trip data', icon: 'mdi:map-marker-path' },
      vehicleCards: { name: 'Vehicle status', icon: 'mdi:car-info' },
      ecoCards: { name: 'Eco display', icon: 'mdi:leaf' },
      tyreCards: { name: 'Tyre pressure', icon: 'mdi:tire' },
    };
    return cardTypeData[cardType];
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

    const cardHeaderBox = html` <div class="added-card-header">
      <div class="headder-btn" @click="${() => this.toggleCard('close')}">
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
    </div>`;

    return html`
      <main id="cards-wrapper">
        ${cardHeaderBox}
        <section class="card-element">
          ${isDefaultCard ? cards : cards.map((card: any) => html`<div class="added-card">${card}</div>`)}
        </section>
        ${isDefaultCard ? html`<div class="last-update"><span>Last update: ${formattedDate}</span></div>` : ''}
      </main>
    `;
  }

  /* -------------------------------------------------------------------------- */
  /* ADDED CARD FUNCTIONALITY                                                   */
  /* -------------------------------------------------------------------------- */

  private toggleCard = (action?: 'next' | 'prev' | 'close'): void => {
    const cardElement = this.shadowRoot?.querySelector('.card-element') as HTMLElement;
    if (!this.activeCardType || !cardElement) return;
    if (action === 'next' || action === 'prev') {
      const currentIndex = cardTypes.findIndex((card) => card.type === this.activeCardType);
      const newIndex =
        action === 'next'
          ? (currentIndex + 1) % cardTypes.length
          : (currentIndex - 1 + cardTypes.length) % cardTypes.length;

      cardElement.style.animation = 'none';
      setTimeout(() => {
        this.activeCardType = cardTypes[newIndex].type;
        cardElement.style.animation = 'fadeIn 0.3s ease';
      }, 300);
      // this.activeCardType = cardTypes[newIndex].type;
    } else if (action === 'close') {
      this.activeCardType = null;
    }
  };

  private toggleCardFromButtons = (cardType: string): void => {
    setTimeout(() => {
      this.activeCardType = this.activeCardType === cardType ? null : cardType;
    }, 200);
  };

  private createItemDataRow = (
    title: string,
    data: { key: string; name?: string; icon?: string; state?: string }[],
  ): TemplateResult => {
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
  };

  private _renderDefaultTripCard(): TemplateResult | void {
    const overViewDataKeys = [
      { key: 'odometer' },
      { key: 'fuelLevel' },
      { key: 'rangeLiquid' },
      { key: 'rangeElectric' },
      { key: 'soc' },
      { key: 'maxSoc' },
      { key: 'rangeElectric', name: 'Range' },
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

    const sections = [
      { title: 'Overview', data: this.createDataArray(overViewDataKeys) },
      { title: 'From start', data: this.createDataArray(tripFromStartDataKeys) },
      { title: 'From reset', data: this.createDataArray(tripFromResetDataKeys) },
    ];

    return html` ${sections.map((section) => this.createItemDataRow(section.title, section.data))} `;
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
          <div class="data-value-unit" @click=${() => this.toggleLockAttributes()}>
            <span>${lockInfoData.state}</span>
            <ha-icon icon="${this.lockAttributesVisible ? 'mdi:chevron-up' : 'mdi:chevron-right'}"></ha-icon>
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
  private toggleLockAttributes = () => {
    this.lockAttributesVisible = !this.lockAttributesVisible;
    this.requestUpdate(); // Trigger a re-render
  };

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

  getEntityInfoByKey = ({
    key,
    name,
    icon,
    state,
    unit,
  }: Partial<EntityConfig>): {
    key: string;
    name: string;
    icon: string;
    state: string;
    unit: string;
  } => {
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
        const currentState = this.getEntityState(this.vehicleEntities.soc?.entity_id);
        const stateValue = currentState ? parseFloat(currentState) : 0;
        const socIcon =
          stateValue < 35
            ? 'mdi:battery-charging-low'
            : stateValue < 70
            ? 'mdi:battery-charging-medium'
            : 'mdi:battery-charging-high';
        return {
          key,
          name: name ?? this.vehicleEntities.soc?.original_name,
          icon: icon ?? socIcon ?? '',
          state: state ?? currentState ?? '',
          unit: unit ?? '%',
        };
      } else if (key === 'maxSoc') {
        const maxSocState = this.getEntityState(this.vehicleEntities.maxSoc?.entity_id) || '0';
        return {
          key,
          name: name ?? this.vehicleEntities.maxSoc?.original_name,
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
      unit: unit ?? this.getEntityAttribute(entityId, 'unit_of_measurement'),
      state: state ?? this.getStateDisplay(entityId),
    };
  };

  private createDataArray = (
    keys: Partial<EntityConfig>[],
  ): { key: string; name: string; icon: string; state: string; unit: string }[] => {
    return keys.map((config) => this.getEntityInfoByKey(config));
  };

  private getLockEntityInfo = (): Partial<EntityAttr & { lockId: string; color: string }> => {
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
  };

  private getStateDisplay = (entityId: string | undefined): string => {
    if (!entityId || !this.hass.states[entityId] || !this.hass.locale) return '';
    return computeStateDisplay(this.hass.localize, this.hass.states[entityId], this.hass.locale);
  };

  private getSecondaryInfo = (cardType: string): string => {
    const { vehicleEntities } = this;

    switch (cardType) {
      case 'tripCards':
        return this.getStateDisplay(vehicleEntities.odometer?.entity_id);

      case 'vehicleCards':
        const lockedDisplayText =
          lockStateMapping[this.getEntityState(vehicleEntities.lockSensor?.entity_id)] || lockStateMapping['4'];
        return lockedDisplayText;

      case 'ecoCards':
        return this.getStateDisplay(vehicleEntities.ecoScoreBonusRange?.entity_id);

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
          unit: this.getEntityAttribute(vehicleEntities[key]?.entity_id, 'unit_of_measurement'),
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
  };

  private getEntityInfo = (entity: string): { state: string; unit: string } => {
    const state = this.getEntityState(entity);
    const unit = this.getEntityAttribute(entity, 'unit_of_measurement');
    return { state, unit };
  };

  private getBooleanState = (entity: string | undefined): boolean => {
    if (!entity || !this.hass.states[entity]) return false;
    return this.hass.states[entity].state === 'on';
  };

  private getEntityState = (entity: string | undefined): string => {
    if (!entity || !this.hass.states[entity]) return '';
    return this.hass.states[entity].state;
  };

  private getEntityAttribute = (entity: string | undefined, attribute: string): any => {
    if (!entity || !this.hass.states[entity] || !this.hass.states[entity].attributes) return undefined;
    return this.hass.states[entity].attributes[attribute];
  };

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
