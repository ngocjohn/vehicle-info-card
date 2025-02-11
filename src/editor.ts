import { mdiArrowLeft, mdiDrag } from '@mdi/js';
// Custom card helpers
import { debounce } from 'es-toolkit';
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues, nothing } from 'lit';
import { repeat } from 'lit-html/directives/repeat.js';
import { customElement, property, query, state } from 'lit/decorators.js';
import Sortable from 'sortablejs';

import { PanelImages } from './components/editor';
import { CARD_VERSION, PREVIEW_CONFIG_TYPES } from './const/const';
// Import the custom card components
import './components/editor';
import { cardTypes, editorShowOpts } from './const/data-keys';
import './components/editor/custom-card-ui-editor';
import { servicesCtrl } from './const/remote-control-keys';
import editorcss from './css/editor.css';
import { languageOptions, localize } from './localize/localize';
import {
  HomeAssistant,
  VehicleCardConfig,
  CardTypeConfig,
  BaseButtonConfig,
  ExtendedButtonConfigItem,
  SECTION_DEFAULT_ORDER,
  SECTION,
} from './types';
// Local types
import { fireEvent } from './types/ha-frontend/fire-event';
import { LovelaceCardEditor, LovelaceConfig, LovelaceCardConfig } from './types/ha-frontend/lovelace/lovelace';
import { Create, handleFirstUpdated, compareVersions, uploadImage, stickyPreview, loadHaComponents } from './utils';
import { Picker } from './utils/create';

const latestRelease: { version: string; hacs: boolean; updated: boolean } = {
  version: '',
  hacs: false,
  updated: false,
};

