/* eslint-disable @typescript-eslint/no-explicit-any */
import { mdiChevronLeft, mdiChevronRight, mdiClose } from '@mdi/js';
import {
  fireEvent,
  formatDateTime,
  forwardHaptic,
  hasConfigOrEntityChanged,
  LovelaceCardConfig,
  LovelaceCardEditor,
  applyThemesOnElement,
  LovelaceCard,
} from 'custom-card-helpers';
import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup, nothing } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state, query } from 'lit/decorators.js';

import './components/cards';
import { VehicleButtons } from './components/cards';
import { CardItem, cardTypes } from './const/data-keys';
import * as IMG from './const/imgconst';
import * as StateMapping from './const/state-mapping';
import { localize } from './localize/localize';
import {
  HA as HomeAssistant,
  VehicleCardConfig,
  EntityConfig,
  VehicleEntity,
  EcoData,
  ButtonCardEntity,
  CardTypeConfig,
  CustomButtonEntity,
  defaultConfig,
  BaseButtonConfig,
} from './types';
import { HEADER_ACTION } from './types/card-types';
import { handleCardFirstUpdated, getCarEntity, handleCardSwipe, convertMinutes, isEmpty } from './utils';
import { getAddedButton, getDefaultButton, createCardElement, createCustomButtons } from './utils/ha-helpers';

import styles from './css/styles.css';

