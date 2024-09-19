/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, PropertyValues, CSSResultGroup, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators';
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
  LovelaceCard,
} from 'custom-card-helpers';

// Custom Types and Constants
import {
  HomeAssistantExtended as HomeAssistant,
  VehicleCardConfig,
  EntityConfig,
  VehicleEntities,
  EcoData,
  ButtonConfigItem,
  CardTypeConfig,
  CustomButtonEntity,
} from './types';

import * as StateMapping from './const/state-mapping';
import * as DataKeys from './const/data-keys';

import { AttributeType, SubcardVisibilityProperties, cardTypes } from './const/data-keys';
// Styles and Assets
import { amgBlack, amgWhite, tyreBg, logoLoading } from './const/imgconst';
import styles from './css/styles.css';

// Components
import './components/map-card';
import './components/header-slide';
import './components/eco-chart';
import './components/remote-control';
import './components/vehicle-buttons';

// Functions
import { localize } from './localize/localize';
import { formatTimestamp, convertMinutes } from './utils/helpers';
import {
  setupCardListeners,
  handleCardFirstUpdated,
  getTemplateValue,
  getBooleanTemplate,
  defaultConfig,
  getCarEntity,
} from './utils/ha-helpers';

const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;

@customElement('vehicle-info-card')
export class VehicleCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('vehicle-info-card-editor');
  }

  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ type: Object }) private config!: VehicleCardConfig;
  @property({ type: Boolean }) public editMode = false;
  @property({ type: Boolean }) public preview = false;
  @property({ type: Boolean }) loading = true;
  @property({ type: Boolean }) isBtnPreview: boolean = false;
  @property({ type: Boolean }) isCardPreview: boolean = false;

  @state() private baseCardTypes: CardTypeConfig[] = [];
  @state() private additionalCards: { [key: string]: LovelaceCardConfig[] } = {};
  @state() private customButtons: { [key: string]: CustomButtonEntity } = {};

  @state() private vehicleEntities: VehicleEntities = {};
  @state() private activeCardType: string | null = null;
  @state() private ecoScoresVisible!: boolean;
  @state() private lockAttributesVisible!: boolean;
  @state() private windowAttributesVisible!: boolean;
  @state() private doorsAttributesVisible!: boolean;
  @state() private chargingInfoVisible!: boolean;
  @state() private tripFromStartVisible!: boolean;
  @state() private tripFromResetVisible!: boolean;

  @state() private isTyreHorizontal!: boolean;
  @state() private selectedLanguage: string = 'en';
  @state() public _entityNotFound: boolean = false;

  @state() private _cardPreview: LovelaceCardConfig[] = [];
  @state() private _previewTemplateValues: Partial<CustomButtonEntity> = {};

  @query('vehicle-buttons') private vehicleButtons!: any;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this.additionalCards) {
      // console.log('setting hass on subcards');
      Object.keys(this.additionalCards).forEach((key) => {
        this.additionalCards[key].forEach((card) => {
          card.hass = hass;
        });
      });
      // console.log('setting hass on subcards done');
    }
  }

  constructor() {
    super();
    this.handleEditorEvents = this.handleEditorEvents.bind(this);
    SubcardVisibilityProperties.forEach((prop) => {
      (this as any)[prop] = false;
    });
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
    await handleCardFirstUpdated(this, _changedProperties);
    this.getBaseCardTypes();
    this._configureButtonPreviews();
    this._configureCardPreviews();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (
      changedProps.has('activeCardType') &&
      this.activeCardType !== 'mapDialog' &&
      this.activeCardType !== null &&
      !this.editMode
    ) {
      const cardElement = this.shadowRoot?.querySelector('.card-element');
      if (cardElement) {
        setupCardListeners(cardElement, this.toggleCard.bind(this));
      }
    }

    if ((!this.activeCardType && this.isCharging) || !this.isCharging) {
      this.toggleCharginAnimation();
    }

    // if (changedProps.has('_hass') && this.config.added_cards) {
    //   this.configureAddedCards();
    // }

    if (!this.editMode || !this.preview) {
      this.isBtnPreview = false;
      this.isCardPreview = false;
    }
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(_changedProps: PropertyValues): boolean {
    if (!this.config || !this._hass) {
      console.log('config or hass is null');
      return false;
    }

    if (_changedProps.has('activeCardType') && !this.activeCardType && !this.editMode) {
      this.applyMarquee();
      this.hideAllSubCards();
    }

    if (_changedProps.has('config') && this.config.selected_theme?.theme !== 'default') {
      this.applyTheme(this.config.selected_theme.theme);
    }

    if (_changedProps.has('config') && this.isBtnPreview) {
      this._configureButtonPreviews();
    }

    if (_changedProps.has('config') && this.isCardPreview) {
      this._configureCardPreviews();
    }

    if (_changedProps.has('_hass') && this.config.added_cards) {
      this.configureAddedCards();
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
        this.loading = false;
      }, 2000);
    } else {
      this.loading = false;
    }
    this.applyMarquee();
  }

  disconnectedCallback(): void {
    if (process.env.ROLLUP_WATCH === 'true' && window.BenzCard === this) {
      window.BenzCard = undefined;
    }
    window.removeEventListener('editor-event', this.handleEditorEvents);
    super.disconnectedCallback();
  }

  private async getBaseCardTypes(): Promise<void> {
    const baseCardTypes = cardTypes(this.selectedLanguage);
    if (this.config.added_cards && Object.keys(this.config.added_cards).length > 0) {
      Object.keys(this.config.added_cards).map((key) => {
        const card = this.config.added_cards[key];
        if (card.button) {
          baseCardTypes.push({
            type: key,
            name: card.button.primary,
            icon: card.button.icon,
            config: key,
            button: key,
          });
        }
      });
    }
    this.baseCardTypes = baseCardTypes;
    this.createMapDialog();
    await this.configureCustomButtonCards();
    await this.configureAddedCards();
  }

  private createMapDialog(): void {
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
      this.createCards(haMapConfig, 'mapDialog');
    }
  }

  private async configureCustomButtonCards(): Promise<void> {
    for (const cardType of this.baseCardTypes) {
      if (this.config[cardType.config]) {
        this.createCards(this.config[cardType.config], cardType.type);
        console.log('Configuring custom cards', cardType.type);
      }

      if (this.config[cardType.button] && this.config[cardType.button].enabled) {
        await this.createCustomButtons(this.config[cardType.button], cardType.button);
        console.log('Configuring custom buttons', cardType.button);
      }
    }
  }

  private async configureAddedCards(): Promise<void> {
    for (const cardType of this.baseCardTypes) {
      if (this.config.added_cards && this.config.added_cards[cardType.type]) {
        const { cards, button } = this.config.added_cards[cardType.type];
        if (cards && cards.length > 0) {
          this.createCards(cards, cardType.type);
          // console.log('Configuring added cards', cardType.type);
        }
        if (button) {
          this.customButtons[cardType.type] = await this.createCustomButtons(button, cardType.type);
          console.log('Configuring added buttons', cardType.type);
        }
      }
    }
    this.requestUpdate();
  }

  private async _configureButtonPreviews(): Promise<void> {
    if (
      this.config.btn_preview !== undefined &&
      this.config.btn_preview !== null &&
      this.config.btn_preview &&
      this.isEditorPreview
    ) {
      const buttonConfig = this.config?.btn_preview;
      if (!buttonConfig) return;
      const btnPreview = await this.createCustomButtons(buttonConfig);
      if (!btnPreview) return;
      this._previewTemplateValues = btnPreview;
      this.isBtnPreview = true;
      this.requestUpdate();
    } else {
      this._previewTemplateValues = {};
      this.isBtnPreview = false;
    }

    return;
  }

  private async _configureCardPreviews(): Promise<void> {
    if (
      this.config.card_preview !== undefined &&
      this.config.card_preview !== null &&
      this.config.card_preview &&
      this.isEditorPreview
    ) {
      const cardConfig = this.config?.card_preview;
      if (!cardConfig) return;
      const cardElement = await this.createCards(cardConfig);
      if (!cardElement) return;
      this._cardPreview = cardElement;
      this.isCardPreview = true;
      this.requestUpdate();
    } else {
      this._cardPreview = [];
      this.isCardPreview = false;
    }
    return;
  }

  private async createCards(cardConfigs: LovelaceCardConfig[], stateProperty?: string): Promise<LovelaceCardConfig[]> {
    if (!cardConfigs) {
      return [];
    }
    console.log('Creating cards', stateProperty);
    let helpers;
    if ((window as any).loadCardHelpers) {
      helpers = await (window as any).loadCardHelpers();
    } else if (HELPERS) {
      helpers = HELPERS;
    }

    // Check if helpers were loaded and if createCardElement exists
    if (!helpers || !helpers.createCardElement) {
      console.error('Card helpers or createCardElement not available.');
      return [];
    }

    const cards = await Promise.all(
      cardConfigs.map(async (cardConfig) => {
        try {
          const element = await helpers.createCardElement(cardConfig);
          element.hass = this._hass;
          return element;
        } catch (error) {
          console.error('Error creating card element: ', error);
          return null;
        }
      })
    );

    if (cards.length > 0 && stateProperty) {
      this.additionalCards[stateProperty] = cards;
      console.log('Additional cards', this.additionalCards);
    }
    return cards;
  }

  private localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this.selectedLanguage, search, replace);
  };

  private isAddedCard(cardType: string): boolean {
    return this.config.added_cards?.hasOwnProperty(cardType);
  }

  private get isCharging(): boolean {
    const chargingActive = this.getEntityAttribute(this.vehicleEntities.rangeElectric?.entity_id, 'chargingactive');
    return Boolean(chargingActive);
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
    return this._hass.themes.darkMode;
  }

  private get isEditorPreview(): boolean {
    const parentElementClassPreview = this.offsetParent?.classList.contains('element-preview');
    return parentElementClassPreview || false;
  }

  // https://lit.dev/docs/components/styles/
  public static get styles(): CSSResultGroup {
    return styles;
  }

  private async createCustomButtons(
    buttonConfigs: ButtonConfigItem,
    stateProperty?: string
  ): Promise<CustomButtonEntity> {
    const { primary, secondary, icon, notify } = buttonConfigs;
    const [secondaryValue, notifyValue] = await Promise.all([
      this._getSecondaryValue(secondary),
      this._getNotifyValue(notify),
    ]);

    const customButton: CustomButtonEntity = {
      enabled: true,
      hide: false,
      primary: primary,
      secondary: secondaryValue,
      icon: icon,
      notify: notifyValue,
    };

    if (stateProperty) {
      this.customButtons[stateProperty] = customButton;
    }

    return customButton;
  }

  private async _getNotifyValue(notify: string): Promise<boolean> {
    return await getBooleanTemplate(this._hass, notify);
  }

  private async _getSecondaryValue(secondary: string): Promise<string> {
    if (!secondary) {
      return '';
    }
    if (secondary.includes('{{')) {
      return await getTemplateValue(this._hass, secondary);
    }
    return secondary;
  }

  private toggleCharginAnimation(): void {
    const eletricBar = this.shadowRoot?.querySelector('.fuel-level-bar.electric') as HTMLElement;

    if (this.isCharging && eletricBar && !eletricBar.classList.contains('show-after')) {
      eletricBar.classList.add('show-after');
    } else if (!this.isCharging && eletricBar && eletricBar.classList.contains('show-after')) {
      eletricBar.classList.remove('show-after');
    }
  }

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

    if (this.loading) {
      return this._renderLoading();
    }

    if (this.isBtnPreview) {
      return this._renderBtnPreview(this._previewTemplateValues as CustomButtonEntity);
    }

    if (this.isCardPreview) {
      return html`<ha-card class="preview-card">${this._cardPreview}</ha-card>`;
    }

    const name = this.config.name || '';
    return html`
      <ha-card class="${this.computeClasses()} main-card">
        ${this._renderHeaderBackground()}
        <header>
          <h1>${name}</h1>
        </header>
        ${this.activeCardType ? this._renderCustomCard() : this._renderMainCard()}
      </ha-card>
    `;
  }

  // Render loading template
  private _renderLoading(): TemplateResult {
    const cardHeight = this.getGridRowSize() * 56;
    return html`
      <ha-card>
        <div class="loading-image" style="height: ${cardHeight}px">
          <img src="${logoLoading}" alt="Loading" />
        </div>
      </ha-card>
    `;
  }

  private _renderBtnPreview(btn: CustomButtonEntity): TemplateResult {
    const { primary, icon, secondary, notify } = btn;
    return html`
      <ha-card class="preview-card">
        <div class="grid-item">
          <div class="item-icon">
            <div class="icon-background"><ha-icon .icon="${icon}"></ha-icon></div>
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
      getEntityInfo(this.vehicleEntities[entity]?.entity_id)
    );

    const renderInfoBox = (icon: string, state: number, fuelInfo: string, rangeInfo: string, eletric: boolean) => html`
      <div class="info-box range">
        <div class="item">
          <ha-icon icon="${icon}"></ha-icon>
          <div><span>${fuelInfo}</span></div>
        </div>
        <div class="fuel-wrapper">
          <div class="fuel-level-bar ${eletric ? 'electric ' : ''}" style="--vic-range-width: ${state}%;"></div>
        </div>
        <div class="item">
          <span>${rangeInfo}</span>
        </div>
      </div>
    `;

    const renderBothInfoBoxes = () =>
      html` <div class="combined-info-box">
        ${fuelInfo && rangeLiquidInfo
          ? renderInfoBox(
              'mdi:gas-station',
              fuelInfo.state!,
              fuelInfo.stateDisplay!,
              rangeLiquidInfo.stateDisplay!,
              false
            )
          : ''}
        ${socInfo && rangeElectricInfo
          ? renderInfoBox(
              'mdi:ev-station',
              socInfo.state!,
              socInfo.stateDisplay!,
              rangeElectricInfo.stateDisplay!,
              true
            )
          : ''}
      </div>`;

    if (rangeLiquidInfo && fuelInfo && rangeElectricInfo && socInfo) {
      return renderBothInfoBoxes();
    } else if (rangeLiquidInfo && fuelInfo) {
      return renderInfoBox(
        'mdi:gas-station',
        fuelInfo.state!,
        fuelInfo.stateDisplay!,
        rangeLiquidInfo.stateDisplay!,
        false
      );
    } else if (rangeElectricInfo && socInfo) {
      return renderInfoBox(
        'mdi:ev-station',
        socInfo.state!,
        socInfo.stateDisplay!,
        rangeElectricInfo.stateDisplay!,
        true
      );
    } else {
      return undefined;
    }
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
    const deviceTracker = this.getDeviceTrackerLatLong();
    const google_api_key = config.google_api_key;
    const darkMode = this.isDark;
    const mapPopup = config.enable_map_popup;
    return html`
      <div id="map-box">
        <vehicle-map
          .deviceTracker=${deviceTracker}
          .darkMode=${darkMode}
          .apiKey=${google_api_key || ''}
          .mapPopup=${mapPopup}
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
    if (!this.config.show_buttons) return html``;

    // Filter out the base card types that have `hide: true`
    const baseCardTypes = this.baseCardTypes
      .filter((cardType) => {
        const isAddedCard = this.isAddedCard(cardType.type);
        if (isAddedCard) {
          return !this.config.added_cards[cardType.type]?.button?.hide;
        } else {
          return !this.config[cardType.button]?.hide;
        }
      })
      .map((cardType) => cardType);

    return html` <vehicle-buttons .component=${this} .buttons=${baseCardTypes}></vehicle-buttons> `;
  }

  private _renderCustomCard(): TemplateResult {
    if (!this.activeCardType) return html``;

    const addedCustomCard = {};
    const addedCards = this.config?.added_cards;
    if (addedCards && Object.keys(addedCards).length > 0) {
      Object.keys(addedCards).map((key) => {
        const card = addedCards[key];
        if (card.cards && card.cards.length > 0) {
          addedCustomCard[key] = {
            config: card.cards,
            defaultRender: () => this.additionalCards[key],
          };
        } else {
          addedCustomCard[key] = {
            defaultRender: () => this._showWarning('No cards provided.'),
          };
        }
      });
    }

    const cardConfigMap = {
      tripCards: {
        use_card: this.config.use_custom_cards?.trip_card,
        config: this.config.trip_card,
        defaultRender: this._renderDefaultTripCard.bind(this),
      },
      vehicleCards: {
        use_card: this.config.use_custom_cards?.vehicle_card,
        config: this.config.vehicle_card,
        defaultRender: this._renderDefaultVehicleCard.bind(this),
      },
      ecoCards: {
        use_card: this.config.use_custom_cards?.eco_card,
        config: this.config.eco_card,
        defaultRender: this._renderDefaultEcoCard.bind(this),
      },
      tyreCards: {
        use_card: this.config.use_custom_cards?.tyre_card,
        config: this.config.tyre_card,
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
      ...addedCustomCard,
    };

    const cardInfo = cardConfigMap[this.activeCardType];

    if (!cardInfo) {
      return html``;
    }

    const isDefaultCard = !cardInfo.use_card || !cardInfo.config || cardInfo.config.length === 0;
    const cards = isDefaultCard ? cardInfo.defaultRender() : this.additionalCards[this.activeCardType];

    const lastCarUpdate = this.config.entity ? this._hass.states[this.config.entity].last_changed : '';
    const hassLocale = this._hass.locale;
    hassLocale.language = this.selectedLanguage;

    const formattedDate = hassLocale
      ? formatDateTime(new Date(lastCarUpdate), hassLocale)
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
        <section class="card-element">${cards}</section>
        ${isDefaultCard
          ? html`<div class="last-update">
              <span>${this.localize('card.common.lastUpdate')}: ${formattedDate}</span>
            </div>`
          : ''}
      </main>
    `;
  }

  private _renderDefaultTripCard(): TemplateResult | void {
    const lang = this.selectedLanguage;
    const sections = [
      {
        title: this.localize('card.tripCard.overview'),
        data: this.createDataArray(DataKeys.tripOverview(lang)),
        active: true,
        key: 'tripOverview',
      },
      {
        title: this.localize('card.tripCard.fromStart'),
        data: this.createDataArray(DataKeys.tripFromStart(lang)),
        active: this.getSubCardVisible('fromStart'),
        key: 'fromStart',
      },
      {
        title: this.localize('card.tripCard.fromReset'),
        data: this.createDataArray(DataKeys.tripFromReset(lang)),
        active: this.getSubCardVisible('fromReset'),
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
        <div class="data-header">${this.localize('card.vehicleCard.vehicleStatus')}</div>
        <div class="data-box">${this._renderOverviewDataWithSubCard()}</div>
      </div>
      <div class="default-card" .hidden=${subCardVisible}>
        <div class="data-header">${this.localize('card.vehicleCard.vehicleWarnings')}</div>
        <div class="data-box">
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
    const lang = this.selectedLanguage;
    const ecoData = this.createDataArray(DataKeys.ecoScores(lang));

    return html`<div class="default-card">
        <div class="data-header">${this.localize('card.ecoCard.ecoDisplay')}</div>
        <div class="data-box">${this._renderEcoChart()}</div>
      </div>
      ${this.createItemDataRow(this.localize('card.ecoCard.ecoScore'), ecoData, this.ecoScoresVisible, 'ecoScores')}`;
  }

  private _renderDefaultTyreCard(): TemplateResult {
    const lang = this.selectedLanguage;
    const isPressureWarning = this.getBooleanState(this.vehicleEntities.tirePressureWarning?.entity_id);

    const tireCardTitle = this.localize('card.tyreCard.tyrePressure');
    const tireWarningProblem = this.localize('card.tyreCard.tireWarningProblem');
    const tireWarningOk = this.localize('card.tyreCard.tireWarningOk');

    const tyreInfo = isPressureWarning ? tireWarningProblem : tireWarningOk;
    const infoClass = isPressureWarning ? 'warning' : '';

    const isHorizontal = this.isTyreHorizontal ? 'rotated' : '';
    const toggleHorizontal = () => {
      this.isTyreHorizontal = !this.isTyreHorizontal;
    };

    return html`
      <div class="default-card">
        <div class="data-header">${tireCardTitle}</div>
        <div class="tyre-toggle-btn click-shrink" @click=${toggleHorizontal}>
          <ha-icon icon="mdi:rotate-right-variant"></ha-icon>
        </div>
        <div class="data-box tyre-wrapper ${isHorizontal}">
          <div class="background" style="background-image: url(${tyreBg})"></div>
          ${DataKeys.tyrePressures(lang).map(
            (tyre) =>
              html` <div class="tyre-box ${isHorizontal} ${tyre.key.replace('tirePressure', '').toLowerCase()}">
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

  private _renderServiceControl(): TemplateResult | void {
    const hass = this._hass;
    const serviceControl = this.config.services;
    const carVin = this.carVinNumber;
    const carLockEntity = this.vehicleEntities.lock?.entity_id;
    const selectedLanguage = this.selectedLanguage;
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

  private computeClasses() {
    return classMap({
      '--dark': this.isDark && this.config.selected_theme?.theme === 'Default',
    });
  }

  private applyTheme(theme: string): void {
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
  }

  /* -------------------------------------------------------------------------- */
  /* ADDED CARD FUNCTIONALITY                                                   */
  /* -------------------------------------------------------------------------- */

  private toggleCard(action?: 'next' | 'prev' | 'close'): void {
    forwardHaptic('light');
    const cardElement = this.shadowRoot?.querySelector('.card-element') as HTMLElement;
    if (!this.activeCardType || !cardElement) return;
    const baseCardTypes = this.baseCardTypes;

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
    const overViewData = this.createDataArray(DataKeys.vehicleOverview(this.selectedLanguage));

    // Map to handle the visibility and rendering of subcards
    const subCardMapping = {
      lockSensor: {
        visible: this.lockAttributesVisible,
        toggleVisibility: () => (this.lockAttributesVisible = !this.lockAttributesVisible),
        renderSubCard: () => this._renderSubCard('lock'),
      },
      windowsClosed: {
        visible: this.windowAttributesVisible,
        toggleVisibility: () => (this.windowAttributesVisible = !this.windowAttributesVisible),
        renderSubCard: () => this._renderSubCard('window'),
      },
      doorStatusOverall: {
        visible: this.doorsAttributesVisible,
        toggleVisibility: () => (this.doorsAttributesVisible = !this.doorsAttributesVisible),
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
              <div class="data-value-unit" @click=${subCard?.toggleVisibility || (() => {})}>
                <span class=${!active ? 'warning' : ''} style="text-transform: capitalize;">${state}</span>
                ${subCard
                  ? html`
                      <ha-icon class="subcard-icon ${subCard.visible ? 'active' : ''}" icon="mdi:chevron-down">
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
    const lang = this.selectedLanguage;
    const state: Record<string, any> = {};
    const entityID = this.getEntityTypeId(attributeType);
    const stateMapping = this.getAttrStateMap(attributeType, lang);
    const attributesVisible = this.getSubCardVisible(attributeType);
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
            let classState;
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

  private getEntityTypeId(attributeType: AttributeType): string | undefined {
    const entityMapping: Record<string, string | undefined> = {
      lock: this.vehicleEntities.lockSensor?.entity_id,
      window: this.vehicleEntities.windowsClosed?.entity_id,
      door: this.vehicleEntities.lockSensor?.entity_id,
    };
    return entityMapping[attributeType];
  }

  private getAttrStateMap(attributeType: AttributeType, lang: string): Record<AttributeType, any> {
    const stateMapping: Record<string, any> = {
      lock: StateMapping.lockAttributes(lang),
      window: StateMapping.windowAttributes(lang),
      door: StateMapping.doorAttributes(lang),
    };
    return stateMapping[attributeType] ?? {};
  }

  private getSubCardVisible(attributeType: AttributeType): boolean {
    const visibilityMap: Record<AttributeType, boolean> = {
      lock: this.lockAttributesVisible,
      window: this.windowAttributesVisible,
      door: this.doorsAttributesVisible,
      fromStart: this.tripFromStartVisible,
      fromReset: this.tripFromResetVisible,
    };

    return visibilityMap[attributeType] ?? false;
  }

  private isSubCardVisible(): boolean {
    return SubcardVisibilityProperties.some((state) => (this as any)[state]);
  }

  private hideAllSubCards(): void {
    if (!this.isSubCardVisible()) return;
    SubcardVisibilityProperties.forEach((prop) => {
      (this as any)[prop] = false;
    });
    console.log('hideAllSubCards');
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
      } else {
        this.ecoScoresVisible = !this.ecoScoresVisible;
      }
    };

    const subCardToggleBtn = (key: string) => {
      if (key === 'fromStart' || key === 'fromReset' || key === 'ecoScores') {
        return html`
          <div class="subcard-icon ${active ? 'active' : ''}" @click=${() => toggleSubTripCard(key)}>
            <ha-icon icon="mdi:chevron-down"></ha-icon>
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
    const lang = this.selectedLanguage;

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

    const powerStateDecimals = formatNumber(powerStateValue, this._hass.locale);
    const powerStateDislay = powerStateDecimals + ' ' + powerStateUnit;

    return { ...defaultInfo, state: powerStateDislay };
  };

  private getParkBrakeInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
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
    const lang = this.selectedLanguage;
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

  private getWindowsClosedInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    let windowStateOverall: string;
    const lang = this.selectedLanguage;
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

  private getIgnitionStateInfo = (defaultInfo: EntityConfig, vehicleEntity: any): EntityConfig => {
    const realState = this.getEntityState(vehicleEntity.entity_id);
    const stateStr =
      StateMapping.ignitionState(this.selectedLanguage)[realState] || this.localize('card.common.stateUnknown');
    const activeState = realState === '0' || realState === '1' ? true : false;
    return {
      ...defaultInfo,
      state: stateStr,
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
    if (
      DataKeys.vehicleWarnings(this.selectedLanguage)
        .map((key) => key.key)
        .includes(key)
    ) {
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

  private getStateDisplay(entityId: string | undefined): string {
    if (!entityId || !this._hass.states[entityId]) return '';
    return this._hass.formatEntityState(this._hass.states[entityId]);
  }

  private getSecondaryInfo(cardType: string): string {
    const { odometer, lockSensor, ecoScoreBonusRange } = this.vehicleEntities;

    switch (cardType) {
      case 'tripCards':
        return this.getStateDisplay(odometer?.entity_id);

      case 'vehicleCards':
        const lang = this.selectedLanguage;
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

  private getEntityAttribute(entity: string | undefined, attribute: string): any {
    if (!entity || !this._hass.states[entity] || !this._hass.states[entity].attributes) return undefined;
    return this._hass.states[entity].attributes[attribute];
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
        const warnKeys = [
          ...DataKeys.vehicleWarnings(lang)
            .map((key) => key.key)
            .filter((key) => key !== 'tirePressureWarning'),
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
        this.isBtnPreview = false;
        this.isCardPreview = false;
        this.updateComplete.then(() => {
          this.vehicleButtons?.showCustomBtnEditor(btnType);
        });
        break;

      case actionType.startsWith('toggle_card_'):
        const card = actionType.replace('toggle_card_', '');
        this.isCardPreview = false;
        this.updateComplete.then(() => {
          this.activeCardType = card;
        });
        break;

      case actionType === 'show_button_preview':
        this.isBtnPreview = true;
        this.requestUpdate();
        break;

      case actionType === 'close_preview':
        this.isBtnPreview = false;
        this.requestUpdate();
        break;

      case actionType === 'show_card_preview':
        this.isCardPreview = true;
        this.requestUpdate();
        break;

      case actionType === 'close_card_preview':
        this.isCardPreview = false;
        this.requestUpdate();
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
    BenzCard: VehicleCard | undefined;
  }
  interface HTMLElementTagNameMap {
    'vehicle-info-card': VehicleCard;
  }
}