@customElement('vehicle-info-card-editor')
export class VehicleCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) _config!: VehicleCardConfig;
  @property({ attribute: false }) private baseCardTypes: CardTypeConfig[] = [];

  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @state() private _btnPreview: boolean = false;
  @state() private _cardPreview: boolean = false;
  @state() private _isTirePreview: boolean = false;

  @state() public _activeTabIndex: number = 0;

  @state() private _activeSubcardType: string | null = null;
  @state() private _confirmDeleteType: string | null = null;
  @state() private _selectedLanguage: string = 'system';
  @state() _cardSortable: Sortable | null = null;
  @state() _sectionSortable: Sortable | null = null;

  @state() _latestRelease = latestRelease;

  private _toastDissmissed: boolean = false;
  @state() private _reloadSectionList: boolean = false;

  @state() private _visiblePanel: Set<string> = new Set();
  @state() private _newCardType: Map<string, string> = new Map();

  @query('panel-images') private _panelImages!: PanelImages;

  public async setConfig(config: VehicleCardConfig): Promise<void> {
    this._config = structuredClone(config);
  }

  connectedCallback() {
    super.connectedCallback();
    console.log('VehicleCardEditor connected');
    void loadHaComponents();
    void stickyPreview();
    window.BenzEditor = this;
    this._cleanConfig();
  }

  disconnectedCallback(): void {
    console.log('VehicleCardEditor disconnected');
    super.disconnectedCallback();
  }

  public _cleanConfig(): void {
    // Check if _config exists and is an object
    if (!this._config || typeof this._config !== 'object') {
      return;
    }

    if (
      PREVIEW_CONFIG_TYPES.some(
        (key) => this._config.hasOwnProperty(key) && (this._config[key] === null || this._config[key] !== null)
      )
    ) {
      console.log('Cleaning config of preview keys');
      this._config = {
        ...this._config,
        ...PREVIEW_CONFIG_TYPES.reduce((acc: any, key: string) => {
          acc[key] = undefined;
          return acc;
        }, {}),
      };
      fireEvent(this, 'config-changed', { config: this._config });
    } else {
      return;
    }
  }

  protected async firstUpdated(changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(changedProperties);
    await handleFirstUpdated(this);
    this.getBaseCardTypes();
    // this._convertDefaultCardConfigs();
    // this._convertAddedCardConfigs();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (!this._btnPreview && !this._cardPreview && !this._isTirePreview) {
      this._cleanConfig();
    }
    if (
      _changedProperties.has('_activeSubcardType') &&
      !this._activeSubcardType &&
      (this._btnPreview || this._cardPreview || this._isTirePreview)
    ) {
      this._btnPreview = false;
      this._cardPreview = false;
      this._isTirePreview = false;
      this._cleanConfig();
    }

    if (_changedProperties.has('_activeTabIndex') && (this._btnPreview || this._cardPreview || this._isTirePreview)) {
      this._btnPreview = false;
      this._cardPreview = false;
      this._isTirePreview = false;
      this._cleanConfig();
    }

    return true;
  }

  private get isAnyAddedCard(): boolean {
    return this._config.added_cards && Object.keys(this._config.added_cards).length > 0;
  }

  private useCustomCard = (cardType: string): boolean => {
    return this._config.use_custom_cards?.[cardType];
  };

  public isAddedCard = (cardType: string): boolean => {
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
      for (const [key, card] of Object.entries(this._config.added_cards)) {
        baseCardTypes.push({
          type: key,
          name: card.button.primary,
          icon: card.button.icon,
          config: key,
          button: key,
        });
      }
    }

    return (this.baseCardTypes = baseCardTypes);
  }

  private _debouncedCustomBtnChanged = debounce(this.configChanged.bind(this), 500);

  public localize = (string: string, search = '', replace = ''): string => {
    return localize(string, this._selectedLanguage, search, replace);
  };

  private _initCardSortable(panelId: string): void {
    this.updateComplete.then(() => {
      const panel = this.shadowRoot?.getElementById(panelId);
      const cardList = panel?.querySelector('#card-list') as HTMLElement;
      if (cardList) {
        this._cardSortable = new Sortable(cardList, {
          animation: 150,
          handle: '.handle',
          ghostClass: 'ghost',
          onEnd: (evt) => {
            this._handleCardSort(evt);
          },
        });
      }
    });
  }

  private _handleCardSort(evt: Sortable.SortableEvent): void {
    if (!this._config) return;
    evt.preventDefault();
    const oldIndex = evt.oldIndex as number;
    const newIndex = evt.newIndex as number;
    const buttonId = evt.item.getAttribute('data-id') as string;
    const cards = [...Object.entries(this._config.added_cards)];
    const [removed] = cards.splice(oldIndex, 1);
    cards.splice(newIndex, 0, removed);

    const newAddedCards = cards.reduce((acc, [key, value], index) => {
      acc[key] = { ...value, order: index };
      return acc;
    }, {});

    this._config = { ...this._config, added_cards: newAddedCards };
    this.configChanged();
    this.getBaseCardTypes();
    this.requestUpdate();
    this._handleSwipeToButton(buttonId);
  }

  private _initSectionSortable(): void {
    this.updateComplete.then(() => {
      const sectionList = this.shadowRoot?.getElementById('section-list') as HTMLElement;
      if (sectionList) {
        this._sectionSortable = new Sortable(sectionList, {
          animation: 150,
          handle: '.handle',
          ghostClass: 'ghost',
          onEnd: (evt) => {
            this._handleSectionSort(evt);
          },
        });
      }
    });
    console.log('Section sortable initialized');
  }

  private _handleSectionSort(evt: Sortable.SortableEvent): void {
    if (!this._config) return;
    evt.preventDefault();
    const oldIndex = evt.oldIndex as number;
    const newIndex = evt.newIndex as number;
    const sectionOrder = [...(this._config.extra_configs?.section_order || [...SECTION_DEFAULT_ORDER])];
    const [removed] = sectionOrder.splice(oldIndex, 1);
    sectionOrder.splice(newIndex, 0, removed);

    this._config = { ...this._config, extra_configs: { ...this._config.extra_configs, section_order: sectionOrder } };
    this.configChanged();
  }

  private _handleSwipeToButton(buttonId: string): void {
    setTimeout(() => {
      this._dispatchCardEvent(`swipe_${buttonId}`);
    }, 50);
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    // Get the selected card type
    const selectedCard = this.baseCardTypes.find((card) => card.type === this._activeSubcardType);
    return html`
      <div class="card-config">
        ${this._activeSubcardType
          ? this._renderSubCardConfig(selectedCard as CardTypeConfig)
          : this._renderDefaultConfig()}
        ${this._renderVersionInfo()}
      </div>
    `;
  }

  private _renderDefaultConfig(): TemplateResult {
    const defaultConfigList = [
      { titleKey: 'entityConfig', icon: 'mdi:car', content: this._renderNameEntityForm() },
      { titleKey: 'buttonConfig', icon: 'mdi:view-dashboard', content: this._renderCardButtonPanel() },
      { titleKey: 'customButtonConfig', icon: 'mdi:view-dashboard', content: this._renderCustomButtonPanel() },
      { titleKey: 'mapConfig', icon: 'mdi:map-search', content: this._renderMapPopupConfig() },
      { titleKey: 'imagesConfig', icon: 'mdi:image', content: this._renderImageConfig() },
      { titleKey: 'servicesConfig', icon: 'mdi:car-cog', content: this._renderServicesConfig() },
      { titleKey: 'themeLangConfig', icon: 'mdi:palette', content: this._renderThemesConfig() },
      { titleKey: 'showConfig', icon: 'mdi:toggle-switch', content: this._renderShowOptions() },
    ];

    const configList = defaultConfigList.map((config) =>
      this.panelTemplate(config.titleKey, config.icon, config.content)
    );

    return html`${configList}`;
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
      <ha-entity-picker
        .hass=${this.hass}
        .value=${this._config?.entity}
        .required=${true}
        .configValue=${'entity'}
        @value-changed=${this._valueChanged}
        .allow-custom-entity=${false}
        .includeEntities=${entities}
      ></ha-entity-picker>
      ${nameComboBox}
    `;
  }

  private _renderCardButtonPanel(): TemplateResult {
    const localize = (key: string): string => this.localize(`editor.buttonConfig.${key}`);

    const translate = {
      info: this.localize('editor.common.infoButton'),
      defaultCards: localize('defaultCards'),
      buttonGridSwipe: localize('buttonGridSwipe'),
      useButtonSwipe: localize('useButtonSwipe'),
      swipeRows: localize('swipeRows'),
    };

    // Split cards into default and added
    const defaultCards = this.baseCardTypes.filter((card) => !this.isAddedCard(card.type));

    const defaultCardList = this._renderSection({
      key: 'default-cards',
      title: translate.defaultCards,
      cards: this.renderCardItems(defaultCards),
      toggle: () => this._toggleSubButtonPanel('default-cards'),
      isVisible: true,
      hideHeader: true,
    });

    return html`<ha-alert alert-type="info">${translate.info}</ha-alert>${defaultCardList}`;
  }

  private _renderCustomButtonPanel(): TemplateResult {
    const localize = (key: string): string => this.localize(`editor.buttonConfig.${key}`);

    const translate = {
      info: this.localize('editor.customButtonConfig.info'),
      customCards: localize('customCards'),
      addNewCard: localize('addNewCard'),
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
            .toastId=${'customButtonConfig'}
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

    const customCards = this.baseCardTypes.filter((card) => this.isAddedCard(card.type));

    const sections = [
      {
        key: 'add-new-card',
        title: translate.addNewCard,
        cards: [addNewCardForm],
        visible: true,
        isVisible: this._visiblePanel.has('add-new-card'),
      },
      {
        key: 'added-cards',
        title: translate.customCards,
        cards: this.renderCardItems(customCards),
        visible: this.isAnyAddedCard,
        isVisible: true, // Always show the added cards
      },
    ].map((section) => ({
      ...section,
      toggle: () => this._toggleSubButtonPanel(section.key),
    }));

    const buttonsConfigWrapper = sections.map((section) => this._renderSection(section as any));

    return html`<ha-alert alert-type="info">${translate.info}</ha-alert>${buttonsConfigWrapper}`;
  }

  private _renderSubCardConfig(card: CardTypeConfig): TemplateResult {
    if (!card) {
      return html``;
    }
    const { name, icon } = card;

    const subCardHeader = html`
      <div class="sub-card-header">
        <ha-icon-button .path=${mdiArrowLeft} @click=${() => this._closeSubCardEditor(card)}></ha-icon-button>
        <div class="card-tab active">
          <ha-button>${name}</ha-button>
          <ha-icon icon=${icon}></ha-icon>
        </div>
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

    const cardEditor = html`
      <custom-card-ui-editor
        .hass=${this.hass}
        .editor=${this}
        ._config=${this._config}
        .cardType=${card}
        .isCardPreview=${this._cardPreview}
        .isCustomCard=${this.useCustomCard(card.config)}
        .isAddedCard=${this.isAddedCard(card.type)}
        @custom-card-editor-changed=${(ev: CustomEvent) => this._handleCustomCardEditorChange(ev)}
      ></custom-card-ui-editor>
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

    const tireType = html`${this._renderTireConfig()}`;

    const tabs = [
      { key: 'buttonConfig', label: 'Button Config', content: buttonTemplateWrapper },
      { key: 'cardConfig', label: 'Card Config', content: cardEditor },
      { key: 'actionConfig', label: 'Action Config', content: tapActionConfig },
    ];

    if (card.type === 'tyreCards') {
      tabs.push({ key: 'tireConfig', label: 'Tire Config', content: tireType });
    }

    const tabsContent = Create.TabBar({
      activeTabIndex: this._activeTabIndex || 0,
      onTabChange: (index: number) => (this._activeTabIndex = index),
      tabs: tabs,
    });

    const content = html` <div class="sub-card-config">${subCardHeader} ${tabsContent}</div> `;

    return content;
  }

  private _renderShowOptions(): TemplateResult {
    let showOptions = editorShowOpts(this._selectedLanguage);
    // Filter out the enable_map_popup option
    showOptions = showOptions.filter((option) => option.configKey !== 'enable_map_popup');
    // console.log('showOptions', showOptions);
    const maxButtons =
      this.baseCardTypes.length % 2 === 0 ? this.baseCardTypes.length / 2 : this.baseCardTypes.length / 2 + 1;
    const buttonGridSwipe = html`
      <div class="card-type-item">
        <div class="card-type-content">
          <ha-textfield
            .type=${'number'}
            .label=${this.localize('editor.buttonConfig.swipeRows')}
            .configValue=${'rows_size'}
            .configBtnType=${'button_grid'}
            .value=${this._config.button_grid?.rows_size ?? 2}
            .min=${1}
            .max=${maxButtons}
            .disabled=${!this._config.button_grid.use_swiper}
            @input=${this._valueChanged}
          ></ha-textfield>
        </div>
        <div class="card-type-content">
          <ha-formfield .label=${this.localize('editor.buttonConfig.useButtonSwipe')}>
            <ha-checkbox
              .checked=${this._config.button_grid?.use_swiper ?? true}
              .configValue=${'use_swiper'}
              .configBtnType=${'button_grid'}
              @change=${this._valueChanged}
            ></ha-checkbox>
          </ha-formfield>
        </div>
      </div>
    `;

    return html`
      <div class="switches">
        ${showOptions.map((option) => {
          const { label, configKey } = option;
          return html`
            <ha-formfield .label=${label}>
              <ha-checkbox
                .checked=${this._config[configKey] ?? true}
                .configValue=${configKey}
                @change=${this._showValueChanged}
              ></ha-checkbox>
            </ha-formfield>
          `;
        })}
      </div>
      ${buttonGridSwipe} ${this._renderSectionOrder()}
    `;
  }

  private _renderSectionOrder(): TemplateResult {
    if (this._reloadSectionList) return html`<div>....</div>`;
    const sectionOrder = this._config.extra_configs?.section_order || [];

    return html`<div class="header-sm">
        <span>Section order</span>
      </div>
      <div class="sub-card-rows">
        <div id="section-list">
          ${repeat(
            sectionOrder,
            (section) => section,
            (section, index) =>
              html`
                <div class="card-type-item" data-id=${section}>
                  <div class="handle">
                    <ha-icon-button .path=${mdiDrag}> </ha-icon-button>
                  </div>
                  <div class="card-type-row">
                    <div class="card-type-icon">
                      <div class="icon-background">
                        <ha-icon icon="mdi:numeric-${index + 1}-circle"></ha-icon>
                      </div>
                    </div>
                    <div class="card-type-content">
                      <span class="primary">${section.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              `
          )}
        </div>
      </div>`;
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
          fixedMenuPosition
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
          fixedMenuPosition
        >
          ${themeMode.map((mode) => html`<mwc-list-item value=${mode.key}>${mode.name}</mwc-list-item>`)}
        </ha-select>
      </div>
    `;
    return themesConfig;
  }

  private _renderImageConfig(): TemplateResult {
    return html`<panel-images .editor=${this} .config=${this._config}></panel-images>`;
  }

  private _renderMapPopupConfig(): TemplateResult {
    const infoAlert = this.localize('editor.common.infoMap');
    const showOpts = editorShowOpts(this._selectedLanguage);
    const mapPopUp = showOpts.find((option) => option.configKey === 'enable_map_popup');
    const showAddress = showOpts.find((option) => option.configKey === 'show_address');
    const maptilerApiKey = this._config?.extra_configs?.maptiler_api_key || '';

    const sharedConfig = {
      component: this,
      pickerType: 'boolean' as 'boolean',
    };

    const mapBoolean = [
      {
        label: mapPopUp?.label,
        value: this._config.enable_map_popup ?? false,
        configValue: mapPopUp?.configKey,
      },
      {
        label: showAddress?.label,
        value: this._config.extra_configs?.show_address ?? true,
        configValue: showAddress?.configKey,
      },
    ];

    const themeMode = [
      { key: 'auto', name: 'Auto' },
      { key: 'dark', name: 'Dark' },
      { key: 'light', name: 'Light' },
    ];

    const maxMiniMapHeight = {
      label: 'Mini Map Height',
      value: this._config.extra_configs?.mini_map_height || 150,
      configValue: 'mini_map_height',
      pickerType: 'number' as 'number',
      options: { selector: { number: { max: 500, min: 150, mode: 'slider', step: 10 } } },
      component: this,
    };

    const deviceTracker = {
      label: 'Device Tracker (Optional)',
      value: this._config?.device_tracker || '',
      configValue: 'device_tracker',
      pickerType: 'entity' as 'entity',
      component: this,
      options: { includeDomains: ['device_tracker'] },
    };

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
          fixedMenuPosition
        >
          ${themeMode.map((mode) => html`<mwc-list-item value=${mode.key}>${mode.name}</mwc-list-item>`)}
        </ha-select>
      </div>
    `;

    const mapConfig = html`
      ${Picker(deviceTracker)}
      <ha-textfield
        label="Google API Key (Optional)"
        type="password"
        .value=${this._config?.google_api_key}
        .configValue=${'google_api_key'}
        @input=${this._valueChanged}
      ></ha-textfield>
      <ha-textfield
        label="Maptiler API Key (Optional)"
        type="password"
        .value=${maptilerApiKey}
        .configValue=${'maptiler_api_key'}
        @input=${this._valueChanged}
      ></ha-textfield>
      <div class="switches">
        ${mapBoolean.map((item) => {
          return Picker({ ...sharedConfig, ...item });
        })}
      </div>
      ${Picker(maxMiniMapHeight)} ${mapPopupConfig}
    `;

    return mapConfig;
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
      <div>
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
    return servicesSelector;
  }

  private _renderVersionInfo(): TemplateResult {
    const { version, updated } = this._latestRelease;
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
          <span>Latest: ${this._latestRelease.version}</span>
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

  private _renderTireConfig(): TemplateResult {
    const info = this.localize('editor.customTireBackground.info');
    const isUploaded = this._config.extra_configs?.tire_card_custom?.background.startsWith('/api/') || false;

    const urlInput = html`
      <ha-alert alert-type="info">${info}</ha-alert>
      <div class="custom-background-wrapper">
        <ha-textfield
          .label=${'Tire background url'}
          .disabled=${isUploaded}
          .value=${this._config.extra_configs?.tire_card_custom.background}
          .configIndex=${'extra_configs'}
          .configValue=${'background'}
          @change=${this._valueChanged}
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

    return html`${urlInput} ${imageSizeWrapper}`;
  }

  /* ---------------------------- TEMPLATE HELPERS ---------------------------- */

  private _renderSection({
    key,
    title,
    isVisible,
    toggle,
    cards,
    hideHeader = false,
  }: {
    key: string;
    title: string;
    isVisible: boolean;
    toggle: () => void;
    cards: TemplateResult;
    hideHeader?: boolean;
  }): TemplateResult {
    return html`
      <div class="card-types">
        ${!hideHeader
          ? html`
              <div class="header-sm">
                <span>${title}</span>
                <div section-id="${key}" class="subcard-icon" ?active=${isVisible} @click="${() => toggle()}">
                  <ha-icon icon="mdi:chevron-down"></ha-icon>
                </div>
              </div>
            `
          : nothing}
        <div class="sub-card-rows" ?hidden=${!isVisible}>${cards}</div>
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

  // Function to render card items
  private renderCardItems = (cards: CardTypeConfig[]): TemplateResult => {
    const cardList = html`${repeat(
      cards || [],
      (card) => card.type,
      (card, index) => {
        const hiddenClass = this.isButtonHidden(card.button);
        const addedCard = this.isAddedCard(card.type);
        const { icon, name, type, config } = card;
        return html`
          <div class="card-type-item" data-id=${card.type}>
            ${addedCard ? html`<div class="handle"><ha-icon-button .path=${mdiDrag}> </ha-icon-button></div>` : nothing}
            <div class="card-type-row" ?disabled=${hiddenClass}>
              <div class="card-type-icon">
                <div class="icon-background">
                  <ha-icon
                    icon=${icon ? icon : `mdi:numeric-${index + 1}-circle`}
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
              <ha-button-menu
                .corner=${'BOTTOM_START'}
                .fixed=${true}
                .menuCorner=${'START'}
                .activatable=${true}
                .naturalMenuWidth=${true}
                @closed=${(ev: Event) => ev.stopPropagation()}
              >
                <div class="action-icon" slot="trigger"><ha-icon icon="mdi:dots-vertical"></ha-icon></div>
                <mwc-list-item @click=${() => (this._activeSubcardType = type)} .graphic=${'icon'}>
                  <ha-icon icon="mdi:pencil" slot="graphic"></ha-icon>
                  Edit
                </mwc-list-item>
                <mwc-list-item @click=${() => this._toggleButtonHide(card.button)} .graphic=${'icon'}>
                  <ha-icon icon="${hiddenClass ? 'mdi:eye' : 'mdi:eye-off'}" slot="graphic"></ha-icon>
                  ${hiddenClass ? 'Unhide' : 'Hide'} button on card
                </mwc-list-item>
                ${addedCard
                  ? html`
                      <mwc-list-item
                        @click=${() => (this._confirmDeleteType = type)}
                        .graphic=${'icon'}
                        style="color: var(--error-color)"
                      >
                        <ha-icon icon="mdi:delete" slot="graphic" style="color: var(--error-color)"></ha-icon>
                        Delete
                      </mwc-list-item>
                    `
                  : nothing}
              </ha-button-menu>
              ${this._confirmDeleteType === type
                ? html` <div class="confirm-delete">
                  <span>${this.localize('editor.buttonConfig.deleteConfirm')}</span>
                  <ha-button @click=${this._removeCustomCard(type)}><ha-icon icon="mdi:check"></ha-button>
                  <ha-button @click=${() =>
                    (this._confirmDeleteType = null)}><ha-icon icon="mdi:close"> </ha-icon></ha-button>
                </div>`
                : nothing}
            </div>
          </div>
        `;
      }
    )}`;

    return html`<div id="card-list">${cardList}</div>`;
  };

  private panelTemplate = (
    titleKey: string,
    icon: string,
    content: TemplateResult,
    expanded: boolean = false,
    leftChevron: boolean = false
  ): TemplateResult => {
    const localTitle = this.localize(`editor.${titleKey}.title`);
    const localDesc =
      titleKey === 'customButtonConfig'
        ? this.localize(`editor.buttonConfig.desc`)
        : this.localize(`editor.${titleKey}.desc`);

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
  };

  private generateItemPicker(config: any, wrapperClass = 'item-content'): TemplateResult {
    return html`
      <div class=${wrapperClass}>
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

  private _removeCustomCard(cardType: string) {
    return () => {
      this._confirmDeleteType = null;
      const newAddedCards = { ...this._config.added_cards };
      delete newAddedCards[cardType];
      this._config = { ...this._config, added_cards: newAddedCards };
      this.configChanged();
      this.getBaseCardTypes();
      this.requestUpdate();
    };
  }

  private _handleCardTypeInput(ev: any): void {
    ev.stopPropagation();
    const target = ev.target;
    const configValue = target.configValue;
    const toastId = target.toastId;
    const errorMsg = target.errorMsg;
    const value = target.value;

    const newCardType = new Map(this._newCardType);
    newCardType.set(configValue, value);
    newCardType.set('toastId', toastId);
    newCardType.set('errorMsg', errorMsg);
    this._newCardType = newCardType;
    console.log(this._newCardType);

    this.requestUpdate();
  }

  private _addNewCard(): void {
    if (!this._config) {
      return;
    }
    const toastId = this._newCardType.get('toastId');
    const errorMsg = this._newCardType.get('errorMsg');
    const primary = this._newCardType.get('type');
    const icon = this._newCardType.get('icon') || 'mdi:car';
    if (primary && toastId && errorMsg) {
      const formattedCardType = primary.trim().replace(/ /g, '_').toLowerCase();
      if (
        this._config.added_cards?.hasOwnProperty(formattedCardType) ||
        this._config.use_custom_cards?.hasOwnProperty(formattedCardType)
      ) {
        const errorMsg = this.localize('card.common.toastCardAlreadyExists') + `: ${formattedCardType}`;
        this.launchToast(toastId, errorMsg);
        return;
      }
      let newAddedCards = { ...(this._config.added_cards || {}) };
      newAddedCards = {
        ...newAddedCards,
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

      this._config = {
        ...this._config,
        added_cards: newAddedCards,
      };

      const successMsg = this.localize('editor.buttonConfig.toastNewCard') + `: ${formattedCardType}`;
      this.configChanged();
      this.getBaseCardTypes();
      this._newCardType.forEach((_, key) => this._newCardType.delete(key));
      this.updateComplete.then(() => {
        this.launchToast('customButtonConfig', successMsg, true);
        setTimeout(() => {
          this._dispatchCardEvent(`btn_${formattedCardType}`);
          console.log('Added new card', formattedCardType);
        }, 500);
      });
    }
  }

  private _toggleButtonHide(type: string): void {
    const isHidden = this.isButtonHidden(type);
    const isAddedCard = this.isAddedCard(type);
    if (isAddedCard) {
      const addedCards = { ...this._config.added_cards };
      addedCards[type].button.hide = !isHidden;
      this._config = {
        ...this._config,
        added_cards: addedCards,
      };
    } else {
      const config = { ...this._config };
      config[type].hide = !isHidden;
      this._config = config;
    }
    this.configChanged();
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

    // Special handling for imagesConfig panel
    if (titleKey === 'imagesConfig' && (panel as any).expanded) {
      this._panelImages.initSortable();
    }

    if (titleKey === 'customButtonConfig' && (panel as any).expanded) {
      this._initCardSortable('customButtonConfig');
    }

    if (titleKey === 'showConfig' && (panel as any).expanded) {
      this._initSectionSortable();
    }

    // Get all panels
    const panels = this.shadowRoot?.querySelectorAll('ha-expansion-panel') as NodeListOf<HTMLElement>;

    // Update panel visibility
    panels.forEach((p) => {
      if ((p as any).expanded) {
        // Keep the expanded panel visible
        p.style.display = 'block';
      } else {
        // Hide or show other panels based on whether the triggering panel is expanded
        p.style.display = p.id === titleKey ? 'block' : 'none';
      }
    });

    // Ensure all panels are shown if no panel is expanded
    if (![...panels].some((p) => (p as any).expanded)) {
      panels.forEach((p) => {
        p.style.display = 'block';
      });
    }
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
      toast.remove();
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

  private _showValueChanged(ev: any): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    const configValue = target.configValue;

    const updates: Partial<VehicleCardConfig> = {};

    let extraConfig = { ...(this._config.extra_configs || {}) };
    let sectionOrderChanged = false;
    if (configValue === 'show_address') {
      extraConfig.show_address = target.checked;
      updates.extra_configs = extraConfig;
    } else {
      updates[configValue] = target.checked;
      if (['show_header_info', 'show_slides', 'show_map', 'show_buttons'].includes(configValue)) {
        let sectionOrder = [...(this._config.extra_configs?.section_order || [])];
        const section = {
          show_header_info: SECTION.HEADER_INFO,
          show_slides: SECTION.IMAGES_SLIDER,
          show_map: SECTION.MINI_MAP,
          show_buttons: SECTION.BUTTONS,
        };
        for (const sectionKey of Object.keys(section)) {
          if (updates[sectionKey] === true) {
            sectionOrder.push(section[sectionKey]);
          } else if (updates[sectionKey] === false) {
            sectionOrder = sectionOrder.filter((s) => s !== section[sectionKey]);
          }
        }
        sectionOrder = [...new Set(sectionOrder)];
        updates.extra_configs = {
          ...extraConfig,
          section_order: sectionOrder,
        };
        sectionOrderChanged = true;
        console.log('Section order changed:', sectionOrder);
      }
    }
    if (Object.keys(updates).length > 0) {
      this._config = {
        ...this._config,
        ...updates,
      };
      fireEvent(this, 'config-changed', { config: this._config });
      if (sectionOrderChanged) {
        this._reloadSectionList = true;

        setTimeout(() => {
          if (this._sectionSortable) {
            this._sectionSortable.destroy();
            this._reloadSectionList = false;
            setTimeout(() => {
              this._initSectionSortable();
            }, 0);
          }
        }, 50);
      }
    }
  }
  public _valueChanged(ev: any): void {
    ev.stopPropagation();
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
      if (key === 'rows_size' && newValue > this.baseCardTypes.length / 2 + 1) {
        return;
      }

      updates.button_grid = {
        ...this._config.button_grid,
        [key]: parseInt(newValue) || newValue,
      };
      console.log('Button grid config changed:', key, newValue);
    } else if (configIndex === 'extra_configs') {
      const key = configValue as keyof VehicleCardConfig['extra_configs']['tire_card_custom'];
      newValue = key === 'background' ? target.value : ev.detail.value;
      updates.extra_configs = {
        ...this._config.extra_configs,
        tire_card_custom: {
          ...this._config.extra_configs?.tire_card_custom,
          [key]: parseInt(newValue) || newValue,
        },
      };
    } else if (configValue === 'device_tracker') {
      updates.device_tracker = newValue;
      console.log('Device tracker changed:', newValue);
    } else if (configValue === 'mini_map_height') {
      newValue = ev.detail.value;
      updates.extra_configs = {
        ...this._config.extra_configs,
        mini_map_height: parseInt(newValue) || newValue,
      };
      console.log('Mini map height changed:', newValue);
    } else if (configValue === 'show_address') {
      newValue = target.checked !== undefined ? target.checked : ev.detail.value;
      updates.extra_configs = {
        ...this._config.extra_configs,
        show_address: newValue,
      };
      console.log('Show address changed:', target.checked);
    } else if (configValue === 'maptiler_api_key') {
      newValue = target.value;
      updates.extra_configs = {
        ...this._config.extra_configs,
        maptiler_api_key: newValue,
      };
      console.log('Maptiler API key changed:', newValue);
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
    }

    this.updateComplete.then(() => {
      this._toggleConfigPanel(card.type);
    });
  }

  private _toggleConfigPanel(prevCardType: string): void {
    let panel = 'buttonConfig';
    if (!['tripCards', 'vehicleCards', 'ecoCards', 'tyreCards'].includes(prevCardType)) {
      panel = 'customButtonConfig';
    }
    const panels = this.shadowRoot?.querySelectorAll('ha-expansion-panel') as NodeListOf<HTMLElement>;
    panels.forEach((p) => {
      p.style.display = p.id === panel ? 'block' : 'none';
      (p as any).expanded = p.id === panel;
    });
    if (panel === 'customButtonConfig') {
      this._initCardSortable('customButtonConfig');
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
    BenzEditor: VehicleCardEditor;
  }

  interface HTMLElementTagNameMap {
    'vehicle-info-card-editor': LovelaceCardEditor;
  }
}
