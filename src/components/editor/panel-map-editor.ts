import { EntityConfig, ExtraMapCardConfig, MapEntityConfig, processConfigEntities } from 'extra-map-card';
import { LitElement, html, TemplateResult, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import { editorShowOpts } from '../../const/data-keys';
import editorcss from '../../css/editor.css';
import { VehicleCardEditor } from '../../editor';
import { HomeAssistant, LovelaceConfig, MapPopupConfig, VehicleCardConfig } from '../../types';
import { fireEvent } from '../../types/ha-frontend';
import { _convertToExtraMapConfig, Create } from '../../utils';
import { Picker } from '../../utils/create';
import { maptilerPopupSchema } from '../editor/forms/map-schema';

@customElement('vic-panel-map-editor')
export class VicPanelMapEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public lovelace?: LovelaceConfig;
  @property({ attribute: false }) editor!: VehicleCardEditor;
  @property({ attribute: false }) _config!: VehicleCardConfig;
  @state() _mapCardConfig?: MapPopupConfig;
  @state() _mapEntitiesConfig?: EntityConfig[];
  @state() _useSingleMapCard: boolean = false;
  @state() _yamlMode: boolean = false;

  @state() private _tmpYamlConfig?: ExtraMapCardConfig;
  @query('#extra-map-editor') private _cardElementEditor?: HTMLElement;

  private get _mapPopupConfig(): MapPopupConfig {
    return this._config.map_popup_config || {};
  }

  private get _deviceTrackerEntity(): MapEntityConfig {
    return {
      entity: this._config.device_tracker!,
      label_mode: this._mapPopupConfig.label_mode,
      attribute: this._mapPopupConfig.attribute,
      focus: true,
    };
  }

  private get _extraMapCardConfig(): ExtraMapCardConfig {
    const mapConfig = _convertToExtraMapConfig(
      this._mapPopupConfig,
      this._config.extra_configs.maptiler_api_key!,
      this._mapEntitiesConfig
    );
    return mapConfig;
  }

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);

    if (_changedProperties.has('_config') && this._config.map_popup_config) {
      this._mapCardConfig = {
        ...(this._config.map_popup_config || {}),
      };
      this._mapEntitiesConfig = this._mapCardConfig.extra_entities
        ? processConfigEntities<MapEntityConfig>(this._mapCardConfig.extra_entities, false)
        : processConfigEntities<MapEntityConfig>([this._deviceTrackerEntity], false);
      this._useSingleMapCard = this._mapCardConfig.single_map_card ?? false;
    }

    if (_changedProperties.has('_config') && this._config.extra_configs) {
      if (!this._config.extra_configs.maptiler_api_key && this._config.map_popup_config.single_map_card) {
        this._useSingleMapCard = false;
        fireEvent(this, 'config-changed', {
          config: {
            ...this._config,
            map_popup_config: {
              ...this._config.map_popup_config,
              single_map_card: false,
            },
          },
        });
      }

      if (_changedProperties.has('_yamlMode') && !this._yamlMode) {
        const oldYamlMode = _changedProperties.get('_yamlMode') as boolean;
        if (oldYamlMode === true && this._yamlMode === false) {
          if (this._tmpYamlConfig) {
            const mapConfig = this._convertToBaseMapConfig(this._tmpYamlConfig);
            const miniMapConfig = { ...(this._config.map_popup_config || {}) };
            this._config = {
              ...this._config,
              map_popup_config: {
                ...miniMapConfig,
                ...mapConfig,
              },
            };
            fireEvent(this, 'config-changed', {
              config: this._config,
            });
            this._tmpYamlConfig = undefined;
          }
        }
      }
    }
    if (
      (_changedProperties.has('_useSingleMapCard') && this._useSingleMapCard) ||
      _changedProperties.has('_yamlMode')
    ) {
      setTimeout(() => {
        this._hideSelectors();
      }, 0);
    }
  }

  private _hideSelectors() {
    const formRoot = this._cardElementEditor
      ?.querySelector('hui-card-element-editor')
      ?.shadowRoot?.querySelector('extra-map-editor')
      ?.shadowRoot?.querySelector('ha-form')?.shadowRoot;

    if (formRoot) {
      const selectors = formRoot.querySelectorAll('.root > ha-selector') as NodeListOf<HTMLElement>;
      selectors.forEach((el: HTMLElement) => {
        el.style.display = 'none'; // hide title and apikey formns
      });
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const baseMapConfig = this._renderBaseMapConfig();
    const miniMapConfig = this._renderMiniMapConfig();
    const popupConfig = this._renderPopupConfig();

    const useSingleMapConfig = {
      configValue: 'single_map_card',
      configType: 'map_popup_config',
      options: {
        selector: {
          boolean: {},
        },
        disabled: !this._config?.extra_configs?.maptiler_api_key,
        helperText: `MapTiler API Key is required to use this option`,
      },
      value: this._config?.map_popup_config?.single_map_card || false,
      label: 'Mini Map as standalone card',
      component: this,
      pickerType: 'baseSelector' as 'baseSelector',
    };

    const useSingleCard = html`<div class="panel-container">${Picker(useSingleMapConfig)}</div>`;

    return html` <div class="card-config">
      ${baseMapConfig} ${useSingleCard}
      ${!this._useSingleMapCard
        ? html`
            <div class="panel-container">${miniMapConfig}</div>
            <div class="panel-container">${popupConfig}</div>
          `
        : this._renderExtraMapConfig()}
    </div>`;
  }

  private _renderBaseMapConfig(): TemplateResult {
    const maptilerInfo = `How to get Maptiler API Key?`;
    const docLink = 'https://github.com/ngocjohn/vehicle-info-card/blob/main/docs/Maptiler.md';

    const deviceTracker = this._config.device_tracker || '';
    const maptilerApiKey = this._config?.extra_configs?.maptiler_api_key || '';
    // const googleApiKey = this._config?.google_api_key || '';

    const sharedConfig = {
      component: this,
      pickerType: 'baseSelector' as 'baseSelector',
    };

    const baseMapConfig = [
      {
        configValue: 'device_tracker',
        options: {
          selector: {
            entity: { filter: { domain: 'device_tracker' } },
          },
        },
        value: deviceTracker,
        label: 'Device Tracker (optional)',
      },
      // {
      //   configValue: 'google_api_key',
      //   options: {
      //     selector: {
      //       text: { type: 'text' },
      //     },
      //   },
      //   value: googleApiKey,
      //   label: 'Google API Key (optional)',
      // },
      {
        configValue: 'maptiler_api_key',
        configType: 'extra_configs',
        options: {
          selector: {
            text: { type: 'text' },
          },
        },
        value: maptilerApiKey,
        label: 'Maptiler API Key (optional)',
      },
    ];

    const baseContent = html`
      ${baseMapConfig.map((config) => {
        return Picker({ ...sharedConfig, ...config });
      })}
      <div class="panel-container">
        <ha-alert alert-type="info">
          ${maptilerInfo}
          <mwc-button slot="action" @click="${() => window.open(docLink)}" label="More"></mwc-button>
        </ha-alert>
      </div>
    `;
    return Create.ExpansionPanel({
      content: baseContent,
      options: { header: 'Base Map Configuration', expanded: !this._useSingleMapCard },
    });
  }

  private _renderMiniMapConfig() {
    const { _getBooleanSelector, _getNumberSelector } = this;
    const showOpts = editorShowOpts(this.editor._selectedLanguage);
    const enableMapPopup = showOpts.find((opt) => opt.configKey === 'enable_map_popup');
    const showAddress = showOpts.find((opt) => opt.configKey === 'show_address');

    const mapPopupConfig = this._mapPopupConfig;
    const extraConfigs = this._config.extra_configs || {};

    const booleanFields = [
      _getBooleanSelector(
        enableMapPopup?.configKey!,
        this._config?.enable_map_popup || false,
        enableMapPopup?.label!,
        'default'
      ),
      _getBooleanSelector(
        showAddress?.configKey!,
        mapPopupConfig?.show_address ?? true,
        showAddress?.label!,
        'extra_configs'
      ),
      _getBooleanSelector('use_zone_name', mapPopupConfig?.use_zone_name ?? false, 'Use Zone Name'),
      _getBooleanSelector('us_format', mapPopupConfig?.us_format ?? false, 'US Address Format'),
      _getNumberSelector('mini_map_height', extraConfigs?.mini_map_height || 150, 'Mini Map Height', 'extra_configs'),
      _getNumberSelector('map_zoom', mapPopupConfig?.map_zoom || 14, 'Map Zoom'),
    ];

    const content = html` <div class="switches">
      ${booleanFields.map((config) => {
        return Picker({ ...config, component: this });
      })}
    </div>`;
    return Create.ExpansionPanel({
      content,
      options: { header: 'Mini Map Config', secondary: 'Options for mini map section', expanded: true },
    });
  }

  private _renderPopupConfig() {
    const popupSchema = html`
      <ha-form
        .hass=${this.hass}
        .data=${this._mapPopupConfig}
        .schema=${maptilerPopupSchema(this._config.device_tracker!, this._mapPopupConfig?.label_mode !== 'attribute')}
        .computeLabel=${(schema: any) => {
          const label = schema.label;
          return label;
        }}
        @value-changed=${this._handleFormValueChanged}
      ></ha-form>
    `;
    return Create.ExpansionPanel({
      content: popupSchema,
      options: { header: 'Popup Config', secondary: 'Options for popup' },
    });
  }

  private _renderExtraMapConfig(): TemplateResult {
    const mapConfigDoc = `Configuration is same as for HA Default Map Card`;
    const docLink = 'https://www.home-assistant.io/dashboards/map/';
    const content = html`
      <ha-alert alert-type="info">
        ${mapConfigDoc}
        <mwc-button slot="action" @click="${() => window.open(docLink)}" label="More"></mwc-button>
      </ha-alert>

      <div class="panel-container" id="extra-map-editor">
        ${!this._yamlMode
          ? html`
              <hui-card-element-editor
                .hass=${this.hass}
                .value=${this._extraMapCardConfig}
                .lovelace=${this.editor.lovelace}
                @config-changed=${this._handleExtraMapConfigChanged}
              ></hui-card-element-editor>
            `
          : html`
              <ha-yaml-editor
                .hass=${this.hass}
                .defaultValue=${this._extraMapCardConfig}
                .copyClipboard=${true}
                @value-changed=${this._yamlConfigChanged}
              ></ha-yaml-editor>
            `}
      </div>
      <div class="panel-container" style="justify-content: flex-end; display: flex;">
        <ha-button
          @click=${() => (this._yamlMode = !this._yamlMode)}
          .label=${this._yamlMode ? 'Show UI editor' : 'Show Code editor'}
        ></ha-button>
      </div>
    `;

    return html`<div class="panel-container">
      ${Create.ExpansionPanel({
        content,
        options: {
          header: 'Standalone Map Config',
          secondary: 'Options for extra map card',
          expanded: true,
          outlined: false,
          noCollapse: true,
        },
      })}
    </div>`;
  }

  private _yamlConfigChanged(ev: CustomEvent): void {
    const { isValid, value } = ev.detail;
    if (!isValid || !this._config) {
      return;
    }
    this._tmpYamlConfig = value as ExtraMapCardConfig;
    console.log('yaml config changed:', this._tmpYamlConfig);
  }

  private _handleExtraMapConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config) return;
    const config = ev.detail.config;
    if (!config) return;
    const mapConfig = this._convertToBaseMapConfig(config);

    const miniMapConfig = { ...(this._config.map_popup_config || {}) };
    this._config = {
      ...this._config,
      map_popup_config: {
        ...miniMapConfig,
        ...mapConfig,
      },
    };
    fireEvent(this, 'config-changed', {
      config: this._config,
    });
  }

  private _convertToBaseMapConfig = (config: ExtraMapCardConfig): Partial<MapPopupConfig> => {
    const map_styles = config.custom_styles;
    let extra_entities: MapEntityConfig[] = [];
    const entities = config.entities ? processConfigEntities<MapEntityConfig>(config.entities) : [];
    if (entities.length === 0) {
      extra_entities = [this._deviceTrackerEntity];
    } else if (entities.length > 0 && !entities.find((e) => e.entity === this._deviceTrackerEntity.entity)) {
      extra_entities = [this._deviceTrackerEntity, ...entities];
    } else {
      extra_entities = entities;
    }

    this._mapEntitiesConfig = extra_entities;

    const {
      fit_zones,
      default_zoom,
      hours_to_show,
      theme_mode,
      history_period,
      auto_fit,
      aspect_ratio,
      use_more_info,
    } = config;
    return {
      map_styles,
      extra_entities,
      fit_zones,
      default_zoom,
      hours_to_show,
      theme_mode,
      history_period,
      auto_fit,
      aspect_ratio,
      use_more_info,
    };
  };

  private _getBooleanSelector = (configValue: string, value: string | boolean, label: string, configType?: string) => ({
    label,
    value,
    configValue,
    configType: configType === 'default' ? undefined : configType || 'map_popup_config',
    pickerType: 'baseSelector' as 'baseSelector',
    component: this,
    options: {
      selector: {
        boolean: {},
      },
    },
  });

  private _getNumberSelector = (configValue: string, value: number, label: string, configType?: string) => ({
    label,
    value,
    configValue,
    configType: configType === 'default' ? undefined : configType || 'map_popup_config',
    pickerType: 'baseSelector' as 'baseSelector',
    component: this,
    options: {
      selector: {
        number: { min: 0, mode: 'box' },
      },
    },
  });

  private _handleFormValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const config = ev.detail.value;
    const newConfig = { ...this._config, map_popup_config: config };
    this._config = newConfig;
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  public _valueChanged(ev: any): void {
    ev.stopPropagation();
    // console.log('value changed', ev);
    if (!this._config) return;
    const target = ev.target;
    const configValue = target.configValue;
    const configType = target.configType;
    const value = typeof ev.detail.value === 'string' ? ev.detail.value.trim() : ev.detail.value;
    // console.log('value changed:', {
    //   configValue,
    //   configType,
    //   configIndex,
    //   value,
    // });

    const updates: Partial<VehicleCardConfig> = {};
    const _config = this._config;

    if (configType && configType !== undefined) {
      const key = configValue;
      if (_config![configType] && _config![configType][key] === value) {
        return;
      } else if (value === undefined || value === '') {
        updates[configType] = {
          ..._config[configType],
          [key]: undefined,
        };
      } else {
        updates[configType] = {
          ..._config[configType],
          [key]: value,
        };
      }
    } else {
      if (_config[configValue] === value) {
        return;
      } else if (value === undefined || value === '') {
        updates[configValue] = undefined;
      } else {
        updates[configValue] = value;
      }
    }

    if (Object.keys(updates).length > 0) {
      this._config = {
        ...this._config,
        ...updates,
      };
      fireEvent(this, 'config-changed', { config: this._config });
    }
  }
}
