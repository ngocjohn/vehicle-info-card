import { DEFAULT_ITEMS } from 'data/default-button-items';
import { isEmpty } from 'es-toolkit/compat';
import { html, CSSResultGroup, TemplateResult, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Car } from 'model/car';
import { DEFAULT_CARD_KEYS, IButtonMap } from 'types/card-config/button-card';
import { SECTION_KEYS } from 'types/card-config/layout-config';
import { _getCarEntity, ICON } from 'utils';
import { isCardInEditPreview, isCardInPickerPreview } from 'utils/helpers-dom';
import { getCarEntities } from 'utils/lovelace/car-entities';

import { BaseElement, computeDarkMode } from './components';
import './components/vic-button-group';
import { VEHICLE_INFO_CARD_NEW_EDITOR_NAME, VEHICLE_INFO_CARD_NEW_NAME } from './const/const';
import { imagesVars } from './css/shared-styles';
import { Store } from './model/store';
import {
  CarEntities,
  HomeAssistant,
  LovelaceCard,
  LovelaceCardEditor,
  SECTION,
  updateDeprecatedConfig,
  VehicleCardConfig,
} from './types';

@customElement(VEHICLE_INFO_CARD_NEW_NAME)
export class VehicleInfoCard extends BaseElement implements LovelaceCard {
  constructor() {
    super();
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.VicCard = this;
  }
  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  @property({ attribute: false }) public _hass!: HomeAssistant;
  @property({ attribute: false }) public _config!: VehicleCardConfig;
  @state() _carEntities: CarEntities = {};
  @state() private _loadedData: boolean = false;
  @state() private _legacyConfig?: VehicleCardConfig;

  @state() _buttonOrder: string[] = [];
  @state() _buttonsData: IButtonMap = new Map();

  @state() public _activeCardIndex: null | number | string = null;

