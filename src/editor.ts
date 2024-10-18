import { CARD_VERSION, PREVIEW_CONFIG_TYPES } from './const/const';
import { cardTypes, editorShowOpts } from './const/data-keys';
import { servicesCtrl } from './const/remote-control-keys';
import { languageOptions, localize } from './localize/localize';

import editorcss from './css/editor.css';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import YAML from 'yaml';

// Custom card helpers
import { fireEvent, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';
import { debounce } from 'es-toolkit';

// Local types
import {
  HA as HomeAssistant,
  VehicleCardConfig,
  CardTypeConfig,
  BaseButtonConfig,
  ExtendedButtonConfigItem,
  defaultConfig,
} from './types';
import { Create } from './utils';
import { uploadImage } from './utils/editor-image-handler';
import { handleFirstUpdated, deepMerge } from './utils/ha-helpers';
import { compareVersions } from './utils/helpers';
import { loadHaComponents, stickyPreview } from './utils/loader';

// Import the custom card components
import './components/editor';
import { PanelImages } from './components/editor';

const latestRelease: { version: string; hacs: boolean; updated: boolean } = {
  version: '',
  hacs: false,
  updated: false,
};

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public _config!: VehicleCardConfig;
  @property() private _btnPreview: boolean = false;
  @property() private _cardPreview: boolean = false;
  @property() private baseCardTypes: CardTypeConfig[] = [];

  @state() private _activeSubcardType: string | null = null;
  @state() private _yamlConfig: { [key: string]: any } = {};
  @state() private _confirmDeleteType: string | null = null;
  @state() private _customBtns: { [key: string]: BaseButtonConfig } = {};
  @state() private _selectedLanguage: string = 'system';
  @state() _latestRelease = latestRelease;
  private _toastDissmissed: boolean = false;

  @state() private _visiblePanel: Set<string> = new Set();
  @state() private _newCardType: Map<string, string> = new Map();
  @state() private _isTirePreview: boolean = false;

  @query('panel-images') private _panelImages!: PanelImages;

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    this._config = config;
  }

  connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
    void stickyPreview();
    if (process.env.ROLLUP_WATCH === 'true') {
      window.BenzEditor = this;
    }
    this._cleanConfig();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  public _cleanConfig(): void {
    // Check if _config exists and is an object
    if (!this._config || typeof this._config !== 'object') {
      return;
    }

    // Check if any preview key is not null
    if (PREVIEW_CONFIG_TYPES.some((key) => this._config[key] !== null)) {
      console.log('Cleaning config of preview keys');
      this._config = {
        ...this._config,
        ...PREVIEW_CONFIG_TYPES.reduce((acc: any, key: string) => {
          acc[key] = null;
          return acc;
        }, {}),
      };
      fireEvent(this, 'config-changed', { config: this._config });
    }
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);
    await handleFirstUpdated(this);
    this.getBaseCardTypes();
    this._convertDefaultCardConfigs();
    this._convertAddedCardConfigs();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!this._btnPreview && !this._cardPreview && !this._isTirePreview) {
      this._cleanConfig();
    }
    if (
      changedProperties.has('_activeSubcardType') &&
      !this._activeSubcardType &&
      (this._btnPreview || this._cardPreview || this._isTirePreview)
    ) {
      this._btnPreview = false;
      this._cardPreview = false;
      this._isTirePreview = false;
      this._cleanConfig();
    }
  }

  private get isAnyAddedCard(): boolean {
    return this._config.added_cards && Object.keys(this._config.added_cards).length > 0;
  }

  private useCustomCard = (cardType: string): boolean => {
    return this._config.use_custom_cards?.[cardType];
  };

  private isAddedCard = (cardType: string): boolean => {
    return this._config.added_cards?.hasOwnProperty(cardType);
  };

  private useCustomButton = (button: string): boolean => {
    return this._config[button]?.enabled;
  };

  private isButtonHidden = (cardButton: string): boolean => {
    const addedCard = this.isAddedCard(cardButton);
    return addedCard ? this._config.added_cards?.[cardButton]?.button.hide : this._config[cardButton]?.hide;
  };

  private _getButtonConfig = (button: string): ExtendedButtonConfigItem => {
    const configBtn: ExtendedButtonConfigItem = {
      ...(!this.isAddedCard(button) ? this._config[button] : this._config.added_cards[button].button),
      isDefaultCard: !this.isAddedCard(button),
      isHidden: this.isButtonHidden(button),
      useCustomButton: this.useCustomButton(button),
    };

    return configBtn;
  };

  private getBaseCardTypes() {
    const baseCardTypes = cardTypes(this._selectedLanguage);
    if (this.isAnyAddedCard) {
      Object.keys(this._config.added_cards).map((key) => {
        const card = this._config.added_cards[key];
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

    return (this.baseCardTypes = baseCardTypes);
  }

  private _convertDefaultCardConfigs(): void {
    for (const cardType of this.baseCardTypes) {
      if (this._config[cardType.config] && Array.isArray(this._config[cardType.config])) {
        const yamlString = YAML.stringify(this._config[cardType.config]);
        this._yamlConfig[cardType.config] = yamlString;
      }
      if (this._config[cardType.button] && typeof this._config[cardType.button] === 'object') {
        this._customBtns[cardType.button] = this._config[cardType.button];
      }
    }
  }

  private _convertAddedCardConfigs(): void {
    if (!this.isAnyAddedCard) {
      console.log('No added cards to convert');
      return;
    } else {
      // console.log('Converting added card configs');
      Object.keys(this._config.added_cards).forEach((key) => {
        const yamlString = YAML.stringify(this._config.added_cards[key].cards);
        const button = this._config.added_cards[key].button;
        this._yamlConfig[key] = yamlString;
        this._customBtns[key] = button;
      });
    }
  }

  private _debouncedCustomBtnChanged = debounce(this.configChanged.bind(this), 500);

  public localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this._selectedLanguage, search, replace);
  };

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }
    // Get the selected card type
    const selectedCard = this.baseCardTypes.find((card) => card.type === this._activeSubcardType);

    return html`
      <div class="card-config">
        ${!this._activeSubcardType
          ? this._renderBaseConfig()
          : this._renderSubCardConfig(selectedCard as CardTypeConfig)}
      </div>
    `;
  }

  private _renderBaseConfig(): TemplateResult {
    return html`
      <div class="base-config">
        ${this._renderNameEntityForm()} ${this._renderCardButtonPanel()} ${this._renderMapPopupConfig()}
        ${this._renderImageConfig()} ${this._renderServicesConfig()} ${this._renderThemesConfig()}
        ${this._renderShowOptions()} ${this._renderVersionInfo()}
      </div>
    `;
  }

  private _renderNameEntityForm(): TemplateResult {
    // Filter entities as per your requirement
    const entities = Object.keys(this.hass.states).filter(
      (entity) => entity.startsWith('sensor') && entity.endsWith('_car')
    );
    const modelName = this._config.model_name;

    // Define options for the combo-box
    const options = [{ value: modelName, label: modelName }];

    // The combo-box for entering a custom name or selecting the model name
    const nameComboBox = html`
      <ha-combo-box
        .item-value-path=${'value'}
        .item-label-path=${'label'}
        .hass=${this.hass}
        .label=${'Select or Enter Name'}
        .items=${options}
        .allowCustomValue=${true}
        .value=${this._config.name}
        .configValue=${'name'}
        @value-changed=${this._valueChanged}
        @closed=${(ev: Event) => ev.stopPropagation()}
      ></ha-combo-box>
    `;

    return html`
      ${nameComboBox}
      <ha-entity-picker
        .hass=${this.hass}
        .value=${this._config?.entity}
        .required=${true}
        .configValue=${'entity'}
        @value-changed=${this._valueChanged}
        .allow-custom-entity=${false}
        .includeEntities=${entities}
      ></ha-entity-picker>
    `;
  }

  private _renderCardButtonPanel(): TemplateResult {
    const localize = (key: string): string => this.localize(`editor.buttonConfig.${key}`);

    const translate = {
      info: this.localize('editor.common.infoButton'),
      defaultCards: localize('defaultCards'),
      customCards: localize('customCards'),
      addNewCard: localize('addNewCard'),
      buttonGridSwipe: localize('buttonGridSwipe'),
      useButtonSwipe: localize('useButtonSwipe'),
      swipeRows: localize('swipeRows'),
    };

    // Split cards into default and added
    const defaultCards = this.baseCardTypes.filter((card) => !this.isAddedCard(card.type));
    const customCards = this.baseCardTypes.filter((card) => this.isAddedCard(card.type));

    // Function to render card items
    const renderCardItems = (cards: CardTypeConfig[]) => {
      return cards.map((card) => {
        const hiddenClass = this.isButtonHidden(card.button) ? 'disabled' : '';
        const addedCard = this.isAddedCard(card.type);
        const eyeIcon = this.isButtonHidden(card.button) ? 'mdi:eye' : 'mdi:eye-off';
        const { icon, name, type, config, button } = card;

        return html`
          <div class="card-type-item">
            <div class="card-type-row ${hiddenClass}">
              <div class="card-type-icon">
                <div class="icon-background">
                  <ha-icon
                    icon=${icon ? icon : 'mdi:emoticon'}
                    @click=${() => (this._activeSubcardType = type)}
                  ></ha-icon>
                </div>
              </div>
              <div class="card-type-content">
                <span class="secondary">Config name: ${config}</span>
                <div class="primary">${name}</div>
              </div>
            </div>
            <div class="card-type-actions">
              <div class="action-icon" @click=${() => (this._activeSubcardType = type)}>
                <ha-icon icon="mdi:pencil"></ha-icon>
              </div>
              <div class="action-icon" @click=${this._hideCustomButton(button)}>
                <ha-icon icon=${eyeIcon}></ha-icon>
              </div>
              ${addedCard
                ? html`
                    <div class="action-icon" @click=${() => (this._confirmDeleteType = type)}>
                      <ha-icon icon="mdi:close"></ha-icon>
                    </div>
                  `
                : nothing}
            </div>
            ${this._confirmDeleteType === type
              ? html` <div class="confirm-delete">
                  <span>${this.localize('editor.buttonConfig.deleteConfirm')}</span>
                  <ha-button @click=${this._removeCustomCard(type)}><ha-icon icon="mdi:check"></ha-button>
                  <ha-button @click=${() => (this._confirmDeleteType = null)}><ha-icon icon="mdi:close"></button>
                </div>`
              : nothing}
          </div>
        `;
      });
    };

    const addNewCardForm = html`
      <div class="card-type-item">
        <div class="card-type-content">
          <ha-icon-picker
            .hass=${this.hass}
            .label=${'Icon'}
            .value=${'mdi:car'}
            .configValue=${'icon'}
            @value-changed=${this._handleCardTypeInput}
          ></ha-icon-picker>
        </div>
        <div class="card-type-content">
          <ha-textfield
            style="margin-bottom: 0;"
            .label=${'Enter name for the card'}
            .configValue=${'type'}
            .value=${this._newCardType.get('type') || ''}
            .toastId=${'buttonConfig'}
            .errorMsg=${'Please enter a name for the card'}
            @change=${this._handleCardTypeInput}
          ></ha-textfield>
        </div>
        <div class="card-type-actions">
          <div class="action-icon" @click=${this._addNewCard}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </div>
        </div>
      </div>
    `;

    const buttonGridSwipe = html`
      <div class="card-type-item">
        <div class="card-type-content">
          <ha-textfield
            .label=${translate.swipeRows}
            .configValue=${'rows_size'}
            .configBtnType=${'button_grid'}
            .value=${this._config.button_grid?.rows_size || ''}
            .min=${1}
            @input=${this._valueChanged}
          ></ha-textfield>
        </div>
        <div class="card-type-content">
          <ha-formfield .label=${translate.useButtonSwipe}>
            <ha-checkbox
              .checked=${this._config.button_grid?.use_swiper}
              .configValue=${'use_swiper'}
              .configBtnType=${'button_grid'}
              @change=${this._valueChanged}
            ></ha-checkbox>
          </ha-formfield>
        </div>
      </div>
    `;

    const sections = [
      { key: 'buton-grid-swipe', title: translate.buttonGridSwipe, cards: [buttonGridSwipe], visible: true },
      { key: 'add-new-card', title: translate.addNewCard, cards: [addNewCardForm], visible: true },
      { key: 'default-cards', title: translate.defaultCards, cards: renderCardItems(defaultCards), visible: true },
      {
        key: 'added-cards',
        title: translate.customCards,
        cards: renderCardItems(customCards),
        visible: this.isAnyAddedCard,
      },
    ].map((section) => ({
      ...section,
      isVisible: this._visiblePanel.has(section.key),
      toggle: () => this._toggleSubButtonPanel(section.key),
    }));

    const buttonsConfigWrapper = sections
      .filter((section) => section.visible)
      .map((section) => this._renderSection(section));

    const content = html`<ha-alert alert-type="info">${translate.info}</ha-alert>${buttonsConfigWrapper}`;
    return this.panelTemplate('buttonConfig', 'buttonConfig', 'mdi:view-dashboard', content);
  }

  private _renderSubCardConfig(card: CardTypeConfig): TemplateResult {
    const { name, icon } = card;
    const baseCard = this.baseCardTypes;

    const cardTabsRow = baseCard
      .filter((c) => c.type !== card.type)
      .map((c) => {
        return html`
          <div class="card-tab" title="${c.name}" @click=${() => (this._activeSubcardType = c.type)}>
            <ha-icon title="${c.name}" icon=${c.icon}></ha-icon>
          </div>
        `;
      });

    const subCardHeader = html`
      <div class="sub-card-header">
        <ha-icon icon="mdi:arrow-left" @click=${() => this._closeSubCardEditor(card)} style="cursor: pointer"></ha-icon>
        <div class="card-tab active">
          <ha-button>${name}</ha-button>
          <ha-icon icon=${icon}></ha-icon>
        </div>
        ${cardTabsRow}
      </div>
    `;
    const buttonTemplateWrapper = html`
      <custom-button-template
        .editor=${this}
        .button=${this._getButtonConfig(card.button)}
        .card=${card}
        .isButtonPreview=${this._btnPreview}
        @custom-button-changed=${(ev: any) => this._customBtnHandler(ev)}
      ></custom-button-template>
    `;

    const cardCodeEditorWrapper = html`
      <div class="card-code-editor">
        <custom-card-editor
          .editor=${this}
          .card=${card}
          .isCardPreview=${this._cardPreview}
          .isCustomCard=${this.useCustomCard(card.config)}
          .isAddedCard=${this.isAddedCard(card.type)}
          .yamlConfig=${this._yamlConfig[card.config] || ''}
          @custom-card-editor-changed=${(ev: any) => this._handleCustomCardEditorChange(ev)}
          @yaml-changed=${(ev: any) => this._customCardChange(ev)}
        ></custom-card-editor>
      </div>
    `;

    const tapActionConfig = html`
      <custom-button-action
        .hass=${this.hass}
        .config=${this._config}
        .button=${this._getButtonConfig(card.button)}
        .card=${card}
        .isButtonPreview=${this._btnPreview}
        @custom-action-changed=${(ev: any) => this._customBtnHandler(ev)}
      ></custom-button-action>
    `;

    const actionConfig = this.panelTemplate(
      'customActionConfig',
      'customActionConfig',
      'mdi:button-cursor',
      tapActionConfig,
      false
    );

    const buttonTemplate = this.panelTemplate(
      'customButtonConfig',
      'customButtonConfig',
      'mdi:button-cursor',
      buttonTemplateWrapper,
      false
    );
    const editorWrapper = this.panelTemplate(
      'customCardConfig',
      'customCardConfig',
      'mdi:code-json',
      cardCodeEditorWrapper
    );

    const tireType = card.type === 'tyreCards' ? this._renderCustomTireBackground() : nothing;

    const content = html`
      <div class="sub-card-config">${subCardHeader} ${buttonTemplate} ${editorWrapper} ${actionConfig} ${tireType}</div>
    `;

    return content;
  }

  private _renderShowOptions(): TemplateResult {
    let showOptions = editorShowOpts(this._selectedLanguage);
    // Filter out the enable_map_popup option

    showOptions = showOptions.filter((option) => option.configKey !== 'enable_map_popup');

    const switches = html`
      <div class="switches">
        ${showOptions.map((option) => {
          const { label, configKey } = option;
          return html`
            <ha-formfield .label=${label}>
              <ha-checkbox
                .checked=${this._config[configKey]}
                .configValue=${configKey}
                @change=${this._showValueChanged}
              ></ha-checkbox>
            </ha-formfield>
          `;
        })}
      </div>
    `;

    return this.panelTemplate('showConfig', 'showConfig', 'mdi:toggle-switch', switches);
  }

  private _renderThemesConfig(): TemplateResult {
    const langOpts = [
      { key: 'system', name: 'System', nativeName: 'System' },
      ...languageOptions.sort((a, b) => a.name.localeCompare(b.name)),
    ];

    const themeMode = [
      { key: 'auto', name: 'Auto' },
      { key: 'dark', name: 'Dark' },
      { key: 'light', name: 'Light' },
    ];

    const themesConfig = html`
      <div class="switches">
        <ha-select
          .label=${'Language'}
          .value=${this._config.selected_language}
          .configValue=${'selected_language'}
          @selected=${this._valueChanged}
          @closed=${(ev: Event) => ev.stopPropagation()}
        >
          ${langOpts.map(
            (lang) =>
              html`<ha-list-item value=${lang.key}>${lang.nativeName ? lang.nativeName : lang.name}</ha-list-item> `
          )}
        </ha-select>

        <ha-theme-picker
          .hass=${this.hass}
          .value=${this._config.selected_theme.theme ?? 'default'}
          .configValue=${'theme'}
          .includeDefault=${true}
          @selected=${this._valueChanged}
          @closed=${(ev: Event) => ev.stopPropagation()}
          .required=${true}
        ></ha-theme-picker>

        <ha-select
          label="Theme mode"
          .value=${this._config.selected_theme.mode}
          .configValue=${'mode'}
          @selected=${this._valueChanged}
          @closed=${(ev: Event) => ev.stopPropagation()}
        >
          ${themeMode.map((mode) => html`<mwc-list-item value=${mode.key}>${mode.name}</mwc-list-item>`)}
        </ha-select>
      </div>
    `;
    return this.panelTemplate('themeLangConfig', 'themeLangConfig', 'mdi:palette', themesConfig);
  }

  private _renderImageConfig(): TemplateResult {
    return this.panelTemplate(
      'imagesConfig',
      'imagesConfig',
      'mdi:image',
      html`<panel-images .editor=${this} .config=${this._config}></panel-images>`
    );
  }

  private _renderMapPopupConfig(): TemplateResult {
    const infoAlert = this.localize('editor.common.infoMap');
    const mapPopUp = editorShowOpts(this._selectedLanguage).find((option) => option.configKey === 'enable_map_popup');

    const themeMode = [
      { key: 'auto', name: 'Auto' },
      { key: 'dark', name: 'Dark' },
      { key: 'light', name: 'Light' },
    ];

    const mapPopupConfig = html`
      <ha-alert alert-type="info">${infoAlert}</ha-alert>
      <div class="switches">
        <ha-textfield
          label="Hours to show"
          .min=${0}
          .value=${this._config.map_popup_config.hours_to_show}
          .configValue=${'hours_to_show'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-textfield
          .label=${'Default Zoom'}
          .min=${0}
          .value=${this._config.map_popup_config.default_zoom}
          .configValue=${'default_zoom'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-select
          .label=${'Theme mode'}
          .value=${this._config.map_popup_config.theme_mode}
          .configValue=${'theme_mode'}
          @selected=${this._valueChanged}
          @closed=${(ev: Event) => ev.stopPropagation()}
        >
          ${themeMode.map((mode) => html`<mwc-list-item value=${mode.key}>${mode.name}</mwc-list-item>`)}
        </ha-select>
      </div>
    `;

    const mapConfig = html`
      <ha-entity-picker
        .hass=${this.hass}
        .value=${this._config?.device_tracker}
        .required=${false}
        .configValue=${'device_tracker'}
        @value-changed=${this._valueChanged}
        allow-custom-entity
        .includeDomains=${['device_tracker']}
        .label=${'Device Tracker (Optional)'}
      ></ha-entity-picker>
      <div class="flex-col">
        <ha-textfield
          style="flex: 1 1 30%;"
          label="Google API Key (Optional)"
          type="password"
          .value=${this._config?.google_api_key}
          .configValue=${'google_api_key'}
          @input=${this._valueChanged}
        ></ha-textfield>
        <ha-formfield style="flex: 1;" .label=${mapPopUp?.label}>
          <ha-checkbox
            .checked=${this._config[mapPopUp!.configKey]}
            .configValue=${mapPopUp?.configKey}
            @change=${this._showValueChanged}
          ></ha-checkbox>
        </ha-formfield>
      </div>
      ${mapPopupConfig}
    `;

    return this.panelTemplate('mapConfig', 'mapConfig', 'mdi:map-search', mapConfig);
  }

  private _renderServicesConfig(): TemplateResult {
    const infoAlert = this.localize('editor.common.infoServices');

    // Get the current selected services based on the config
    const selectedServices = Object.entries(this._config.services)
      .filter(([, value]) => value === true)
      .map(([key]) => key);

    const selectorItems = this.getServicesOptions();
    const servicesSelector = html`
      <ha-alert alert-type="info">${infoAlert}</ha-alert>
      <div class="selector-row">
        <ha-selector
          .hass=${this.hass}
          .label=${'Select Services'}
          .selector=${selectorItems.selector}
          .value=${selectedServices}
          .configValue=${'selected_services'}
          @value-changed=${this._servicesValueChanged}
        ></ha-selector>
      </div>
    `;
    return this.panelTemplate('servicesConfig', 'servicesConfig', 'mdi:car-cog', servicesSelector);
  }

  private _renderVersionInfo(): TemplateResult {
    const { version, hacs, updated } = this._latestRelease;
    return html`
      <div class="version">
        <span>
          ${updated
            ? html`version: ${CARD_VERSION}`
            : html`version: ${CARD_VERSION} -> <span class="update">${version}</span>`}
        </span>
      </div>
      ${this._renderUpdateToast()}
    `;
  }

  private _renderUpdateToast(): TemplateResult {
    const versionResult = compareVersions(CARD_VERSION, this._latestRelease.version);
    if (versionResult === 0 || this._toastDissmissed) {
      return html``;
    }

    const content = {
      '-1': {
        title: 'New version available',
        icon: '🎉',
      },
      1: {
        title: 'You are using a beta version',
        icon: '🚨',
      },
    };

    return html`
      <div id="toast-update">
        <ha-alert
          alert-type="info"
          title="${content[versionResult].title}"
          dismissable="true"
          @alert-dismissed-clicked=${() => this._handleToastUpdateDismissed()}
        >
          <span class="alert-icon" slot="icon">${content[versionResult].icon}</span>
          <span class="content">Latest: ${this._latestRelease.version}</span>
        </ha-alert>
      </div>
    `;
  }

  private _renderToast(idToast: string): TemplateResult {
    const toastId = `toast_${idToast}`;
    return html`
      <div id="${toastId}" class="toast">
        <ha-alert alert-type="warning" dismissable @alert-dismissed-clicked=${() => this._handleAlertDismissed(toastId)}
          >Default alert message
        </ha-alert>
      </div>
    `;
  }

  private _renderSuccesToast(idToast: string): TemplateResult {
    const toastId = `toast_${idToast}_success`;
    return html`
      <div id="${toastId}" class="toast">
        <ha-alert alert-type="success">Success alert message</ha-alert>
      </div>
    `;
  }

  private _renderCustomTireBackground(): TemplateResult {
    const info = this.localize('editor.customTireBackground.info');
    const urlInput = html`
      <ha-alert alert-type="info">${info}</ha-alert>
      <div class="custom-background-wrapper">
        <ha-textfield
          .label=${'Tire background url'}
          .disabled=${true}
          .value=${this._config.extra_configs?.tire_card_custom.background}
        ></ha-textfield>
      </div>

      <div class="custom-background-wrapper">
        ${this._config.extra_configs?.tire_card_custom.background
          ? html` <ha-button @click=${() => this._removeTireBackground()}> Use Defaut image </ha-button> `
          : html` <ha-button @click=${() => this.shadowRoot?.getElementById('file-upload-new')?.click()}>
                Upload image
              </ha-button>
              <input
                type="file"
                id="file-upload-new"
                class="file-input"
                @change=${(ev: any) => this._handleTireBackgroundUpload(ev)}
                accept="image/*"
              />`}
        <ha-button @click=${() => this._toggleTirePreview()}>
          ${this._isTirePreview ? 'Close preview' : 'Preview'}</ha-button
        >
      </div>
    `;

    const tireCard = this._config.extra_configs?.tire_card_custom || {};

    const imageSizeDirection = [
      {
        value: tireCard.image_size || 100,
        label: 'Base image size',
        configValue: 'image_size',
        pickerType: 'number' as const,
        options: { selector: { number: { max: 200, min: 0, mode: 'slider', step: 1 } } },
      },
      {
        value: tireCard.value_size || 100,
        label: 'Name & Value size',
        configValue: 'value_size',
        pickerType: 'number' as const,
        options: { selector: { number: { max: 150, min: 50, mode: 'slider', step: 1 } } },
      },
      {
        value: tireCard.top || 50,
        label: `${tireCard.horizontal ? 'Horizontal' : 'Vertical'} position`,
        configValue: 'top',
        pickerType: 'number' as const,
        options: { selector: { number: { max: 100, min: 0, mode: 'slider', step: 1 } } },
      },
      {
        value: tireCard.left || 50,
        label: `${tireCard.horizontal ? 'Vertical' : 'Horizontal'} position`,
        configValue: 'left',
        pickerType: 'number' as const,
        options: { selector: { number: { max: 100, min: 0, mode: 'slider', step: 1 } } },
      },
      {
        value: tireCard.horizontal || false,
        label: 'Horizontal layout',
        configValue: 'horizontal',
        pickerType: 'selectorBoolean' as const,
      },
    ];

    const imageSizeWrapper = html` <div class="card-button-cfg">
      ${imageSizeDirection.map((config) =>
        this.generateItemPicker({ ...config, configIndex: 'extra_configs', configType: 'tire_card_custom' })
      )}
      <ha-button class="item-content" @click=${() => this.resetTireImageSizes()}
        >Reset <ha-icon icon="mdi:restore"></ha-icon
      ></ha-button>
    </div>`;

    const content = html`<div class="card-config">${urlInput} ${imageSizeWrapper}</div>`;

    return this.panelTemplate('customTireBackground', 'customTireBackground', 'mdi:car-tire-alert', content);
  }

  /* ---------------------------- TEMPLATE HELPERS ---------------------------- */

  private _renderSection({
    key,
    title,
    isVisible,
    toggle,
    cards,
  }: {
    key: string;
    title: string;
    isVisible: boolean;
    toggle: () => void;
    cards: TemplateResult[];
  }): TemplateResult {
    return html`
      <div class="card-types">
        <div class="header-sm">
          <span>${title}</span>
          <div section-id="${key}" class="subcard-icon ${isVisible ? 'active' : ''}" @click="${() => toggle()}">
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </div>
        </div>
        <div class="sub-card-rows ${isVisible ? '' : 'hidden'}">${cards}</div>
      </div>
    `;
  }

  private _toggleSubButtonPanel(key: string): void {
    if (this._visiblePanel.has(key)) {
      this._visiblePanel.delete(key);
    } else {
      this._visiblePanel.add(key);
    }
    this.requestUpdate();
  }

  private panelTemplate(
    titleKey: string,
    descKey: string,
    icon: string,
    content: TemplateResult,
    expanded: boolean = false,
    leftChevron: boolean = false
  ): TemplateResult {
    const localTitle = this.localize(`editor.${titleKey}.title`);
    const localDesc = this.localize(`editor.${descKey}.desc`);

    return html`
      <div class="panel-container">
        <ha-expansion-panel
          id="${titleKey}"
          .outlined=${true}
          .header=${localTitle}
          .secondary=${localDesc}
          .expanded=${expanded}
          .leftChevron=${leftChevron}
          @expanded-changed=${(e: Event) => this._handlePanelExpandedChanged(e, titleKey)}
        >
          <div class="right-icon" slot="icons">
            <ha-icon icon=${icon}></ha-icon>
          </div>
          <div class="card-config">${content}</div>
          ${this._renderToast(titleKey)} ${this._renderSuccesToast(titleKey)}
        </ha-expansion-panel>
      </div>
    `;
  }

  private generateItemPicker(config: any, wrapperClass = 'item-content'): TemplateResult {
    return html`
      <div class="${wrapperClass}">
        ${Create.Picker({
          ...config,
          component: this,
        })}
      </div>
    `;
  }

  /* ----------------------------- EVENT HANDLERS ----------------------------- */

  private resetTireImageSizes(): void {
    this._config = {
      ...this._config,
      extra_configs: {
        ...this._config.extra_configs,
        tire_card_custom: {
          ...this._config.extra_configs?.tire_card_custom,
          image_size: 100,
          value_size: 100,
          top: 50,
          left: 50,
          horizontal: false,
        },
      },
    };
    this.configChanged();
  }

  private async _handleTireBackgroundUpload(ev: any): Promise<void> {
    if (!ev.target.files || ev.target.files.length === 0) {
      return;
    }

    const file = ev.target.files[0];
    const url = await uploadImage(this.hass, file);
    if (url) {
      this._config = {
        ...this._config,
        extra_configs: {
          ...this._config.extra_configs,
          tire_card_custom: { ...this._config.extra_configs?.tire_card_custom, background: url },
        },
      };
      this.configChanged();
    } else {
      return;
    }
  }

  private _removeTireBackground(): void {
    this._config = {
      ...this._config,
      extra_configs: {
        ...this._config.extra_configs,
        tire_card_custom: { ...this._config.extra_configs?.tire_card_custom, background: '' },
      },
    };
    this.configChanged();
  }

  private _handleCustomCardEditorChange(ev: any): void {
    const { type, config } = ev.detail;

    switch (type) {
      case 'use_custom_cards':
        this._customBtnChanged(ev);
        break;
      case 'toggle_preview_card':
        this._toggleCardPreview(config);
        break;

      default:
        return;
    }
    // console.log('Custom card editor changed', type, config);
  }

  private _customBtnHandler(ev: any): void {
    const details = ev.detail;
    const { type, button, card } = details;

    switch (type) {
      case 'toggle_preview_button':
        this._toggleBtnPreview(button);
        break;
      case 'toggle-show-button':
        this._toggleShowButton(card);
        break;
      default:
        this._customBtnChanged(ev);
    }

    // console.log('Custom button handler', type, details.configValue, details.value);
  }

  /* ----------------------- CUSTOM BUTTON ITEMS ACTIONS ---------------------- */

  private _hideCustomButton(cardButton: string) {
    return () => {
      const isAddedCard = this.isAddedCard(cardButton);
      if (isAddedCard) {
        const newAddedCards = { ...this._config.added_cards };
        newAddedCards[cardButton].button.hide = !newAddedCards[cardButton].button.hide;
        this._config = { ...this._config, added_cards: newAddedCards };
      } else {
        const button = this._config[cardButton];
        button.hide = !button.hide;
        this._config = { ...this._config, [cardButton]: button };
        console.log('Hide button', cardButton, button.hide, 'Enabled:', button.enabled);
      }
      this.configChanged();
      this.getBaseCardTypes();
    };
  }

  private _removeCustomCard(cardType: string) {
    return () => {
      const newAddedCards = { ...this._config.added_cards };
      delete newAddedCards[cardType];
      this._config = { ...this._config, added_cards: newAddedCards };
      this.configChanged();
      this.getBaseCardTypes();
      this._convertAddedCardConfigs();
    };
  }

  private _handleCardTypeInput(ev: any): void {
    ev.stopPropagation();
    const target = ev.target;
    const configValue = target.configValue;
    const value = target.value;

    const newCardType = new Map(this._newCardType);
    newCardType.set(configValue, value);
    this._newCardType = newCardType;

    this.requestUpdate();
  }

  private _addNewCard(): void {
    const primary = this._newCardType.get('type');
    const icon = this._newCardType.get('icon') || 'mdi:car';
    if (primary) {
      const formattedCardType = primary.trim().replace(/ /g, '_').toLowerCase();
      if (
        this._config.added_cards?.hasOwnProperty(formattedCardType) ||
        this._config.use_custom_cards?.hasOwnProperty(formattedCardType)
      ) {
        const toastId = 'buttonConfig';
        const errorMsg = this.localize('card.common.toastCardAlreadyExists') + `: ${formattedCardType}`;
        this.launchToast(toastId, errorMsg);
        return;
      }
      this._config.added_cards = {
        ...this._config.added_cards,
        [formattedCardType]: {
          cards: [],
          button: {
            primary,
            icon,
            enabled: true,
            hide: false,
            button_type: 'default',
            button_action: {
              entity: '',
              tap_action: {
                action: 'more-info',
              },
              hold_action: {
                action: 'none',
              },
              double_tap_action: {
                action: 'none',
              },
            },
          },
        },
      };

      const successMsg = this.localize('editor.buttonConfig.toastNewCard') + `: ${formattedCardType}`;
      this.configChanged();
      this.getBaseCardTypes();
      this._convertAddedCardConfigs();
      this._newCardType.forEach((_, key) => this._newCardType.delete(key));
      this.updateComplete.then(() => {
        this.launchToast('buttonConfig', successMsg, true);
        setTimeout(() => {
          this._dispatchCardEvent(`btn_${formattedCardType}`);
          console.log('Added new card', formattedCardType);
        }, 500);
      });
    }
  }

  /* --------------------- ADDITIONAL HANDLERS AND METHODS -------------------- */

  private _servicesValueChanged(ev: CustomEvent): void {
    const selectedServices = ev.detail.value;
    const updatedServices = { ...this._config.services };

    // Set each service to true or false based on the selection
    Object.keys(updatedServices).forEach((service) => {
      updatedServices[service] = selectedServices.includes(service);
    });

    // Update the config with the new services state
    this._config = {
      ...this._config,
      services: updatedServices,
    };

    this.configChanged();
  }

  private getServicesOptions() {
    const serviceOptions = Object.entries(servicesCtrl(this._selectedLanguage)).map(([key, { name }]) => ({
      value: key,
      label: name,
    }));

    return {
      selector: {
        select: {
          multiple: true,
          custom_value: false,
          options: serviceOptions,
        },
      },
    };
  }

  private _handlePanelExpandedChanged(e: Event, titleKey: string): void {
    const panel = e.target as HTMLElement;
    if (titleKey === 'imagesConfig' && (panel as any).expanded) {
      this._panelImages.initSortable();
    }

    // if (titleKey === 'customCardConfig' && (panel as any).expanded) {
    //   this._dispatchCardEvent(this._activeSubcardType as string);
    //   console.log('Custom card panel expanded', this._activeSubcardType);
    // }
  }

  /* ----------------------------- IMAGES HANDLERS ---------------------------- */

  public launchToast(id: string, msg: string = '', success: boolean = false): void {
    const toast = this.shadowRoot?.getElementById(`toast_${id}${success ? '_success' : ''}`) as HTMLElement;
    const haAlert = toast?.querySelector('ha-alert') as HTMLElement;
    if (!toast) return;
    haAlert.innerHTML = msg || 'Default alert message';
    toast.classList.add('show');
    if (success) {
      setTimeout(() => {
        this._handleAlertDismissed(`toast_${id}_success`);
      }, 3000);
    }
  }

  private _handleAlertDismissed(id: string): void {
    const toast = this.shadowRoot?.getElementById(id) as HTMLElement;
    if (toast) {
      toast.classList.remove('show');
    }
  }

  private _handleToastUpdateDismissed(): void {
    const toast = this.shadowRoot?.getElementById('toast-update') as HTMLElement;
    if (toast) {
      toast.classList.add('hidden');
      this._toastDissmissed = true;
    }
  }

  private _customBtnChanged(ev: any): void {
    const { configValue, configBtnType, value } = ev.detail;

    const updates: Partial<VehicleCardConfig> = {};
    if (this._btnPreview && this._config.btn_preview) {
      this._config = {
        ...this._config,
        btn_preview: {
          ...this._config.btn_preview,
          [configValue]: value,
        },
      };
    }

    if (this._config.added_cards?.hasOwnProperty(configBtnType)) {
      this._config = {
        ...this._config,
        added_cards: {
          ...this._config.added_cards,
          [configBtnType]: {
            ...this._config.added_cards[configBtnType],
            button: {
              ...this._config.added_cards[configBtnType].button,
              [configValue]: value,
            },
          },
        },
      };
    } else {
      updates[configBtnType] = { ...this._config[configBtnType], [configValue]: value };
      this._config = {
        ...this._config,
        ...updates,
      };
    }
    this._debouncedCustomBtnChanged();
  }

  private _customCardChange(ev: any): void {
    ev.stopPropagation();
    const { configKey, value } = ev.detail;
    let parsedYaml: any[];
    try {
      parsedYaml = YAML.parse(value); // Parse YAML content
    } catch (e) {
      return;
    }

    if (this._config.card_preview && this._cardPreview) {
      this._config = {
        ...this._config,
        card_preview: parsedYaml,
      };
    }
    if (this._config.added_cards?.hasOwnProperty(configKey)) {
      this._config = {
        ...this._config,
        added_cards: {
          ...this._config.added_cards,
          [configKey]: {
            ...this._config.added_cards[configKey],
            cards: parsedYaml, // Ensure 'cards' remains an array of objects
          },
        },
      };
    } else {
      this._config = {
        ...this._config,
        [configKey]: parsedYaml,
      };
    }

    this._debouncedCustomBtnChanged();
  }

  private _showValueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    if (this._config[configValue] === target.checked) {
      return;
    }

    this._config = {
      ...this._config,
      [configValue]: target.checked,
    };
    this.configChanged();
  }

  public _valueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;
    const configBtnType = target.configBtnType;
    const configIndex = target.configIndex;
    let newValue: any = target.value;

    const updates: Partial<VehicleCardConfig> = {};

    if (configValue in this._config.map_popup_config) {
      const key = configValue as keyof typeof this._config.map_popup_config;
      if (this._config.map_popup_config[key] === newValue) {
        return;
      }
      updates.map_popup_config = {
        ...this._config.map_popup_config,
        [key]: parseInt(newValue) || newValue,
      };
      console.log('Map popup config changed:', key, newValue);
    } else if (configValue in this._config.selected_theme) {
      const key = configValue as keyof VehicleCardConfig['selected_theme'];
      if (this._config.selected_theme[key] === newValue) {
        return;
      }
      updates.selected_theme = {
        ...this._config.selected_theme,
        [key]: newValue,
      };
      console.log('Selected theme changed:', key, newValue);
    } else if (configValue === 'selected_language') {
      newValue === 'system' ? (this._selectedLanguage = this.hass.language) : (this._selectedLanguage = newValue);
      updates.selected_language = newValue;
    } else if (configBtnType === 'button_grid') {
      newValue = target.checked !== undefined ? target.checked : newValue;
      const key = configValue as keyof VehicleCardConfig['button_grid'];
      updates.button_grid = {
        ...this._config.button_grid,
        [key]: parseInt(newValue) || newValue,
      };
      console.log('Button grid config changed:', key, newValue);
    } else if (configIndex === 'extra_configs') {
      newValue = ev.detail.value;
      const key = configValue as keyof VehicleCardConfig['extra_configs']['tire_card_custom'];
      updates.extra_configs = {
        ...this._config.extra_configs,
        tire_card_custom: {
          ...this._config.extra_configs?.tire_card_custom,
          [key]: parseInt(newValue) || newValue,
        },
      };
    } else {
      newValue = target.checked !== undefined ? target.checked : ev.detail.value;
      updates[configValue] = newValue;
    }

    if (Object.keys(updates).length > 0) {
      this._config = {
        ...this._config,
        ...updates,
      };
      this.configChanged();
    }
  }

  public configChanged() {
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _toggleCardPreview(cardType: string): void {
    if (this._btnPreview) {
      this._dispatchCardEvent('close_preview');
      this._btnPreview = false;
    }
    if (this._cardPreview) {
      // console.log('Closing card preview:', cardType);
      // Close card preview logic
      if (this._config) {
        this._config = {
          ...this._config,
          card_preview: null,
        };
      }

      this._cardPreview = false;
      this.configChanged();

      if (this._config.added_cards?.hasOwnProperty(cardType)) {
        this._convertAddedCardConfigs();
      } else {
        this._convertDefaultCardConfigs();
      }

      setTimeout(() => {
        this._dispatchCardEvent('close_card_preview');
      }, 50);
    } else {
      // console.log('Setting card preview:', cardType);
      // Set card preview logic
      let cardConfig: LovelaceCardConfig[];
      if (this._config.added_cards?.hasOwnProperty(cardType)) {
        cardConfig = this._config.added_cards[cardType].cards;
      } else {
        cardConfig = this._config[cardType];
      }

      if (!cardConfig || cardConfig.length === 0) {
        console.log(`No card config found for ${cardType}`);
        this.launchToast('customCardConfig', 'No card config found' + `: ${cardType}`);
        return;
      }

      if (this._config) {
        this._config = {
          ...this._config,
          card_preview: cardConfig,
        };
      }

      this._cardPreview = true;
      this.configChanged();

      setTimeout(() => {
        this._dispatchCardEvent('show_card_preview');
      }, 50);
    }
  }

  public _toggleShowButton(card: CardTypeConfig): void {
    console.log('Toggling show button from editor:', card.type);
    if (this._btnPreview) {
      this._toggleBtnPreview(card.button);
      this._btnPreview = false;
      setTimeout(() => {
        this._dispatchCardEvent(`btn_${card.type}`);
      }, 50);
    } else {
      this._dispatchCardEvent(`btn_${card.type}`);
    }
  }

  public _toggleBtnPreview(button: string): void {
    if (this._cardPreview) {
      this._dispatchCardEvent('close_card_preview');
      this._cardPreview = false;
    }
    if (this._btnPreview) {
      console.log('Closing button preview:', button);
      if (this._config) {
        this._config = {
          ...this._config,
          btn_preview: null,
        };
      }

      this._btnPreview = false;
      this.configChanged();
      if (this._config.added_cards?.hasOwnProperty(button)) {
        this._convertAddedCardConfigs();
      } else {
        this._convertDefaultCardConfigs();
      }
      setTimeout(() => {
        this._dispatchCardEvent('close_preview');
      }, 50);
    } else {
      // Set preview button config
      console.log('Setting button preview:', button);
      let btnConfig: BaseButtonConfig;
      if (this._config.added_cards?.hasOwnProperty(button)) {
        btnConfig = this._config.added_cards[button].button;
      } else {
        btnConfig = this._config[button];
      }

      if (this._config) {
        this._config = {
          ...this._config,
          btn_preview: {
            ...btnConfig,
          },
        };
      }

      this.configChanged();
      this._btnPreview = true;

      setTimeout(() => {
        this._dispatchCardEvent('show_button_preview');
      }, 50);
    }
  }

  public _toggleTirePreview(): void {
    if (this._cardPreview) {
      this._dispatchCardEvent('close_card_preview');
      this._cardPreview = false;
    }

    if (this._isTirePreview) {
      console.log('Closing tire preview');
      if (this._config) {
        this._config = {
          ...this._config,
          tire_preview: null,
        };
      }

      this._isTirePreview = false;
      this.configChanged();
      setTimeout(() => {
        this._dispatchCardEvent('close_preview');
      }, 50);
    } else {
      const tireConfig = this._config.extra_configs?.tire_card_custom;
      console.log('Setting tire preview');
      if (this._config) {
        this._config = {
          ...this._config,
          tire_preview: {
            ...tireConfig,
          },
        };
      }

      this._isTirePreview = true;
      this.configChanged();
      setTimeout(() => {
        this._dispatchCardEvent('toggle_preview_tire');
      }, 50);
    }
  }

  private _closeSubCardEditor(card: CardTypeConfig): void {
    const resetState = () => {
      this._activeSubcardType = null;
      this.getBaseCardTypes();
      this._cardPreview = false;
      this._btnPreview = false;
    };

    if (!this._activeSubcardType) {
      if (this._cardPreview) {
        this._toggleCardPreview(card.type);
      } else if (this._btnPreview) {
        this._toggleBtnPreview(card.button);
      }
      this.updateComplete.then(resetState);
    } else if (this._activeSubcardType === card.type && (!this._cardPreview || !this._btnPreview)) {
      this._activeSubcardType = null;
      this.updateComplete.then(() => {
        this._convertAddedCardConfigs();
        this._convertDefaultCardConfigs();
        resetState();
      });
    }

    this.updateComplete.then(() => {
      this._toggleConfigPanel();
    });
  }

  private _toggleConfigPanel(): void {
    const panel = this.shadowRoot?.querySelector('#buttonConfig') as any;
    if (panel) {
      panel.expanded = true;
    }
  }

  private _dispatchCardEvent(action: string): void {
    // Dispatch the custom event with the cardType name
    const detail = action;
    const ev = new CustomEvent('editor-event', { detail, bubbles: true, composed: true });
    this.dispatchEvent(ev);
    // console.log('Dispatched custom event:', action);
  }

  static get styles(): CSSResultGroup {
    return editorcss;
  }
}

declare global {
  interface Window {
    BenzEditor: VehicleCardEditor;
  }

  interface HTMLElementTagNameMap {
    'vehicle-info-card-editor': LovelaceCardEditor;
  }
}
