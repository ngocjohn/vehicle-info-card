/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { classMap } from 'lit/directives/class-map.js';

// Custom Helpers
import {
  fireEvent,
  formatDateTime,
  formatNumber,
  forwardHaptic,
  hasConfigOrEntityChanged,
  LovelaceCardConfig,
  LovelaceCardEditor,
  applyThemesOnElement,
} from 'custom-card-helpers';

// Custom Types and Constants
import {
  HomeAssistantExtended as HomeAssistant,
  VehicleCardConfig,
  defaultConfig,
  EntityConfig,
  VehicleEntities,
  EcoData,
} from './types';

import * as DataKeys from './const/data-keys';
import * as StateMapping from './const/state-mapping';
import { cardTypes } from './const/data-keys';

// Styles and Assets
import { amgBlack, amgWhite, tyreBg } from './const/imgconst';
import styles from './css/styles.css';

// Components
import './components/map-card';
import './components/header-slide';
import './components/eco-chart';
import './components/remote-control';

// Functions
import { localize } from './utils/localize';
import { formatTimestamp, convertMinutes } from './utils/helpers';
import { getVehicleEntities, setupCardListeners } from './utils/get-device-entities';

const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

@customElement('vehicle-info-card')
export class VehicleCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('vehicle-info-card-editor');
  }

  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) private config!: VehicleCardConfig;

  @state() private selectedLanguage: string = 'en';
  @state() private vehicleEntities: VehicleEntities = {};
  @state() private additionalCards: { [key: string]: any[] } = {};
  @state() private activeCardType: string | null = null;
  @state() private lockAttributesVisible!: boolean;
  @state() private windowAttributesVisible!: boolean;
  @state() private doorsAttributesVisible!: boolean;
  @state() private chargingInfoVisible!: boolean;
  @state() private tripFromStartVisible!: boolean;
  @state() private tripFromResetVisible!: boolean;

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this.selectedLanguage, search, replace);
  };

  private get isCharging(): boolean {
    return this.getEntityAttribute(this.vehicleEntities.rangeElectric?.entity_id, 'chargingactive');
  }

  private get carVinNumber(): string {
    if (!this.config.entity) return '';
    return this.getEntityAttribute(this.config.entity, 'vin');
  }

  private get isDark(): boolean {
    if (this.config?.selected_theme?.mode === 'dark') {
      return true;
    } else if (this.config?.selected_theme?.mode === 'light') {
      return false;
    }
    return this.hass.themes.darkMode;
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

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = {
      ...config,
    };
    this.selectedLanguage = this.config.selected_language || localStorage.getItem('selectedLanguage') || 'en';
    const lang = this.selectedLanguage;

    for (const cardType of cardTypes(lang)) {
      if (this.config[cardType.config]) {
        this.createCards(this.config[cardType.config], cardType.type);
      }
    }

    if (this.config.device_tracker) {
      const { default_zoom, hours_to_show, theme_mode } = this.config.map_popup_config;
      const haMapConfig = {
        type: 'map',
        default_zoom: default_zoom,
        hours_to_show: hours_to_show,
        theme_mode: theme_mode,
        entities: [
          {
            entity: this.config.device_tracker,
          },
        ],
      };
      this.createCards([haMapConfig], 'mapDialog');
    }
    if (this.config.selected_theme) {
      this.applyTheme(this.config.selected_theme.theme);
    }
  }

  private getGridRowSize(): number {
    const { show_slides, show_map, show_buttons } = this.config;
    let gridRowSize = 2;
    if (show_slides) gridRowSize += 2;
    if (show_map) gridRowSize += 2;
    if (show_buttons) gridRowSize += 2;
    return gridRowSize;
  }

  public getCardSize() {
    return this.getGridRowSize();
  }

  public getLayoutOptions() {
    const gridRowSize = this.getGridRowSize();
    return {
      grid_min_rows: gridRowSize,
      grid_columns: 4,
      grid_min_columns: 4,
    };
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.configureAsync();
    if (this.config.selected_theme) {
      this.applyTheme(this.config.selected_theme.theme);
    }
  }

  private async configureAsync(): Promise<void> {
    this.vehicleEntities = await getVehicleEntities(this.hass, this.config);
    this.requestUpdate();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._editorEventsHandler = this._editorEventsHandler.bind(this);
    window.addEventListener('editor-event', this._editorEventsHandler);
    if (process.env.ROLLUP_WATCH === 'true') {
      window.BenzCard = this;
    }
  }

  disconnectedCallback(): void {
    if (process.env.ROLLUP_WATCH === 'true' && window.BenzCard === this) {
      window.BenzCard = undefined;
    }
    window.removeEventListener('editor-event', this._editorEventsHandler);
    super.disconnectedCallback();
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

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has('activeCardType') && this.activeCardType !== 'mapDialog') {
      const cardElement = this.shadowRoot?.querySelector('.card-element');
      if (!cardElement) return;
      setupCardListeners(cardElement, this.toggleCard.bind(this));
    }
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config || !this.hass) {
      return false;
    }
    if (changedProps.has('hass') || changedProps.has('config')) {
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

    const name = this.config.name || '';
    return html`
      <ha-card class=${this.computeClasses()}>
        ${this._renderHeaderBackground()}
        <header>
          <h1>${name}</h1>
        </header>
        ${this.activeCardType ? this._renderCustomCard() : this._renderMainCard()}
      </ha-card>
    `;
  }

  private _renderHeaderBackground(): TemplateResult {
    if (!this.config.show_background || this.activeCardType !== null) return html``;
    const background = this.isDark ? amgWhite : amgBlack;

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

  private _renderWarnings(): TemplateResult {
    const defaultIndicData = this.createDataArray([{ key: 'lockSensor' }, { key: 'parkBrake' }]);
    const isChargingVisible = this.isCharging && this.config.enable_services_control ? 'base-menu' : '';

    const defaultIdicator = defaultIndicData.map(({ state, icon }) => {
      return html`
        <div class="item">
          <ha-icon .icon=${icon}></ha-icon>
          <div><span class="${isChargingVisible}">${state}</span></div>
        </div>
      `;
    });

    const addedChargingInfo = this.isCharging
      ? html` <div class="item active-btn" @click=${() => (this.chargingInfoVisible = !this.chargingInfoVisible)}>
          <ha-icon icon=${'mdi:ev-station'}></ha-icon>
          <div class="added-item-arrow">
            <span class="${isChargingVisible}">${this.localize('common.stateCharging')}</span>
            <div class="subcard-icon ${this.chargingInfoVisible ? 'active' : ''}" style="margin-bottom: 2px">
              <ha-icon icon="mdi:chevron-right"></ha-icon>
            </div>
          </div>
        </div>`
      : html``;

    const serviceControl = this.config.enable_services_control
      ? html`
          <div class="item active-btn" @click=${() => this.toggleCardFromButtons('servicesCard')}>
            <ha-icon icon="mdi:car-cog"></ha-icon>
            <div class="added-item-arrow">
              <span class="${isChargingVisible}">${this.localize('common.titleServices')}</span>
              <div class="subcard-icon" style="margin-bottom: 2px">
                <ha-icon icon="mdi:chevron-right"></ha-icon>
              </div>
            </div>
          </div>
        `
      : html``;

    return html`<div class="info-box">${defaultIdicator} ${serviceControl} ${addedChargingInfo}</div> `;
  }

  private _renderChargingInfo(): TemplateResult | void {
    const chargingOverviewData = DataKeys.chargingOverview(this.selectedLanguage);
    const chargingData = this.createDataArray(chargingOverviewData);
    const chargingClass = this.chargingInfoVisible ? 'info-box charge active' : 'info-box charge';

    return html`
      <div class=${chargingClass} .hidden=${this.isCharging}>
        ${chargingData.map(({ name, state, icon }) => {
          if (state) {
            return html`
              <div class="item charge">
                <div>
                  <ha-icon .icon=${icon}></ha-icon>
                  <span>${state}</span>
                </div>
                <div class="item-name">
                  <span>${name}</span>
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

  private _renderRangeInfo(): TemplateResult | void {
    if (this.chargingInfoVisible) return;

    const getEntityInfo = (entity: string | undefined) => {
      if (!entity) return null;
      const state = parseInt(this.getEntityState(entity));
      const stateDisplay = this.getStateDisplay(entity);
      return { state, stateDisplay };
    };

    const entities = ['fuelLevel', 'rangeLiquid', 'rangeElectric', 'soc'];
    const [fuelInfo, rangeLiquidInfo, rangeElectricInfo, socInfo] = entities.map((entity) =>
      getEntityInfo(this.vehicleEntities[entity]?.entity_id),
    );

    const renderInfoBox = (icon: string, state: number, fuelInfo: string, rangeInfo: string) => html`
      <div class="info-box">
        <div class="item">
          <ha-icon icon="${icon}"></ha-icon>
          <div><span>${fuelInfo}</span></div>
        </div>
        <div class="fuel-wrapper">
          <div class="fuel-level-bar" style="width: ${state}%;"></div>
        </div>
        <div class="item">
          <span>${rangeInfo}</span>
        </div>
      </div>
    `;

    return fuelInfo?.state && rangeLiquidInfo?.state
      ? renderInfoBox('mdi:gas-station', fuelInfo.state, fuelInfo.stateDisplay, rangeLiquidInfo.stateDisplay)
      : rangeElectricInfo?.state && socInfo?.state
        ? renderInfoBox('mdi:ev-station', socInfo.state, socInfo.stateDisplay, rangeElectricInfo.stateDisplay)
        : undefined;
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

    return html`
      <div id="map-box">
        <vehicle-map
          .hass=${hass}
          .config=${config}
          .darkMode=${this.isDark}
          .apiKey=${this.config.google_api_key || ''}
          @toggle-map-popup=${() => (this.activeCardType = 'mapDialog')}
        ></vehicle-map>
      </div>
    `;
  }

  private _renderEcoChart(): TemplateResult {
    if (this.activeCardType !== 'ecoCards') return html``;
    const lang = this.selectedLanguage;
    const getEcoScore = (entity: any): number => parseFloat(this.getEntityState(entity?.entity_id)) || 0;

    const ecoDataObj = DataKeys.ecoScores(lang).reduce((acc, score) => {
      if (score.apexProp) {
        acc[score.apexProp] = getEcoScore(this.vehicleEntities[score.key]);
      }

      return acc;
    }, {} as EcoData);

    return html`<eco-chart .ecoData=${ecoDataObj} .selectedLanguage=${lang}></eco-chart>`;
  }

  private _renderButtons(): TemplateResult {
    const showError = this.config.show_error_notify;
    if (!this.config.show_buttons) return html``;
    const baseCardTypes = cardTypes(this.selectedLanguage);
    return html`
      <div class="grid-container">
        ${baseCardTypes.map(
          (cardType) => html`
            <div class="grid-item click-shrink" @click=${() => this.toggleCardFromButtons(cardType.type)}>
              <div class="item-icon">
                <div class="icon-background"><ha-icon .icon="${cardType.icon}"></ha-icon></div>
                ${showError
                  ? html`
                      <div class="item-notify ${this.getErrorNotify(cardType.type) ? '' : 'hidden'}">
                        <ha-icon icon="mdi:alert-circle"></ha-icon>
                      </div>
                    `
                  : ''}
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

  private _renderCustomCard(): TemplateResult {
    if (!this.activeCardType) return html``;
    const { config } = this;
    const cardConfigMap = {
      tripCards: {
        config: config.trip_card,
        defaultRender: this._renderDefaultTripCard.bind(this),
      },
      vehicleCards: {
        config: config.vehicle_card,
        defaultRender: this._renderDefaultVehicleCard.bind(this),
      },
      ecoCards: {
        config: config.eco_card,
        defaultRender: this._renderDefaultEcoCard.bind(this),
      },
      tyreCards: {
        config: config.tyre_card,
        defaultRender: this._renderDefaultTyreCard.bind(this),
      },
      mapDialog: {
        config: [],
        defaultRender: () => this.additionalCards['mapDialog'],
      },
      servicesCard: {
        config: [],
        defaultRender: this._renderServiceControl.bind(this),
      },
    };

    const cardInfo = cardConfigMap[this.activeCardType];

    if (!cardInfo) {
      return html``;
    }

    const isDefaultCard = !cardInfo.config || cardInfo.config.length === 0;
    const cards = isDefaultCard ? cardInfo.defaultRender() : this.additionalCards[this.activeCardType];

    const lastCarUpdate = config.entity ? this.hass.states[config.entity].last_changed : '';

    const formattedDate = this.hass.locale
      ? formatDateTime(new Date(lastCarUpdate), this.hass.locale)
      : formatTimestamp(lastCarUpdate);

    const cardHeaderBox = html` <div class="added-card-header">
      <div class="headder-btn click-shrink" @click="${() => this.toggleCard('close')}">
        <ha-icon icon="mdi:close"></ha-icon>
      </div>
      <div class="card-toggle">
        <div class="headder-btn click-shrink" @click=${() => this.toggleCard('prev')}>
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </div>
        <div class="headder-btn click-shrink" @click=${() => this.toggleCard('next')}>
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
        ${isDefaultCard
          ? html`<div class="last-update"><span>${this.localize('common.lastUpdate')}: ${formattedDate}</span></div>`
          : ''}
      </main>
    `;
  }

  private _renderDefaultTripCard(): TemplateResult | void {
    const lang = this.selectedLanguage;
    const sections = [
      {
        title: this.localize('tripCard.overview'),
        data: this.createDataArray(DataKeys.tripOverview(lang)),
        active: true,
        key: 'tripOverview',
      },
      {
        title: this.localize('tripCard.fromStart'),
        data: this.createDataArray(DataKeys.tripFromStart(lang)),
        active: this.getSubTripCardVisible('fromStart'),
        key: 'fromStart',
      },
      {
        title: this.localize('tripCard.fromReset'),
        data: this.createDataArray(DataKeys.tripFromReset(lang)),
        active: this.getSubTripCardVisible('fromReset'),
        key: 'fromReset',
      },
    ];

    return html`
      ${sections.map((section) => this.createItemDataRow(section.title, section.data, section.active, section.key))}
    `;
  }

  private _renderDefaultVehicleCard(): TemplateResult | void {
    const lang = this.selectedLanguage;
    const warningsData = this.createDataArray(DataKeys.vehicleWarnings(lang));
    const subCardVisible = this.isSubCardVisible();

    return html`
      <div class="default-card">
        <div class="data-header">${this.localize('vehicleCard.vehicleStatus')}</div>
        ${this._renderOverviewDataWithSubCard()}
      </div>
      <div class="default-card" .hidden=${subCardVisible}>
        <div class="data-header">${this.localize('vehicleCard.vehicleWarnings')}</div>
        ${warningsData.map(
          ({ key, icon, state, name, active }) => html`
            <div class="data-row">
              <div>
                <ha-icon
                  class="data-icon"
                  .icon="${icon}"
                  @click=${() => this.toggleMoreInfo(this.vehicleEntities[key]?.entity_id)}
                ></ha-icon>
                <span>${name}</span>
              </div>
              <div
                class="data-value-unit ${active ? 'error' : ''} "
                @click=${() => this.toggleMoreInfo(this.vehicleEntities[key]?.entity_id)}
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
    const lang = this.selectedLanguage;
    const ecoData = this.createDataArray(DataKeys.ecoScores(lang));

    return html`<div class="default-card">
        <div class="data-header">${this.localize('ecoCard.ecoDisplay')}</div>
        ${this._renderEcoChart()}
      </div>
      ${this.createItemDataRow(this.localize('ecoCard.ecoScore'), ecoData, true, 'ecoScores')}`;
  }

  private _renderDefaultTyreCard(): TemplateResult {
    const lang = this.selectedLanguage;
    const isPressureWarning = this.getBooleanState(this.vehicleEntities.tirePressureWarning?.entity_id);

    const tireCardTitle = this.localize('tyreCard.tyrePressure');
    const tireWarningProblem = this.localize('tyreCard.tireWarningProblem');
    const tireWarningOk = this.localize('tyreCard.tireWarningOk');

    const tyreInfo = isPressureWarning ? tireWarningProblem : tireWarningOk;
    const infoClass = isPressureWarning ? 'warning' : '';

    return html`
      <div class="default-card">
        <div class="data-header">${tireCardTitle}</div>
        <div class="tyre-wrapper">
          <div class="background" style="background-image: url(${tyreBg})"></div>
          ${DataKeys.tyrePressures(lang).map(
            (tyre) =>
              html` <div class="tyre-box ${tyre.key.replace('tirePressure', '').toLowerCase()}">
                <span class="tyre-value">${this.getStateDisplay(this.vehicleEntities[tyre.key]?.entity_id)}</span>
                <span class="tyre-name">${tyre.name}</span>
              </div>`,
          )}
        </div>
        <div class="tyre-info ${infoClass}">
          <span>${tyreInfo}</span>
        </div>
      </div>
    `;
  }

  private _renderServiceControl(): TemplateResult | void {
    const hass = this.hass;
    const serviceControl = this.config.services;
    const carVin = this.carVinNumber;
    const carLockEntity = this.vehicleEntities.lock?.entity_id;
    const selectedLanguage = this.selectedLanguage;
    return html`
      <div class="default-card remote-tab">
        <div class="data-header">${this.localize('common.titleRemoteControl')}</div>
        <remote-control
          .hass=${hass}
          .servicesConfig=${serviceControl}
          .carVin=${carVin}
          .carLockEntity=${carLockEntity}
          .selectedLanguage=${selectedLanguage}
        ></remote-control>
      </div>
    `;
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }
  /* --------------------------- ADDITIONAL METHODS --------------------------- */

  private computeClasses() {
    return classMap({
      '--dark': this.isDark && this.config.selected_theme?.theme === 'Default',
    });
  }

  private applyTheme(theme: string): void {
    if (!this.hass) return;
    if (theme === 'Default') {
      this.resetTheme();
      return;
    }

    const themeData = this.hass.themes.themes[theme];
    if (themeData) {
      // Filter out only top-level properties for CSS variables and the modes property
      const filteredThemeData = Object.keys(themeData)
        .filter((key) => key !== 'modes')
        .reduce(
          (obj, key) => {
            obj[key] = themeData[key];
            return obj;
          },
          {} as Record<string, string>,
        );

      // Get the current mode (light or dark)
      const mode = this.isDark ? 'dark' : 'light';
      const modeData = themeData.modes && typeof themeData.modes === 'object' ? themeData.modes[mode] : {};

      // Merge the top-level and mode-specific variables
      const allThemeData = { ...filteredThemeData, ...modeData };

      applyThemesOnElement(
        this,
        { themes: { [theme]: allThemeData }, default_theme: this.hass.themes.default_theme },
        theme,
        false,
      );
    }
  }

  private resetTheme(): void {
    applyThemesOnElement(this, this.hass.themes, this.hass.themes.default_theme, false);
  }

  /* -------------------------------------------------------------------------- */
  /* ADDED CARD FUNCTIONALITY                                                   */
  /* -------------------------------------------------------------------------- */

  private toggleCard(action?: 'next' | 'prev' | 'close'): void {
    forwardHaptic('light');
    const cardElement = this.shadowRoot?.querySelector('.card-element') as HTMLElement;
    if (!this.activeCardType || !cardElement) return;
    const baseCardTypes = cardTypes(this.selectedLanguage);
    if (action === 'next' || action === 'prev') {
      const currentIndex = baseCardTypes.findIndex((card) => card.type === this.activeCardType);
      const newIndex =
        action === 'next'
          ? (currentIndex + 1) % baseCardTypes.length
          : (currentIndex - 1 + baseCardTypes.length) % baseCardTypes.length;

      cardElement.style.animation = 'none';
      setTimeout(() => {
        this.activeCardType = baseCardTypes[newIndex].type;
        cardElement.style.animation = 'fadeIn 0.3s ease';
      }, 300);
      // this.activeCardType = cardTypes[newIndex].type;
    } else if (action === 'close') {
      this.activeCardType = null;
    }
  }

  private toggleCardFromButtons(cardType: string): void {
    forwardHaptic('light');
    setTimeout(() => {
      this.activeCardType = this.activeCardType === cardType ? null : cardType;
    }, 200);
  }

  /* --------------------- SUBCARDS METHODS AND RENDERING --------------------- */

  private _renderOverviewDataWithSubCard(): TemplateResult {
    const lang = this.selectedLanguage;
    const overViewData = this.createDataArray(DataKeys.vehicleOverview(lang));
    const toggleAttributes = (key: string) => {
      if (key === 'lockSensor') {
        this.lockAttributesVisible = !this.lockAttributesVisible;
      } else if (key === 'windowsClosed') {
        this.windowAttributesVisible = !this.windowAttributesVisible;
      } else if (key === 'doorStatusOverall') {
        this.doorsAttributesVisible = !this.doorsAttributesVisible;
      } else {
        return;
      }
    };

    const subCardIconActive = (key: string): string => {
      if (['lockSensor', 'windowsClosed', 'doorStatusOverall'].includes(key)) {
        const isVisible =
          key === 'lockSensor'
            ? this.lockAttributesVisible
            : key === 'windowsClosed'
              ? this.windowAttributesVisible
              : this.doorsAttributesVisible;
        return isVisible ? 'active' : '';
      }
      return 'hidden';
    };

    const subCardElements = (key: string): TemplateResult | null => {
      if (['lockSensor', 'windowsClosed', 'doorStatusOverall'].includes(key)) {
        return key === 'lockSensor'
          ? this._renderSubCard('lock')
          : key === 'windowsClosed'
            ? this._renderSubCard('window')
            : this._renderSubCard('door');
      }
      return null;
    };

    const toggleMoreInfo = (key: string) => {
      if (['lockSensor', 'doorStatusOverall'].includes(key)) {
        this.toggleMoreInfo(this.vehicleEntities.lockSensor?.entity_id);
      } else {
        this.toggleMoreInfo(this.vehicleEntities[key]?.entity_id);
      }
    };

    return html`
      ${overViewData.map(
        ({ key, name, icon, state, active }) => html`
          <div class="data-row">
            <div>
              <ha-icon
                class="data-icon ${!active ? 'warning' : ''}"
                .icon="${icon}"
                @click=${() => toggleMoreInfo(key)}
              ></ha-icon>
              <span style="text-transform: none;">${name}</span>
            </div>
            <div class="data-value-unit" @click=${() => toggleAttributes(key)}>
              <span class=${!active ? 'warning' : ''} style="text-transform: capitalize;">${state}</span>
              <ha-icon class="subcard-icon ${subCardIconActive(key)}" icon="mdi:chevron-right"></ha-icon>
            </div>
          </div>
          ${subCardElements(key)}
        `,
      )}
    `;
  }

  private _renderSubCard(attributeType: 'lock' | 'window' | 'door'): TemplateResult {
    const lang = this.selectedLanguage;
    const state: Record<string, any> = {};
    const entityID = this.getEntityTypeId(attributeType);
    const stateMapping = this.getAttrStateMap(attributeType, lang);
    const attributesVisible = this.getSubCardVisible(attributeType);
    const attributesClass = attributesVisible ? 'sub-attributes active' : 'sub-attributes';

    // Iterate over the keys of the stateMapping object
    Object.keys(stateMapping).forEach((attribute) => {
      const attributeState = this.getEntityAttribute(entityID, attribute);
      if (attributeState !== undefined && attributeState !== null) {
        state[attribute] = attributeState;
      }
    });

    // Render the attributes
    return html`
      <div class=${attributesClass}>
        ${Object.keys(state).map((attribute) => {
          const rawState = state[attribute];
          // Check if the state is valid and the attribute mapping exists
          if (rawState !== undefined && rawState !== null && stateMapping[attribute]) {
            const readableState = stateMapping[attribute].state[rawState] || 'Unknown';
            const classState = rawState === '2' || rawState === false ? '' : 'warning';
            return html`
              <div class="data-row">
                <span>${stateMapping[attribute].name}</span>
                <div class="data-value-unit">
                  <span style="text-transform: capitalize" class="${classState}">${readableState}</span>
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

  private getEntityTypeId(attributeType: 'lock' | 'window' | 'door'): string | undefined {
    const { lockSensor, windowsClosed } = this.vehicleEntities;
    switch (attributeType) {
      case 'lock':
        return lockSensor?.entity_id;
      case 'window':
        return windowsClosed?.entity_id;
      case 'door':
        return lockSensor?.entity_id;
    }
  }

  private getAttrStateMap(attributeType: 'lock' | 'window' | 'door', lang: string): Record<string, any> {
    switch (attributeType) {
      case 'lock':
        return StateMapping.lockAttributes(lang);
      case 'window':
        return StateMapping.windowAttributes(lang);
      case 'door':
        return StateMapping.doorAttributes(lang);
    }
  }

  private getSubCardVisible(attributeType: 'lock' | 'window' | 'door'): boolean {
    switch (attributeType) {
      case 'lock':
        return this.lockAttributesVisible;
      case 'window':
        return this.windowAttributesVisible;
      case 'door':
        return this.doorsAttributesVisible;
    }
  }

  private getSubTripCardVisible(tripType: 'fromStart' | 'fromReset'): boolean {
    return tripType === 'fromStart' ? this.tripFromStartVisible : this.tripFromResetVisible;
  }

  private isSubCardVisible(): boolean {
    const attributeVisibilityStates = [
      this.lockAttributesVisible,
      this.windowAttributesVisible,
      this.doorsAttributesVisible,
      this.tripFromResetVisible,
      this.tripFromStartVisible,
    ];
    return attributeVisibilityStates.some((state) => state);
  }

  /* -------------------------------------------------------------------------- */
  /* GET ENTITIES STATE AND ATTRIBUTES                                          */
  /* -------------------------------------------------------------------------- */

  private createItemDataRow(title: string, data: EntityConfig[], active: boolean, key: string): TemplateResult {
    const toggleSubTripCard = (key: string) => {
      if (key === 'fromStart') {
        this.tripFromStartVisible = !this.tripFromStartVisible;
      } else if (key === 'fromReset') {
        this.tripFromResetVisible = !this.tripFromResetVisible;
      }
    };

    const subCardToggleBtn = (key: string) => {
      if (key === 'fromStart' || key === 'fromReset') {
        return html`
          <div class="subcard-icon ${active ? 'active' : ''}" @click=${() => toggleSubTripCard(key)}>
            <ha-icon icon="mdi:chevron-right"></ha-icon>
          </div>
        `;
      }
      return html``;
    };

    return html`
      <div class="default-card">
        <div class="data-header">${title} ${subCardToggleBtn(key)}</div>
        <div class="data-box ${!active ? 'hidden' : ''}">
          ${data.map(({ key, name, icon, state }) => {
            if (key && name && state) {
              return html`
                <div class="data-row">
                  <div>
                    <ha-icon class="data-icon" .icon="${icon}"></ha-icon>
                    <span>${name}</span>
                  </div>
                  <div
                    class="data-value-unit"
                    @click=${() => this.toggleMoreInfo(this.vehicleEntities[key]?.entity_id)}
                  >
                    <span>${state}</span>
                  </div>
                </div>
              `;
            } else {
              return html``;
            }
          })}
        </div>
      </div>
    `;
  }

  private createDataArray(keys: EntityConfig[]): ReturnType<VehicleCard['getEntityInfoByKey']>[] {
    return keys.map((config) => this.getEntityInfoByKey(config));
  }

  private getEntityInfoByKey = ({ key, name, icon, state, unit }: EntityConfig): EntityConfig => {
    const vehicleEntity = this.vehicleEntities[key];

    if (!vehicleEntity) {
      return this.getFallbackEntityInfo({ key, name, icon, state, unit });
    }

    const defaultInfo = this.getDefaultEntityInfo({ key, name, icon, state, unit }, vehicleEntity);

    switch (key) {
      case 'soc': {
        return this.getSocInfo(defaultInfo, vehicleEntity);
      }
      case 'maxSoc': {
        return this.getMaxSocInfo(defaultInfo, vehicleEntity);
      }
      case 'chargingPower': {
        return this.getChargingPowerInfo(defaultInfo, vehicleEntity);
      }
      case 'parkBrake': {
        return this.getParkBrakeInfo(defaultInfo, vehicleEntity);
      }

      case 'windowsClosed': {
        return this.getWindowsClosedInfo(defaultInfo, vehicleEntity);
      }
      case 'ignitionState': {
        return this.getIgnitionStateInfo(defaultInfo, vehicleEntity);
      }

      case 'lockSensor': {
        return this.getLockSensorInfo(defaultInfo, vehicleEntity);
      }

      case 'starterBatteryState': {
        return this.getStarterBatteryInfo(defaultInfo, vehicleEntity);
      }
      default:
        return this.getWarningOrDefaultInfo(defaultInfo, key, vehicleEntity);
    }
  };

  /* --------------------------- ENTITY INFO BY KEYS -------------------------- */

  private getFallbackEntityInfo = ({ key, name, icon, state, unit }: EntityConfig): EntityConfig => {
    const lang = this.selectedLanguage;
    if (key === 'selectedProgram') {
      return {
        key,
        name,
        icon,
        state:
          StateMapping.chargeSelectedProgram(lang)[
            this.getEntityAttribute(this.vehicleEntities.rangeElectric?.entity_id, 'selectedChargeProgram')
          ],
        unit,
      };
    }
    if (key === 'doorStatusOverall') {
      const doorValue = this.getEntityAttribute(this.vehicleEntities.lockSensor?.entity_id, 'doorStatusOverall');
      const doorFormatted = StateMapping.doorStatus(lang)[doorValue] || 'Unknown';
      const activeState = doorValue === '1' ? true : false;
      return {
        key,
        name,
        icon,
        state: doorFormatted,
        active: activeState,
        unit,
      };
    }

    if (key === 'drivenTimeReset' || key === 'drivenTimeStart') {
      const entityKey = key === 'drivenTimeReset' ? 'distanceReset' : 'distanceStart';
      const timeState = this.getEntityAttribute(this.vehicleEntities[entityKey]?.entity_id, key);
      const timeValue = timeState ? convertMinutes(parseInt(timeState)) : '';
      return { key, name, icon, state: timeValue, unit };
    }
    return { key, name, icon, state, unit };
  };

  private getDefaultEntityInfo = ({ key, name, icon, state, unit }: EntityConfig, vehicleEntity: any): EntityConfig => {
    return {
      key,
      name: name ?? vehicleEntity.original_name,
      icon: icon ?? this.getEntityAttribute(vehicleEntity.entity_id, 'icon'),
      state: state ?? this.getStateDisplay(vehicleEntity.entity_id),
      unit: unit ?? this.getEntityAttribute(vehicleEntity.entity_id, 'unit_of_measurement'),
    };
  };

  private getSocInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    const currentState = this.getEntityState(vehicleEntity.entity_id);
    const stateValue = currentState ? parseFloat(currentState) : 0;
    let socIcon: string;
    if (stateValue < 35) {
      socIcon = 'mdi:battery-charging-low';
    } else if (stateValue < 70) {
      socIcon = 'mdi:battery-charging-medium';
    } else {
      socIcon = 'mdi:battery-charging-high';
    }
    return { ...defaultInfo, icon: socIcon };
  };

  private getMaxSocInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    const maxSocState = this.getEntityState(vehicleEntity.entity_id);
    const maxSocStateValue = maxSocState ? parseFloat(maxSocState) : 0;
    const iconValue = Math.round(maxSocStateValue / 10) * 10;
    const maxSocIcon = `mdi:battery-charging-${iconValue}`;

    return { ...defaultInfo, icon: maxSocIcon };
  };

  private getChargingPowerInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    const powerState = this.getEntityState(vehicleEntity.entity_id);
    const powerStateValue = powerState ? parseFloat(powerState) : 0;
    const powerStateUnit = this.getEntityAttribute(vehicleEntity.entity_id, 'unit_of_measurement') || 'kW';

    const powerStateDecimals = formatNumber(powerStateValue, this.hass.locale);
    const powerStateDislay = powerStateDecimals + ' ' + powerStateUnit;

    return { ...defaultInfo, state: powerStateDislay };
  };

  private getParkBrakeInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    const parkBrakeState = this.getBooleanState(vehicleEntity.entity_id);
    const parkBrakeOff = this.localize('common.stateParkBrakeOff');
    const parkBrakeOn = this.localize('common.stateParkBrakeOn');
    return {
      ...defaultInfo,
      state: parkBrakeState ? parkBrakeOn : parkBrakeOff,
      active: parkBrakeState,
    };
  };

  private getWindowsClosedInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    let windowState: string;
    const lang = this.selectedLanguage;
    const windowsState = this.getBooleanState(vehicleEntity.entity_id);
    if (windowsState) {
      windowState = this.localize('common.stateClosed');
    } else {
      const windowAttributeStates: Record<number, any> = {};

      Object.keys(StateMapping.windowAttributes(lang)).forEach((attribute) => {
        const attributeState = this.getEntityAttribute(vehicleEntity.entity_id, attribute);
        if (attributeState !== undefined && attributeState !== null) {
          windowAttributeStates[attribute] = attributeState;
        }
      });

      const openWindows = Object.keys(windowAttributeStates).filter(
        (attribute) => windowAttributeStates[attribute] === '0',
      );

      const totalOpenWindows = openWindows.length;
      windowState = `${totalOpenWindows} ${this.localize('common.stateOpen')}`;
    }
    return {
      ...defaultInfo,
      state: windowState,
      active: windowsState,
    };
  };

  private getIgnitionStateInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    const shortValue = this.getEntityAttribute(vehicleEntity.entity_id, 'value_short');
    const realState = this.getEntityState(vehicleEntity.entity_id);
    const activeState = realState === '0' || realState === '1' ? true : false;
    return {
      ...defaultInfo,
      state: shortValue || 'Unknown',
      active: activeState,
    };
  };

  private getLockSensorInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    const lang = this.selectedLanguage;
    const lockState = this.getEntityState(vehicleEntity.entity_id);
    const lockStateFormatted = StateMapping.lockStates(lang)[lockState] || StateMapping.lockStates['4'];
    const lockIcon = lockState === '2' || lockState === '1' ? 'mdi:lock' : 'mdi:lock-open';

    return {
      ...defaultInfo,
      icon: lockIcon,
      state: lockStateFormatted,
      active: lockState === '2' || lockState === '1' ? true : false,
    };
  };

  private getStarterBatteryInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    const lang = this.selectedLanguage;
    const stateValue = this.getEntityState(vehicleEntity.entity_id);
    const stateFormated = StateMapping.starterBattery(lang)[stateValue] || 'Unknown';

    return {
      ...defaultInfo,
      state: stateFormated,
    };
  };

  private getWarningOrDefaultInfo = (defaultInfo: EntityConfig, key: string, vehicleEntity: any): EntityConfig => {
    const lang = this.selectedLanguage;
    if (
      DataKeys.vehicleWarnings(lang)
        .map((key) => key.key)
        .includes(key)
    ) {
      const warningState = this.getBooleanState(vehicleEntity.entity_id);

      return {
        ...defaultInfo,
        state: warningState ? 'Problem' : 'Ok',
        active: warningState,
      };
    }
    return defaultInfo;
  };

  /* --------------------- GET ENTITY STATE AND ATTRIBUTES -------------------- */

  private getStateDisplay(entityId: string | undefined): string {
    if (!entityId || !this.hass.states[entityId]) return '';
    return this.hass.formatEntityState(this.hass.states[entityId]);
  }

  private getSecondaryInfo(cardType: string): string {
    const { odometer, lockSensor, ecoScoreBonusRange } = this.vehicleEntities;

    switch (cardType) {
      case 'tripCards':
        return this.getStateDisplay(odometer?.entity_id);

      case 'vehicleCards':
        const state = this.getStateDisplay(lockSensor?.entity_id);
        const realState = this.localize(`common.state` + { state }.state);
        return realState;

      case 'ecoCards':
        return this.getStateDisplay(ecoScoreBonusRange?.entity_id);

      case 'tyreCards':
        const secondaryInfoTyres = this.getMinMaxTyrePressure();
        return secondaryInfoTyres;

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

  private toggleMoreInfo(entity: string): void {
    fireEvent(this, 'hass-more-info', { entityId: entity });
  }

  private getMinMaxTyrePressure() {
    const { vehicleEntities } = this;
    const pressuresWithUnits = DataKeys.tyreAttributes.map((key) => ({
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
  }

  private getErrorNotify(cardType: string): boolean {
    const lang = this.selectedLanguage;
    const { vehicleEntities } = this;
    switch (cardType) {
      case 'vehicleCards':
        const warnKeys = [...DataKeys.vehicleWarnings(lang).map((key) => key.key), 'windowsClosed'];
        const hasWarning = warnKeys.some((key) => this.getBooleanState(vehicleEntities[key]?.entity_id));
        return hasWarning;
      case 'tyreCards':
        return this.getBooleanState(vehicleEntities.tirePressureWarning?.entity_id);
      default:
        return false;
    }
  }

  /* ----------------------------- EVENTS HANDLERS ---------------------------- */
  private _editorEventsHandler(e: Event): void {
    const cardType = (e as CustomEvent).detail;
    this.activeCardType = cardType;
    this.requestUpdate(); // Trigger a re-render
  }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'vehicle-info-card',
  name: 'Vehicle Info Card',
  preview: true,
  description: 'A custom card to display vehicle data with a map and additional cards.',
  documentationURL: 'https://github.com/ngocjohn/vehicle-info-card?tab=readme-ov-file#configuration',
});

declare global {
  interface Window {
    BenzCard: VehicleCard | undefined;
  }
  interface HTMLElementTagNameMap {
    'vehicle-info-card': VehicleCard;
  }
}