  @state() _currentSwipeIndex?: number;
  @state() _hasAnimated: boolean = false;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./vehicle-info-card-editor');
    return document.createElement(VEHICLE_INFO_CARD_NEW_EDITOR_NAME) as LovelaceCardEditor;
  }

  public static getStubConfig(hass: HomeAssistant): VehicleCardConfig {
    const entity = _getCarEntity(hass);
    return {
      type: `custom:${VEHICLE_INFO_CARD_NEW_NAME}`,
      entity,
    };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  get hass(): HomeAssistant {
    return this._hass;
  }

  get isEditorPreview(): boolean {
    return isCardInEditPreview(this);
  }
  get isInCardPicker(): boolean {
    return isCardInPickerPreview(this);
  }

  public setConfig(config: VehicleCardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    if (!config.entity) {
      throw new Error('Entity is required in the configuration');
    }
    const newConfig = JSON.parse(JSON.stringify(config));
    this._legacyConfig = newConfig;
    this._config = {
      ...updateDeprecatedConfig(newConfig),
    };

    this._buttonsData = new Map(
      Object.entries({
        ...(this._config?.default_buttons || {}),
        ...(this._config?.custom_buttons || {}),
      })
    );

    this._updateButtonDataMap();
    this._buttonOrder = this._config!.extra_configs!.button_grid!.button_order!;
    console.log('%cVEHICLE-INFO-CARD:', 'color: #bada55;', 'button-order:', this._buttonOrder);
  }

  protected async willUpdate(_changedProperties: PropertyValues): Promise<void> {
    if (_changedProperties.has('_config') && this._config.entity != null && this._hass) {
      if (isEmpty(this._carEntities)) {
        console.log('Loading car entities for the first time');
        this._carEntities = await getCarEntities(this._hass.entities[this._config.entity], this._hass);
        console.log('Car entities updated');
        this._loadedData = true;
      }
    }
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('_hass') && this._hass) {
      const currentDarkMode = computeDarkMode(changedProps.get('_hass'));
      const newDarkMode = computeDarkMode(this._hass);
      if (currentDarkMode != newDarkMode) {
        this.toggleAttribute('dark-mode', newDarkMode);
        console.log('Dark mode changed:', newDarkMode);
      }
    }
  }

  protected render(): TemplateResult {
    if (!this._config || !this._hass || !this._loadedData) {
      return html``;
    }
    this._createStore();
    const _config = this._config;
    const isEditorPreview = this.isEditorPreview;
    const notMainCard = this._activeCardIndex !== null;
    const headerHidden = Boolean(_config.extra_configs?.hide_card_name || isEmpty(_config?.name) || notMainCard);

    return html`
      <ha-card ?notMainCard=${notMainCard} ?preview=${isEditorPreview} .raised=${isEditorPreview}>
        ${!headerHidden ? html`<header><h1>${this._config?.name}</h1></header>` : nothing}
        ${!notMainCard ? this._renderMainCard() : this._renderSelectedCard()}
      </ha-card>
    `;
  }

  private _renderMainCard(): TemplateResult {
    const sectionOrder = this._config.extra_configs?.section_order || SECTION_KEYS;
    return html`<main id="main-wrapper">
      ${sectionOrder.map((sectionKey: string) => {
        switch (sectionKey) {
          case SECTION.HEADER_INFO:
            return this._renderIndicator();
          case SECTION.IMAGES:
            return this._renderImagesSection();
          case SECTION.MINI_MAP:
            return this._renderMiniMapSection();
          case SECTION.BUTTONS:
            return this._renderButtonGroup();
          default:
            return nothing;
        }
      })}
    </main>`;
  }

  private _renderSelectedCard(): TemplateResult {
    if (this._activeCardIndex === null) {
      return html``;
    }
    const activeCardKey = this._activeCardIndex.toString();
    // console.log('%cVEHICLE-INFO-CARD:', 'color: #bada55;', ' Rendering selected card for key:', activeCardKey);

    const renderButton = (label: string, icon: string, action: () => void): TemplateResult => {
      return html`
        <ha-icon-button
          class="click-shrink headder-btn"
          .label=${label}
          .path=${icon}
          @click=${action}
        ></ha-icon-button>
      `;
    };
    const cardHeaderBox = html`
      <div class="added-card-header">
        ${renderButton('Close', ICON.CLOSE, () => (this._activeCardIndex = null))}
        <div class="card-toggle">
          ${renderButton('Previous', ICON.CHEVRON_LEFT, () => this._toggleCard('prev'))}
          ${renderButton('Next', ICON.CHEVRON_RIGHT, () => this._toggleCard('next'))}
        </div>
      </div>
    `;
    return html`
      <main id="cards-wrapper">
        ${cardHeaderBox}
        <section class="card-element">
          <div class="added-card">${activeCardKey}</div>
        </section>
      </main>
    `;
  }

  private _renderIndicator(): TemplateResult {
    return html`
      <div id=${SECTION.HEADER_INFO}>
        <vic-indicator-row .store=${this.store} .car=${this.car} .hass=${this._hass}></vic-indicator-row>
      </div>
    `;
  }

  private _renderImagesSection(): TemplateResult {
    return html` <div id=${SECTION.IMAGES}>this is images section</div> `;
  }

  private _renderMiniMapSection(): TemplateResult {
    return html` <div id=${SECTION.MINI_MAP}>this is mini map section</div> `;
  }

  private _renderButtonGroup(): TemplateResult {
    return html`
      <div id=${SECTION.BUTTONS}>
        <vic-button-group
          ._hass=${this._hass}
          .store=${this.store}
          .car=${this.car}
          ._buttonsDataMap=${this._buttonsData}
          ._cardCurrentSwipeIndex=${this._currentSwipeIndex}
        ></vic-button-group>
      </div>
    `;
  }

  private _createStore() {
    if (!this.store) {
      this.store = new Store(this, this._config, this._hass);
      this.car = new Car(this.store);
    }
  }

  private _updateButtonDataMap(): void {
    DEFAULT_CARD_KEYS.forEach((key) => {
      if (!this._buttonsData.has(key)) {
        const default_button_config = DEFAULT_ITEMS[key];
        this._buttonsData.set(key, { default_button_config });
      }
    });
  }

  private _toggleCard(direction: 'next' | 'prev'): void {
    setTimeout(() => {
      if (this._activeCardIndex === null) {
        return;
      }
      const currentCartType = this._activeCardIndex.toString();
      const visibleButtons = this.store._visibleButtons;
      const btnKeys = Object.keys(visibleButtons);
      const currentIndex = btnKeys.indexOf(currentCartType);
      const totalButtons = btnKeys.length;

      const isNotActionType = (btnKey: string): boolean => visibleButtons[btnKey]?.button_type !== 'action';

      let newIndex = currentIndex;
      if (direction === 'next') {
        do {
          newIndex = newIndex === totalButtons - 1 ? 0 : newIndex + 1;
        } while (!isNotActionType(btnKeys[newIndex]) && newIndex !== currentIndex);
        console.log(
          '%cVEHICLE-INFO-CARD:',
          'color: #bada55;',
          ' Next card index:',
          newIndex,
          'key:',
          btnKeys[newIndex]
        );
      } else if (direction === 'prev') {
        do {
          newIndex = newIndex === 0 ? totalButtons - 1 : newIndex - 1;
        } while (!isNotActionType(btnKeys[newIndex]) && newIndex !== currentIndex);
        console.log(
          '%cVEHICLE-INFO-CARD:',
          'color: #bada55;',
          ' Previous card index:',
          newIndex,
          'key:',
          btnKeys[newIndex]
        );
      }
      this._activeCardIndex = btnKeys[newIndex];
    }, 50);
    // this.requestUpdate();
  }

  public getCardSize(): number {
    return 3;
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      imagesVars.cardBackground,
      css`
        ha-card {
          position: relative;
          overflow: hidden;
          display: block;
          width: auto;
          height: auto;
          padding: var(--vic-card-padding);
          background: var(--card-background-color, var(--ha-card-background, white));
        }
        ha-card.__background::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          max-height: 250px;
          top: 0;
          left: 50%;
          transform: translate(-50%);
          padding: var(--vic-card-padding);
          background-image: var(--vic-card-bg-image);
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.1;
          z-index: 0;
          mask-image: linear-gradient(transparent 0%, black 40%, black 70%, transparent 100%);
        }
        header h1 {
          color: var(--ha-card-header-color, var(--primary-text-color));
          font-family: serif !important;
          font-size: var(--ha-card-header-font-size, 24px);
          line-height: 2rem;
          font-weight: 400;
          display: block;
          margin: 0;
          text-align: center;
          margin-bottom: var(--vic-gutter-gap);
        }
        #cards-wrapper {
          animation: fadeIn 0.5s ease-in-out;
          position: relative;
        }

        #main-wrapper {
          animation: fadeIn 0.3s ease;
          position: relative;
        }

        #main-wrapper * {
          transition: all 0.3s ease-in-out;
        }

        .card-element {
          transition: all 0.5s ease;
          position: relative;
        }
        .added-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          --mdc-icon-button-size: var(--vsc-unit);
          --mdc-icon-size: calc(var(--vsc-unit) * 0.6);
        }

        .added-card-header ha-icon {
          display: flex;
          width: calc(var(--vsc-unit) * 0.6);
          height: calc(var(--vsc-unit) * 0.6);
        }

        .added-card-header .headder-btn {
          color: var(--secondary-text-color);
          opacity: 0.5;
          transition: opacity 0.3s;
        }

        .added-card-header .headder-btn:hover {
          opacity: 1;
        }

        ha-icon-button.headder-btn,
        .header-btn .mdc-icon-button {
          width: var(--vsc-unit) !important;
          height: var(--vsc-unit) !important;
        }

        ha-icon-button ha-icon {
          display: flex;
        }

        .added-card-header .card-toggle {
          display: flex;
          gap: 1rem;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-info-vehicle-card': VehicleInfoCard;
  }
}