@customElement('vehicle-info-card')
export class VehicleCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('vehicle-info-card-editor');
  }
  // Properties
  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ type: Object }) public config!: VehicleCardConfig;
  @property({ type: Boolean }) public editMode = false;

  // Vehicle entities and attributes
  @state() private vehicleEntities: Record<string, VehicleEntity> = {};
  @state() public buttonCards: Record<string, ButtonCardEntity> = {};
  @state() public _entityNotFound: boolean = false;

  @state() DataKeys: Record<string, CardItem[]> = {};

  // Active card type
  @state() public _currentCardType: string | null = null;
  @state() private _activeSubCard: Set<string> = new Set();
  @state() private _mapPopupLovelace: LovelaceCardConfig[] = [];
  @state() private chargingInfoVisible!: boolean;

  // Preview states
  @state() private _currentPreviewType: 'button' | 'card' | 'tire' | null = null;
  @state() private _cardPreviewElement: LovelaceCardConfig[] = [];
  @state() private _buttonEntityPreview: Partial<CustomButtonEntity> = {};

  // Loading state
  @state() private _loading = true;
  @state() private _buttonReady = false;

  // Components
  @query('vehicle-buttons') vehicleButtons!: VehicleButtons;

  @query('eco-chart') ecoChart!: Element;
  constructor() {
    super();
    this.handleEditorEvents = this.handleEditorEvents.bind(this);
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._buttonReady && this.buttonCards) {
      Object.keys(this.buttonCards).forEach((key) => {
        const customCard = this.buttonCards[key].custom_card;
        const useCustom = this.buttonCards[key].card_type === 'custom';
        if (useCustom && !isEmpty(customCard)) {
          customCard.forEach((card) => {
            card.hass = hass;
          });
        }
      });
    }
  }

  private get userLang(): string {
    if (!this.config.selected_language || this.config.selected_language === 'system') {
      return this._hass.language;
    }
    return this.config.selected_language;
  }

  private get baseCardTypes(): CardTypeConfig[] {
    return cardTypes(this.userLang);
  }

  private get isCharging(): boolean {
    const chargingActive = this.getEntityAttribute(this.vehicleEntities.rangeElectric?.entity_id, 'chargingactive');
    return Boolean(chargingActive);
  }

  private get carVinNumber(): string {
    if (!this.config.entity) return '';
    return this.getEntityAttribute(this.config.entity, 'vin');
  }

  get isDark(): boolean {
    if (this.config?.selected_theme?.mode === 'dark') {
      return true;
    } else if (this.config?.selected_theme?.mode === 'light') {
      return false;
    }
    return this._hass.themes.darkMode;
  }

  private get isEditorPreview(): boolean {
    const parentElementClassPreview = this.offsetParent?.classList.contains('element-preview');
    return parentElementClassPreview || false;
  }

  public static get styles(): CSSResultGroup {
    return styles;
  }

  public static getStubConfig = (hass: HomeAssistant): Record<string, unknown> => {
    const entity = getCarEntity(hass);
    console.log('entity', entity);
    return {
      ...defaultConfig,
      entity: entity,
      images: [],
    };
  };

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    if (!config) {
      throw new Error('Invalid configuration');
    }

    this.config = {
      ...config,
    };
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    await handleCardFirstUpdated(this);
    this.setUpButtonCards();
    this._setUpPreview();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (
      changedProps.has('_currentCardType') &&
      this._currentCardType !== 'mapDialog' &&
      this._currentCardType !== null &&
      !this.editMode
    ) {
      const cardElement = this.shadowRoot?.querySelector('.card-element');
      if (cardElement) {
        handleCardSwipe(cardElement, this.toggleCard.bind(this));
      }
    }
  }

  protected shouldUpdate(_changedProps: PropertyValues): boolean {
    if (!this.config || !this._hass) {
      console.log('config or hass is null');
      return false;
    }

    if (_changedProps.has('_currentCardType') && !this._currentCardType && !this.editMode) {
      this.applyMarquee();
    }

    if (_changedProps.has('config') && this.config.selected_theme?.theme !== 'default') {
      this.applyTheme(this.config.selected_theme.theme);
    }

    if (
      _changedProps.has('config') &&
      this.config.show_map &&
      this.config.enable_map_popup &&
      this.config.device_tracker
    ) {
      this.createMapDialog();
    }

    if (_changedProps.has('_currentCardType') && this._currentCardType) {
      this._activeSubCard = new Set<string>();
    }

    return hasConfigOrEntityChanged(this, _changedProps, true);
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('editor-event', this.handleEditorEvents);
    if (process.env.ROLLUP_WATCH === 'true') {
      window.BenzCard = this;
    }
    if (this.editMode !== true) {
      setTimeout(() => {
        this._loading = false;
      }, 2000);
    } else {
      this._loading = false;
    }
    this.applyMarquee();
  }

  disconnectedCallback(): void {
    window.removeEventListener('editor-event', this.handleEditorEvents);
    super.disconnectedCallback();
  }

  private async setUpButtonCards(): Promise<void> {
    if (this._currentPreviewType !== null) return;
    this._buttonReady = false;

    const buttonCards: { [key: string]: ButtonCardEntity } = {};
    const logging: string[] = [];
    for (const baseCard of this.baseCardTypes) {
      buttonCards[baseCard.type] = await getDefaultButton(this._hass, this.config, baseCard);
      logging.push(baseCard.type);
      // this.buttonCards = buttonCards;
      // console.log('Button Cards ready:', logging);
    }

    // Use Promise.all for added_cards processing
    if (this.config.added_cards && Object.keys(this.config.added_cards).length > 0) {
      await Promise.all(
        Object.keys(this.config.added_cards).map(async (key) => {
          const card = this.config.added_cards[key];
          if (card) {
            buttonCards[key] = await getAddedButton(this._hass, card, key);
          }
          // this.buttonCards = buttonCards;
          logging.push(key);
        })
      );
    }

    if (buttonCards) {
      this.buttonCards = buttonCards;
    }

    this._buttonReady = true;
    // console.log('Button Cards ready:', logging);
    this.requestUpdate();
  }

  private async createMapDialog(): Promise<void> {
    if (!this.config.show_map || !this.config.enable_map_popup || !this.config.device_tracker) {
      return;
    }
    if (this.config.device_tracker && this.config.show_map && this.config.enable_map_popup) {
      const { default_zoom, hours_to_show, theme_mode } = this.config.map_popup_config || {};
      const haMapConfig = [
        {
          type: 'map',
          default_zoom: default_zoom || 14,
          hours_to_show: hours_to_show,
          theme_mode: theme_mode,
          entities: [
            {
              entity: this.config.device_tracker,
            },
          ],
        },
      ];
      this._mapPopupLovelace = await createCardElement(this._hass, haMapConfig);
      console.log('Map dialog created');
    }
  }

  private async _setUpPreview(): Promise<void> {
    if (!this._currentPreviewType && this.config?.card_preview) {
      this._currentPreviewType = 'card';
    } else if (!this._currentPreviewType && this.config?.btn_preview) {
      this._currentPreviewType = 'button';
    } else if (!this._currentPreviewType && this.config?.tire_preview) {
      this._currentPreviewType = 'tire';
    }

    if (this._currentPreviewType !== null) {
      await this._configurePreview(this._currentPreviewType);
    } else {
      this._currentPreviewType = null;
    }
  }

  private async _configurePreview(cardType: 'button' | 'card' | 'tire' | null): Promise<void> {
    if (!cardType && !this.isEditorPreview) return;

    let cardConfig: LovelaceCardConfig[] | BaseButtonConfig = [];
    let cardElement: any;

    switch (cardType) {
      case 'button':
        cardConfig = this.config?.btn_preview;
        if (!cardConfig) return;
        cardElement = await createCustomButtons(this._hass, cardConfig as BaseButtonConfig);
        this._buttonEntityPreview = cardElement;
        break;
      case 'card':
        cardConfig = this.config?.card_preview;
        if (!cardConfig) return;
        cardElement = await createCardElement(this._hass, cardConfig as LovelaceCardConfig[]);
        this._cardPreviewElement = cardElement;
        break;
      case 'tire':
        this._currentPreviewType = 'tire';
        break;
      default:
        return;
    }

    if (cardType === null) {
      this._resetCardPreview(); // Reset preview
      return;
    }

    this._currentPreviewType = cardType;
    this.requestUpdate();
  }

  private _resetCardPreview(): void {
    this._cardPreviewElement = [];
    this._buttonEntityPreview = {};
    this._currentPreviewType = null;
    this.requestUpdate();
  }

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this.userLang, search, replace);
  };

  /* -------------------------------------------------------------------------- */
  /* MAIN RENDER                                                                */
  /* -------------------------------------------------------------------------- */

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    if (!this.config || !this._hass || !this.config.entity) {
      return this._showWarning('No entity provided');
    }
    if (this._entityNotFound) {
      return this._showWarning('Entity not found');
    }

    if (this._loading) {
      return this._renderLoading();
    }

    if (this._currentPreviewType !== null && this.isEditorPreview) {
      return this._renderCardPreview();
    }

    const name = this.config.name || '';
    return html`
      <ha-card class="main-card">
        ${this._renderHeaderBackground()}
        <header>
          <h1>${name}</h1>
        </header>
        ${this._currentCardType ? this._renderCustomCard() : this._renderMainCard()}
      </ha-card>
    `;
  }

  private _renderCardPreview(): TemplateResult {
    if (!this._currentPreviewType) return html``;
    const type = this._currentPreviewType;
    const typeMap = {
      button: this._renderBtnPreview(this._buttonEntityPreview as CustomButtonEntity),
      card: html`<ha-card class="preview-card">${this._cardPreviewElement}</ha-card>`,
      tire: this._renderDefaultTyreCard(),
    };

    return typeMap[type];
  }

  // Render loading template
  private _renderLoading(): TemplateResult {
    const cardHeight = this.getGridRowSize() * 56;
    return html`
      <ha-card>
        <div class="loading-image" style="height: ${cardHeight}px">
          <img src="${IMG.logoLoading}" alt="Loading" />
        </div>
      </ha-card>
    `;
  }

  private _renderBtnPreview(btn: CustomButtonEntity): TemplateResult {
    const { primary, icon, secondary, notify, entity } = btn;
    return html`
      <ha-card class="preview-card">
        <div class="grid-item">
          <div class="item-icon">
            <div class="icon-background">
              <ha-state-icon
                .hass=${this._hass}
                .stateObj=${entity ? this._hass.states[entity] : undefined}
                .icon=${icon}
              ></ha-state-icon>
            </div>
            <div class="item-notify ${notify ? '' : 'hidden'}">
              <ha-icon icon="mdi:alert-circle"></ha-icon>
            </div>
          </div>
          <div class="item-content">
            <div class="primary"><span class="title">${primary}</span></div>
            <span class="secondary">${secondary}</span>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderHeaderBackground(): TemplateResult {
    if (!this.config.show_background || this._currentCardType !== null) return html``;
    const background = this.isDark ? IMG.amgWhite : IMG.amgBlack;

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

    // Helper function to render items
    const renderItem = (icon: string, label: string, onClick: () => void, isActive: boolean = false) => html`
      <div class="item active-btn" @click=${onClick}>
        <ha-icon icon=${icon}></ha-icon>
        <div class="added-item-arrow">
          <span class="${isChargingVisible}">${label}</span>
          <div class="subcard-icon ${isActive ? 'active' : ''}" style="margin-bottom: 2px">
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </div>
        </div>
      </div>
    `;

    // Render default indicators
    const defaultIndicators = defaultIndicData.map(
      ({ state, icon }) => html`
        <div class="item">
          <ha-icon .icon=${icon}></ha-icon>
          <div><span class="${isChargingVisible}">${state}</span></div>
        </div>
      `
    );

    // Render added charging info if charging
    const addedChargingInfo = this.isCharging
      ? renderItem(
          'mdi:ev-station',
          this.localize('card.common.stateCharging'),
          () => (this.chargingInfoVisible = !this.chargingInfoVisible),
          this.chargingInfoVisible
        )
      : nothing;

    // Render service control if enabled
    const serviceControl =
      this.config.enable_services_control !== false
        ? renderItem('mdi:car-cog', this.localize('card.common.titleServices'), () =>
            this.toggleCardFromButtons('servicesCard')
          )
        : nothing;

    // Combine all parts and render
    return html` <div class="info-box">${defaultIndicators} ${serviceControl} ${addedChargingInfo}</div> `;
  }

  private _renderChargingInfo(): TemplateResult {
    if (!this.DataKeys.chargingOverview) return html``;
    const chargingOverview = this.DataKeys.chargingOverview;
    const chargingData = this.createDataArray(chargingOverview);
    const chargingClass = this.chargingInfoVisible ? 'info-box charge active' : 'info-box charge';

    return html`
      <div class=${chargingClass} .hidden=${this.isCharging}>
        ${chargingData.map(({ name, state, icon }) => {
          if (state) {
            return html`
              <div class="item charge">
                <div class="icon-state">
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
      getEntityInfo(this.vehicleEntities[entity]?.entity_id)
    );

    const renderInfoBox = (icon: string, state: number, fuelInfo: string, rangeInfo: string, eletric: boolean) => html`
      <div class="info-box range">
        <div class="item">
          <ha-icon icon="${icon}"></ha-icon>
          <div><span>${fuelInfo}</span></div>
        </div>
        <div class="fuel-wrapper">
          <div
            class="fuel-level-bar"
            ?electric=${eletric}
            ?charging=${eletric && this.isCharging}
            style="--vic-range-width: ${state}%;"
          ></div>
        </div>
        <div class="item">
          <span>${rangeInfo}</span>
        </div>
      </div>
    `;

    const renderBothInfoBoxes = () =>
      html` ${fuelInfo && rangeLiquidInfo
        ? renderInfoBox(
            'mdi:gas-station',
            fuelInfo.state!,
            fuelInfo.stateDisplay!,
            rangeLiquidInfo.stateDisplay!,
            false
          )
        : ''}
      ${socInfo && rangeElectricInfo
        ? renderInfoBox('mdi:ev-station', socInfo.state!, socInfo.stateDisplay!, rangeElectricInfo.stateDisplay!, true)
        : ''}`;

    return html`<div class="combined-info-box">${renderBothInfoBoxes()}</div>`;
  }

  private _renderHeaderSlides(): TemplateResult {
    if (!this.config.images || !this.config.show_slides) return html``;

    return html`<header-slide .config=${this.config} .editMode=${this.editMode}></header-slide>`;
  }

  private _renderMap(): TemplateResult | void {
    const { config } = this;
    if (!config.show_map) {
      return;
    }
    if (!config.device_tracker && config.show_map) {
      return this._showWarning('No device_tracker entity provided.');
    }
    return html`
      <div id="map-box">
        <vehicle-map
          .hass=${this._hass}
          .config=${config}
          .card=${this}
          @toggle-map-popup=${() => (this._currentCardType = 'mapDialog')}
        ></vehicle-map>
      </div>
    `;
  }

  private _renderEcoChart(): TemplateResult {
    if (this._currentCardType !== 'ecoCards') return html``;
    const lang = this.userLang;
    const ecoUnit = this.getEntityAttribute(this.vehicleEntities.ecoScoreBonusRange?.entity_id, 'unit_of_measurement');

    const getEcoScore = (entity: string | undefined): number => {
      if (!entity) return 0;
      const state = this.getEntityState(entity);
      return state === 'unavailable' ? 0 : parseFloat(state);
    };
    const ecoScoreEntries = this.DataKeys.ecoScores;
    const ecoDataObj = ecoScoreEntries.reduce((acc, score) => {
      if (score.apexProp) {
        acc[score.apexProp] = getEcoScore(this.vehicleEntities[score.key].entity_id);
      }

      return acc;
    }, {} as EcoData);

    ecoDataObj.unit = ecoUnit;

    return html`<eco-chart .ecoData=${ecoDataObj} .selectedLanguage=${lang}></eco-chart>`;
  }

  private _renderButtons(): TemplateResult {
    if (!this.config.show_buttons) return html``;
    if (!this._buttonReady) return html``;
    const notHidden = Object.entries(this.buttonCards).filter(([, value]) => !value.button.hidden);
    const buttonCards = Object.fromEntries(notHidden);
    const config = this.config;
    return html`
      <vehicle-buttons
        .hass=${this._hass}
        .component=${this}
        ._config=${config}
        ._buttons=${buttonCards}
      ></vehicle-buttons>
    `;
  }

  private _renderCustomCard(): TemplateResult {
    if (!this._currentCardType) return html``;

    const cardConfigMap = {
      tripCards: this._renderDefaultTripCard(),
      vehicleCards: this._renderDefaultVehicleCard(),
      ecoCards: this._renderDefaultEcoCard(),
      tyreCards: this._renderDefaultTyreCard(),
      servicesCard: this._renderServiceControl(),
      mapDialog: this._mapPopupLovelace,
      emptyCustom: this._showWarning('No custom card provided'),
    };

    const key = this._currentCardType;
    let renderCard: TemplateResult | LovelaceCardConfig[] | void;
    if (key === 'mapDialog' || key === 'servicesCard') {
      renderCard = cardConfigMap[key];
    } else {
      const selectedCard = this.buttonCards[key];
      const cardType = selectedCard.card_type ?? 'default';
      const customCard = !isEmpty(selectedCard.custom_card)
        ? selectedCard.custom_card.map((card: LovelaceCardConfig) => card)
        : cardConfigMap.emptyCustom;

      renderCard = cardType === 'custom' ? customCard : cardConfigMap[key];
    }

    const lastCarUpdate = this.config.entity ? this._hass.states[this.config.entity].last_changed : '';
    const hassLocale = this._hass.locale;
    hassLocale.language = this.userLang;

    const formattedDate = formatDateTime(new Date(lastCarUpdate), hassLocale);

    const cardHeaderBox = html`<div class="added-card-header">
      <ha-icon-button .label=${'Close'} .path=${mdiClose} class="click-shrink" @click=${() => this.toggleCard('close')}>
      </ha-icon-button>
      <div class="card-toggle">
        <ha-icon-button
          .label=${'Previous'}
          .path=${mdiChevronLeft}
          @click=${() => this.toggleCard('prev')}
          class="click-shrink"
        ></ha-icon-button>

        <ha-icon-button
          .label=${'Next'}
          .path=${mdiChevronRight}
          @click=${() => this.toggleCard('next')}
          class="click-shrink"
        ></ha-icon-button>
      </div>
    </div>`;

    return html`
      <main id="cards-wrapper">
        ${cardHeaderBox}
        <section class="card-element">${renderCard}</section>
        <div class="last-update">
          <span>${this.localize('card.common.lastUpdate')}: ${formattedDate}</span>
        </div>
      </main>
    `;
  }

  private _renderDefaultTripCard(): TemplateResult | void {
    const { tripOverview, tripFromStart, tripFromReset } = this.DataKeys;
    const sections = [
      {
        title: this.localize('card.tripCard.overview'),
        data: this.createDataArray(tripOverview),
        key: '',
      },
      {
        title: this.localize('card.tripCard.fromStart'),
        data: this.createDataArray(tripFromStart),
        key: 'fromStart',
      },
      {
        title: this.localize('card.tripCard.fromReset'),
        data: this.createDataArray(tripFromReset),
        key: 'fromReset',
      },
    ];
    return html` ${sections.map((section) => this.createItemDataRow(section.title, section.data, section.key))} `;
  }

  private _renderDefaultVehicleCard(): TemplateResult | void {
    const warningsData = this.createDataArray(this.DataKeys.vehicleWarnings);

    const isSubCardVisible = this.isOverviewDataActive() || !this._activeSubCard.has('warnings');

    return html`
      <div class="default-card">
        <div class="data-header">${this.localize('card.vehicleCard.vehicleStatus')}</div>
        <div class="data-box">${this._renderOverviewDataWithSubCard()}</div>
      </div>
      <div class="default-card">
        <div class="data-header">
          <div @click=${() => this.toggleSubCard('warnings')} ?clickable=${true}>
            ${this.localize('card.vehicleCard.vehicleWarnings')}
          </div>
          <div class="subcard-icon ${!isSubCardVisible ? 'active' : ''}" @click=${() => this.toggleSubCard('warnings')}>
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </div>
        </div>
        <div class="data-box" active=${!isSubCardVisible}>
          ${warningsData.map(({ key, icon, state, name, active }) => {
            return html`
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
            `;
          })}
        </div>
      </div>
    `;
  }

  private _renderDefaultEcoCard(): TemplateResult | void {
    const ecoData = this.createDataArray(this.DataKeys.ecoScores);

    return html`<div class="default-card">
        <div class="data-header">${this.localize('card.ecoCard.ecoDisplay')}</div>
        <div class="data-box">${this._renderEcoChart()}</div>
      </div>
      ${this.createItemDataRow(this.localize('card.ecoCard.ecoScore'), ecoData, 'ecoScores')}`;
  }

  private _renderDefaultTyreCard(): TemplateResult {
    const tireConfig = this.config?.extra_configs?.tire_card_custom || {};
    const customTyreBg = tireConfig?.background || IMG.tyreBg;
    const isHorizontal = tireConfig?.horizontal ?? false;
    const tireImageSize = tireConfig?.image_size ?? 100;
    const tireValueSize = tireConfig?.value_size ?? 100;
    const tireTop = tireConfig?.top ?? 50;
    const tireLeft = tireConfig?.left ?? 50;

    const sizeStyle = {
      '--vic-tire-top': `${tireTop}%`,
      '--vic-tire-left': `${tireLeft}%`,
      '--vic-tire-size': `${tireImageSize}%`,
      '--vic-tire-value-size': tireValueSize / 100,
    };
    const directionClass = isHorizontal ? 'rotated' : '';

    const isPressureWarning = this.getBooleanState(this.vehicleEntities.tirePressureWarning?.entity_id);

    const tireCardTitle = this.localize('card.tyreCard.tyrePressure');
    const tireWarningProblem = this.localize('card.tyreCard.tireWarningProblem');
    const tireWarningOk = this.localize('card.tyreCard.tireWarningOk');

    const tyreInfo = isPressureWarning ? tireWarningProblem : tireWarningOk;
    const infoClass = isPressureWarning ? 'warning' : '';

    return html`
      <div class="default-card">
        <div class="data-header">${tireCardTitle}</div>
        <div class="tyre-toggle-btn click-shrink" @click=${(ev: Event) => this.toggleTireDirection(ev)}>
          <ha-icon icon="mdi:rotate-right-variant"></ha-icon>
        </div>
        <div class="data-box tyre-wrapper ${directionClass}" style=${styleMap(sizeStyle)}>
          <div class="background" style="background-image: url(${customTyreBg})"></div>
          ${this.DataKeys.tyrePressures.map(
            (tyre) =>
              html` <div class="tyre-box ${directionClass} ${tyre.key.replace('tirePressure', '').toLowerCase()}">
                <span class="tyre-value">${this.getStateDisplay(this.vehicleEntities[tyre.key]?.entity_id)}</span>
                <span class="tyre-name">${tyre.name}</span>
              </div>`
          )}
        </div>
        <div class="tyre-info ${infoClass}">
          <span>${tyreInfo}</span>
        </div>
      </div>
    `;
  }

  private toggleTireDirection(ev: Event): void {
    ev.stopPropagation();
    const target = ev.target as HTMLElement;
    const tyreWrapper = target.closest('.default-card')?.querySelector('.tyre-wrapper');
    const tyreBoxex = tyreWrapper?.querySelectorAll('.tyre-box');
    if (!tyreWrapper || !tyreBoxex) return;

    const isHorizontal = tyreWrapper.classList.contains('rotated');

    tyreWrapper.classList.toggle('rotated', !isHorizontal);
    tyreBoxex.forEach((el) => {
      el.classList.toggle('rotated', !isHorizontal);
    });
  }

  private _renderServiceControl(): TemplateResult | void {
    const hass = this._hass;
    const serviceControl = this.config.services;
    const carVin = this.carVinNumber;
    const carLockEntity = this.vehicleEntities.lock?.entity_id;
    const selectedLanguage = this.userLang;
    return html`
      <div class="default-card remote-tab">
        <div class="data-header">${this.localize('card.common.titleRemoteControl')}</div>
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

  private applyTheme = (theme: string): void => {
    const themeData = this._hass.themes.themes[theme];
    if (themeData) {
      // Filter out only top-level properties for CSS variables and the modes property
      const filteredThemeData = Object.keys(themeData)
        .filter((key) => key !== 'modes')
        .reduce(
          (obj, key) => {
            obj[key] = themeData[key];
            return obj;
          },
          {} as Record<string, string>
        );

      // Get the current mode (light or dark)
      const mode = this.isDark ? 'dark' : 'light';
      const modeData = themeData.modes && typeof themeData.modes === 'object' ? themeData.modes[mode] : {};

      // Merge the top-level and mode-specific variables
      const allThemeData = { ...filteredThemeData, ...modeData };

      applyThemesOnElement(
        this,
        { themes: { [theme]: allThemeData }, default_theme: this._hass.themes.default_theme },
        theme,
        false
      );
    }
  };

  /* -------------------------------------------------------------------------- */
  /* ADDED CARD FUNCTIONALITY                                                   */
  /* -------------------------------------------------------------------------- */

  private toggleCard = (action: HEADER_ACTION) => {
    forwardHaptic('light');
    const cardElement = this.shadowRoot?.querySelector('.card-element') as HTMLElement;
    if (!this._currentCardType || !cardElement) return;
    const baseCardTypes = Object.values(this.buttonCards).filter((card) => card.button_type !== 'action');

    if (action === 'next' || action === 'prev') {
      const currentIndex = baseCardTypes.findIndex((card) => card.key === this._currentCardType);
      const newIndex =
        action === 'next'
          ? (currentIndex + 1) % baseCardTypes.length
          : (currentIndex - 1 + baseCardTypes.length) % baseCardTypes.length;

      cardElement.style.animation = 'none';
      setTimeout(() => {
        this._currentCardType = baseCardTypes[newIndex].key;
        cardElement.style.animation = 'fadeIn 0.3s ease';
      }, 300);
      // this.activeCardType = cardTypes[newIndex].type;
    } else if (action === 'close') {
      this._currentCardType = null;
    }
  };

  public toggleCardFromButtons = (cardType: string) => {
    forwardHaptic('light');
    setTimeout(() => {
      this._currentCardType = this._currentCardType === cardType ? null : cardType;
    }, 150);
  };

  /* --------------------- SUBCARDS METHODS AND RENDERING --------------------- */

  private _renderOverviewDataWithSubCard(): TemplateResult {
    const overViewData = this.createDataArray(this.DataKeys.vehicleOverview);

    // Map to handle the visibility and rendering of subcards
    const subCardMapping = {
      lockSensor: {
        key: 'lock',
        renderSubCard: () => this._renderSubCard('lock'),
      },
      windowsClosed: {
        key: 'window',
        renderSubCard: () => this._renderSubCard('window'),
      },
      doorStatusOverall: {
        key: 'door',
        renderSubCard: () => this._renderSubCard('door'),
      },
    };

    const toggleMoreInfo = (key: string) => {
      const entityId =
        key === 'lockSensor' || key === 'doorStatusOverall'
          ? this.vehicleEntities.lockSensor?.entity_id
          : this.vehicleEntities[key]?.entity_id;

      if (entityId) {
        this.toggleMoreInfo(entityId);
      }
    };

    const subCardVisible = (key: string) => this.isSubCardActive(key);

    const toggleSubCard = (key: string) => {
      if (['doorStatusOverall', 'lockSensor', 'windowsClosed'].includes(key)) {
        this.toggleSubCard(subCardMapping[key].key);
      } else {
        toggleMoreInfo(key);
      }
    };

    return html`
      ${overViewData.map(({ key, name, icon, state, active }) => {
        if (state) {
          const subCard = subCardMapping[key];
          return html`
            <div class="data-row">
              <div>
                <ha-icon
                  class="data-icon ${!active ? 'warning' : ''}"
                  .icon="${icon}"
                  @click=${() => toggleMoreInfo(key)}
                ></ha-icon>
                <span class="data-label">${name}</span>
              </div>
              <div class="data-value-unit" @click=${() => toggleSubCard(key)}>
                <span class=${!active ? 'warning' : ''} style="text-transform: capitalize;">${state}</span>
                ${subCard
                  ? html`
                      <ha-icon
                        class="subcard-icon ${subCardVisible(subCard.key) ? 'active' : ''}"
                        icon="mdi:chevron-down"
                      >
                      </ha-icon>
                    `
                  : ''}
              </div>
            </div>
            ${subCard ? subCard.renderSubCard() : ''}
          `;
        } else {
          return html``;
        }
      })}
    `;
  }

  private _renderSubCard(attributeType: 'lock' | 'window' | 'door'): TemplateResult {
    const lang = this.userLang;
    const state: Record<string, string | boolean> = {};
    const entityID = this.getEntityTypeId(attributeType);
    const stateMapping = this.getAttrStateMap(attributeType, lang);
    const attributesVisible = this.isSubCardActive(attributeType);
    const attributesClass = attributesVisible ? 'sub-attributes active' : 'sub-attributes';

    // Iterate over the keys of the stateMapping object
    Object.keys(stateMapping).forEach((attribute) => {
      let attributeState: string | boolean | null | undefined;
      // Check if the attribute is the charge flap DC status
      if (attribute === 'chargeflapdcstatus' && this.vehicleEntities.chargeFlapDCStatus?.entity_id !== undefined) {
        attributeState = this.getEntityState(this.vehicleEntities.chargeFlapDCStatus.entity_id);
      } else if (attribute === 'sunroofstatus' && this.vehicleEntities.sunroofStatus?.entity_id !== undefined) {
        attributeState = this.getEntityState(this.vehicleEntities.sunroofStatus.entity_id);
      } else {
        attributeState = this.getEntityAttribute(entityID, attribute);
      }
      // Check if the attribute state

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
            let classState: boolean;
            if (attribute === 'sunroofstatus') {
              classState = rawState === '0' ? false : true;
            } else {
              classState = rawState === '2' || rawState === '1' || rawState === false ? false : true;
            }
            const classStateString = classState ? 'warning' : '';
            return html`
              <div class="data-row">
                <span>${stateMapping[attribute].name}</span>
                <div class="data-value-unit">
                  <span style="text-transform: capitalize" class="${classStateString}">${readableState}</span>
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
    const entityMapping: Record<string, string | undefined> = {
      lock: this.vehicleEntities.lockSensor?.entity_id,
      window: this.vehicleEntities.windowsClosed?.entity_id,
      door: this.vehicleEntities.lockSensor?.entity_id,
    };
    return entityMapping[attributeType];
  }

  private getAttrStateMap(
    attributeType: 'lock' | 'window' | 'door',
    lang: string
  ): Record<'lock' | 'window' | 'door', string> {
    const stateMapping: Record<string, any> = {
      lock: StateMapping.lockAttributes(lang),
      window: StateMapping.windowAttributes(lang),
      door: StateMapping.doorAttributes(lang),
    };
    return stateMapping[attributeType] || {};
  }

  /* -------------------------------------------------------------------------- */
  /* GET ENTITIES STATE AND ATTRIBUTES                                          */
  /* -------------------------------------------------------------------------- */

  private createItemDataRow(title: string, data: EntityConfig[], key: string): TemplateResult {
    const isActive = (key: string) => this.isSubCardActive(key);

    const subCardToggleBtn = (key: string) => {
      if (key !== '') {
        return html`
          <div class="subcard-icon ${isActive(key) ? 'active' : ''}" @click=${() => this.toggleSubCard(key)}>
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </div>
        `;
      }
      return html``;
    };

    return html`
      <div class="default-card">
        <div class="data-header">
          <div @click=${() => this.toggleSubCard(key)} ?clickable=${key !== ''}>${title}</div>
          ${subCardToggleBtn(key)}
        </div>
        <div class="data-box" active=${isActive(key)}>
          ${data.map(({ key, name, icon, state }) => {
            if (state) {
              return html`
                <div class="data-row">
                  <div>
                    <ha-icon class="data-icon" .icon="${icon}"></ha-icon>
                    <span class="data-label">${name}</span>
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

  private toggleSubCard(key: string): void {
    if (key === undefined) return;
    const subCard = this._activeSubCard;
    if (key === 'warnings' && this.isOverviewDataActive()) {
      subCard.forEach((key) => subCard.delete(key));
      this.updateComplete.then(() => {
        subCard.add(key);
        this.requestUpdate();
      });
    } else {
      subCard.has(key) ? subCard.delete(key) : subCard.add(key);
      this.requestUpdate();
    }
  }

  private isSubCardActive = (key: string): boolean => {
    return key === '' ? true : this._activeSubCard.has(key);
  };

  private isOverviewDataActive(): boolean {
    return ['lock', 'window', 'door'].some((k) => this._activeSubCard.has(k));
  }

  private createDataArray(keys: EntityConfig[]): EntityConfig[] {
    return keys.map((config) => this.getEntityInfoByKey(config));
  }

  private getEntityInfoByKey = ({ key, name, icon, state, unit }: EntityConfig): EntityConfig => {
    const vehicleEntityKey = this.vehicleEntities[key];

    if (!vehicleEntityKey) {
      return this.getFallbackEntityInfo({ key, name, icon, state, unit });
    }

    const defaultInfo = this.getDefaultEntityInfo({ key, name, icon, state, unit }, vehicleEntityKey);

    const entityInfoMap = {
      soc: this.getSocInfo,
      maxSoc: this.getMaxSocInfo,
      chargingPower: this.getChargingPowerInfo,
      parkBrake: this.getParkBrakeInfo,
      windowsClosed: this.getWindowsClosedInfo,
      ignitionState: this.getIgnitionStateInfo,
      lockSensor: this.getLockSensorInfo,
      starterBatteryState: this.getStarterBatteryInfo,
    };

    const getInfoFunction = entityInfoMap[key];

    if (getInfoFunction) {
      return getInfoFunction(defaultInfo, vehicleEntityKey);
    } else {
      return this.getWarningOrDefaultInfo(defaultInfo, key, vehicleEntityKey);
    }
  };

  /* --------------------------- ENTITY INFO BY KEYS -------------------------- */

  private getFallbackEntityInfo = ({ key, name, icon, state, unit }: EntityConfig): EntityConfig => {
    const lang = this.userLang;

    let newState = state;
    let activeState: boolean = false;

    switch (key) {
      case 'selectedProgram':
        newState =
          StateMapping.chargeSelectedProgram(lang)[
            this.getEntityAttribute(this.vehicleEntities.rangeElectric?.entity_id, 'selectedChargeProgram')
          ];
        break;

      case 'doorStatusOverall':
        const doorStatus = this.getDoorStatusInfo();
        newState = doorStatus.state;
        activeState = doorStatus.active;
        break;

      case 'drivenTimeReset':
      case 'drivenTimeStart':
        const entityKey = key === 'drivenTimeReset' ? 'distanceReset' : 'distanceStart';
        const timeState = this.getEntityAttribute(this.vehicleEntities[entityKey]?.entity_id, key);
        newState = timeState ? convertMinutes(parseInt(timeState)) : '';
        break;

      case 'drivenTimeZEReset':
      case 'drivenTimeZEStart':
        const zeKey = key === 'drivenTimeZEReset' ? 'distanceZEReset' : 'distanceZEStart';
        const zeTime = this.getEntityAttribute(this.vehicleEntities[zeKey]?.entity_id, key);
        newState = zeTime ? convertMinutes(parseInt(zeTime)) : '';
        break;
    }

    return { key, name, icon, state: newState, active: activeState, unit };
  };

  private getDefaultEntityInfo = (
    { key, name, icon, state, unit }: EntityConfig,
    vehicleEntity: VehicleEntity
  ): EntityConfig => {
    return {
      key,
      name: name ?? vehicleEntity.original_name,
      icon: icon ?? this.getEntityAttribute(vehicleEntity.entity_id, 'icon'),
      state: state ?? this.getStateDisplay(vehicleEntity.entity_id),
      unit: unit ?? this.getEntityAttribute(vehicleEntity.entity_id, 'unit_of_measurement'),
    };
  };

  private getSocInfo = (defaultInfo: EntityConfig, vehicleEntity: VehicleEntity): EntityConfig => {
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

  private getMaxSocInfo = (defaultInfo: EntityConfig, vehicleEntity: VehicleEntity): EntityConfig => {
    const maxSocState = this.getEntityState(vehicleEntity.entity_id);
    const maxSocStateValue = maxSocState ? parseFloat(maxSocState) : 0;
    const iconValue = Math.round(maxSocStateValue / 10) * 10;
    const maxSocIcon = `mdi:battery-charging-${iconValue}`;

    return { ...defaultInfo, icon: maxSocIcon };
  };

  private getChargingPowerInfo = (defaultInfo: EntityConfig, vehicleEntity: VehicleEntity): EntityConfig => {
    const powerStateDislay = this.getStateDisplay(vehicleEntity.entity_id);

    return { ...defaultInfo, state: powerStateDislay };
  };

  private getParkBrakeInfo = (defaultInfo: EntityConfig, vehicleEntity: VehicleEntity): EntityConfig => {
    const parkBrakeState = this.getBooleanState(vehicleEntity.entity_id);
    const entityState = parkBrakeState
      ? this.localize('card.common.stateParkBrakeOn')
      : this.localize('card.common.stateParkBrakeOff');
    return {
      ...defaultInfo,
      state: entityState,
      active: parkBrakeState,
    };
  };

  private getDoorStatusInfo = (): { state: string; active: boolean } => {
    let doorStatusOverall: string;
    const lang = this.userLang;
    const doorState = this.getEntityAttribute(this.vehicleEntities.lockSensor?.entity_id, 'doorStatusOverall');
    const chargeFlapDCStatus = this.getEntityState(this.vehicleEntities.chargeFlapDCStatus?.entity_id);

    let closed = chargeFlapDCStatus === '1' && doorState === '1';

    if (closed) {
      doorStatusOverall = this.localize('card.common.stateClosed');
    } else {
      const doorAttributeStates: Record<string, any> = {};
      Object.keys(StateMapping.doorAttributes(lang)).forEach((attribute) => {
        if (attribute === 'chargeflapdcstatus' && this.vehicleEntities.chargeFlapDCStatus?.entity_id !== undefined) {
          doorAttributeStates[attribute] = this.getEntityState(this.vehicleEntities.chargeFlapDCStatus.entity_id);
        } else {
          doorAttributeStates[attribute] = this.getEntityAttribute(
            this.vehicleEntities.lockSensor.entity_id,
            attribute
          );
        }
      });
      const openDoors = Object.keys(doorAttributeStates).filter(
        (attribute) => doorAttributeStates[attribute] === '0' || doorAttributeStates[attribute] === true
      ).length;
      if (openDoors === 0) {
        closed = true;
        doorStatusOverall = this.localize('card.common.stateClosed');
      } else {
        doorStatusOverall = `${openDoors} ${this.localize('card.common.stateOpen')}`;
      }
    }

    return {
      state: doorStatusOverall,
      active: closed,
    };
  };

  private getWindowsClosedInfo = (defaultInfo: EntityConfig, vehicleEntity: VehicleEntity): EntityConfig => {
    let windowStateOverall: string;
    const lang = this.userLang;
    const sunroofStatus = this.getEntityState(this.vehicleEntities.sunroofStatus?.entity_id);
    const windowsState = this.getBooleanState(vehicleEntity.entity_id);
    let closed = sunroofStatus === '0' && windowsState;

    if (closed) {
      windowStateOverall = this.localize('card.common.stateClosed');
    } else {
      const windowAttributeStates: Record<string, any> = {};

      Object.keys(StateMapping.windowAttributes(lang)).forEach((attribute) => {
        let attributeState: string | boolean | null | undefined;
        if (attribute === 'sunroofstatus' && this.vehicleEntities.sunroofStatus?.entity_id !== undefined) {
          attributeState = this.getEntityState(this.vehicleEntities.sunroofStatus.entity_id) === '1' ? true : false;
        } else {
          attributeState = this.getEntityAttribute(vehicleEntity.entity_id, attribute);
        }

        if (attributeState !== undefined && attributeState !== null) {
          windowAttributeStates[attribute] = attributeState;
        }
      });

      const openWindows = Object.keys(windowAttributeStates).filter(
        (attribute) => windowAttributeStates[attribute] === '0' || windowAttributeStates[attribute] === true
      ).length;

      if (openWindows === 0) {
        closed = true;
        windowStateOverall = this.localize('card.common.stateClosed');
      } else {
        windowStateOverall = `${openWindows} ${this.localize('card.common.stateOpen')}`;
      }
    }
    return {
      ...defaultInfo,
      state: windowStateOverall,
      active: closed,
    };
  };

  private getIgnitionStateInfo = (defaultInfo: EntityConfig, vehicleEntity: VehicleEntity): EntityConfig => {
    const realState = this.getEntityState(vehicleEntity.entity_id);
    const stateStr = StateMapping.ignitionState(this.userLang)[realState] || this.localize('card.common.stateUnknown');
    const activeState = realState === '0' || realState === '1' ? true : false;
    return {
      ...defaultInfo,
      state: stateStr,
      active: activeState,
    };
  };

  private getLockSensorInfo = (defaultInfo: EntityConfig, vehicleEntity: VehicleEntity): EntityConfig => {
    const lang = this.userLang;
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

  private getStarterBatteryInfo = (defaultInfo: EntityConfig, vehicleEntity: VehicleEntity): EntityConfig => {
    const lang = this.userLang;
    const stateValue = this.getEntityState(vehicleEntity.entity_id);
    const stateFormated = StateMapping.starterBattery(lang)[stateValue] || 'Unknown';

    return {
      ...defaultInfo,
      state: stateFormated,
    };
  };

  private getWarningOrDefaultInfo = (
    defaultInfo: EntityConfig,
    key: string,
    vehicleEntity: VehicleEntity
  ): EntityConfig => {
    if (this.DataKeys.vehicleWarnings.map((key) => key.key).includes(key)) {
      const warningState = this.getBooleanState(vehicleEntity.entity_id);

      return {
        ...defaultInfo,
        state: warningState ? 'Problem' : 'OK',
        active: warningState ? true : false,
      };
    }
    return defaultInfo;
  };

  /* --------------------- GET ENTITY STATE AND ATTRIBUTES -------------------- */

  private getDeviceTrackerLatLong = (): { lat: number; lon: number } | undefined => {
    if (!this.config.device_tracker) return;
    const deviceTracker = this._hass.states[this.config.device_tracker];
    if (!deviceTracker) return;
    const lat = deviceTracker.attributes.latitude;
    const lon = deviceTracker.attributes.longitude;
    return { lat, lon };
  };

  public getStateDisplay(entityId: string | undefined): string {
    if (!entityId || !this._hass.states[entityId]) return '';
    return this._hass.formatEntityState(this._hass.states[entityId]);
  }

  public getSecondaryInfo(cardType: string): string {
    const { odometer, lockSensor, ecoScoreBonusRange } = this.vehicleEntities;

    switch (cardType) {
      case 'tripCards':
        return this.getStateDisplay(odometer?.entity_id);

      case 'vehicleCards':
        const lang = this.userLang;
        const lockState = this.getEntityState(lockSensor?.entity_id);
        const realState = StateMapping.lockStates(lang)[lockState] || StateMapping.lockStates['4'];

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
    if (!entity || !this._hass.states[entity]) return false;
    return this._hass.states[entity].state === 'on';
  }

  private getEntityState(entity: string | undefined): string {
    if (!entity || !this._hass.states[entity]) return '';
    return this._hass.states[entity].state;
  }

  private getEntityAttribute(entity: string | undefined, attribute: string) {
    if (!entity || !this._hass.states[entity] || !this._hass.states[entity].attributes) return undefined;
    return this._hass.states[entity].attributes[attribute];
  }

  public getFormattedAttributeState(entity: string | undefined, attribute: string): string {
    if (!entity || !this._hass.states[entity] || !this._hass.states[entity].attributes) return '';
    return this._hass.formatEntityAttributeValue(this._hass.states[entity], attribute);
  }

  private toggleMoreInfo(entity: string): void {
    fireEvent(this, 'hass-more-info', { entityId: entity });
  }

  private getMinMaxTyrePressure = (): string => {
    const pressuresWithUnits = this.DataKeys.tyrePressures.map((key) => ({
      pressure: this.getEntityState(this.vehicleEntities[key.key]?.entity_id) || '',
      unit: this.getEntityAttribute(this.vehicleEntities[key.key]?.entity_id, 'unit_of_measurement'),
    }));

    // Find the minimum and maximum pressures
    const minPressure = Math.min(...pressuresWithUnits.map(({ pressure }) => parseFloat(pressure)));
    const maxPressure = Math.max(...pressuresWithUnits.map(({ pressure }) => parseFloat(pressure)));

    // Format the minimum and maximum pressures with their original units
    const tireUnit = pressuresWithUnits[0]?.unit || '';
    const formattedMinPressure = minPressure % 1 === 0 ? minPressure.toFixed(0) : minPressure.toFixed(1);
    const formattedMaxPressure = maxPressure % 1 === 0 ? maxPressure.toFixed(0) : maxPressure.toFixed(1);
    return `${formattedMinPressure} - ${formattedMaxPressure} ${tireUnit}`;
  };

  public getErrorNotify(cardType: string): boolean {
    const { vehicleEntities } = this;
    switch (cardType) {
      case 'vehicleCards':
        const warnKeys = [
          ...this.DataKeys.vehicleWarnings.map((key) => key.key).filter((key) => key !== 'tirePressureWarning'),
        ];
        const hasWarning = warnKeys.some((key) => this.getBooleanState(vehicleEntities[key]?.entity_id));
        return hasWarning;
      case 'tyreCards':
        return this.getBooleanState(vehicleEntities.tirePressureWarning?.entity_id);
      default:
        return false;
    }
  }

  private applyMarquee() {
    this.updateComplete.then(() => {
      const items = this.shadowRoot?.querySelectorAll('.primary') as NodeListOf<HTMLElement>;
      if (!items) return;
      items.forEach((item) => {
        const itemText = item.querySelector('span');
        if (item.scrollWidth > item.clientWidth) {
          item.classList.add('title-wrap');
          itemText?.classList.add('marquee');
          setTimeout(() => {
            itemText?.classList.remove('marquee');
            item.classList.remove('title-wrap');
          }, 18000);
        } else {
          item.classList.remove('title-wrap');
          itemText?.classList.remove('marquee');
        }
      });
    });
  }

  /* ----------------------------- EVENTS HANDLERS ---------------------------- */

  private handleEditorEvents(e: Event): void {
    e.stopPropagation();
    if (!this.isEditorPreview) return;

    const actionType = (e as CustomEvent).detail;

    switch (true) {
      case actionType.startsWith('btn_'):
        const btnType = actionType.replace('btn_', '');
        this.updateComplete.then(() => {
          this.vehicleButtons?.showCustomBtnEditor(btnType);
        });
        break;

      case actionType.startsWith('toggle_preview_'):
        console.log('toggle_preview_', actionType);
        const preview = actionType.replace('toggle_preview_', '');
        this._currentPreviewType = preview;
        this.updateComplete.then(() => {
          this._configurePreview(preview);
        });
        break;

      default:
        break;
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
    // console.log('mansory', this.getGridRowSize());
    return 5;
  }

  public getLayoutOptions() {
    const gridRowSize = this.getGridRowSize();
    return {
      grid_min_rows: gridRowSize,
      grid_columns: 4,
      grid_min_columns: 4,
    };
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
    BenzCard: VehicleCard;
  }
  interface HTMLElementTagNameMap {
    'vehicle-info-card': VehicleCard;
  }
}
