import { LitElement, html, TemplateResult, CSSResultGroup, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { VehicleCardEditor } from '../../editor';
import { ExtendedButtonConfigItem, CardTypeConfig, HomeAssistant, BaseButtonConfig } from '../../types';
import './custom-yaml-editor';
import {
  BTN_ACTION_SCHEMA,
  BTN_EXTRA_TEMPLATES_SCHEMA,
  BTN_SECONDARY_SCHEMA,
  BTN_TYPE_PRIMARY_SCHEMA,
  GENERIC_LABEL,
  USE_CUSTOM_HIDE_SCHEMA,
} from './forms/base-button-schema';

@customElement('custom-button-template')
export class CustomButtonTemplate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) editor!: VehicleCardEditor;
  @property({ attribute: false }) button!: ExtendedButtonConfigItem;
  @property({ attribute: false }) card!: CardTypeConfig;
  @property({ type: Boolean }) isButtonPreview: boolean = false;
  @state() _yamlMode = false;

  static get styles(): CSSResultGroup {
    return [
      css`
        *[hidden] {
          display: none;
        }
      `,
      editorcss,
    ];
  }

  private get cardButton(): string {
    return this.card.button;
  }

  private localizeKey = (label: string): string => {
    return this.editor.localize(`editor.buttonConfig.${label}`);
  };

  private _editorHeader(): TemplateResult {
    const localizeKey = this.localizeKey;
    const previewLabel = this.editor._btnPreview ? localizeKey('hidePreview') : localizeKey('preview');
    const yamlLabel = this._yamlMode ? 'Hide YAML' : 'Show YAML';
    return html`
      <div class="card-button-cfg ha-button">
        <ha-button
          .outlined=${true}
          .label=${localizeKey('showButton')}
          ?hidden=${this.button.isHidden}
          @click=${() => this.editor._toggleShowButton(this.card)}
        ></ha-button>
        <ha-button
          .outlined=${true}
          @click=${() => this.editor._toggleBtnPreview(this.cardButton)}
          .label=${previewLabel}
        >
        </ha-button>
        <ha-button .outlined=${true} @click=${() => (this._yamlMode = !this._yamlMode)} .label=${yamlLabel}>
        </ha-button>
      </div>
    `;
  }

  private _generateButtonFormSchema(): TemplateResult {
    const DATA = {
      ...this.button,
    };

    const _schema = [
      ...USE_CUSTOM_HIDE_SCHEMA(DATA.isDefaultCard!),
      ...BTN_TYPE_PRIMARY_SCHEMA,
      ...BTN_SECONDARY_SCHEMA(DATA.entity ?? ''),
      ...BTN_EXTRA_TEMPLATES_SCHEMA,
      ...BTN_ACTION_SCHEMA,
    ];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${DATA}
        .schema=${_schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._handleValueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: any): string => {
    if (schema.name === 'entity') {
      return '';
    } else if (GENERIC_LABEL.includes(schema.name)) {
      return schema.label;
    } else {
      return this.localizeKey(`${schema.label}`) || schema.label || '';
    }
  };

  private _computeHelper = (schema: any): string => {
    if (schema.helper !== undefined) {
      return this.localizeKey(`${schema.helper}`) || '';
    }
    return '';
  };

  private _renderYamlEditor(): TemplateResult {
    if (!this._yamlMode) {
      return html``;
    }
    const isDefaultCard = this.button.isDefaultCard;
    const defaultConfig = isDefaultCard
      ? this.editor._config[this.cardButton]
      : this.editor._config['added_cards'][this.cardButton].button;

    return html`
      <custom-yaml-editor
        .hass=${this.hass}
        .editor=${this.editor}
        .configDefault=${defaultConfig}
        .isDefaultCard=${isDefaultCard}
        .configType=${this.cardButton}
      ></custom-yaml-editor>
    `;
  }

  render(): TemplateResult {
    if (!this.hass || !this.editor || !this.button || !this.card) {
      return html``;
    }

    const editorHeader = this._editorHeader();
    const buttonBaseConfig = this._generateButtonFormSchema();
    const yamlEditor = this._renderYamlEditor();

    return html`${editorHeader}${this._yamlMode ? yamlEditor : buttonBaseConfig}`;
  }

  private _handleValueChanged = (ev: CustomEvent): void => {
    ev.stopPropagation();
    let value = ev.detail.value;
    console.log('Value changed:', value);
    ['isDefaultCard', 'useCustomButton', 'isHidden'].forEach((key) => {
      delete value[key];
    });
    value.enabled = !this.button.isDefaultCard ? (value.enabled = true) : value.enabled;
    // console.log('Dispatching config:', value);
    this._dispatchConfig(value as BaseButtonConfig);
  };

  private _dispatchConfig(config: BaseButtonConfig): void {
    this.button = {
      ...this.button,
      ...config,
    };

    const eventDetail = {
      detail: {
        value: { ...config },
        configBtnType: this.cardButton,
      },
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('custom-button-changed', eventDetail));
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-button-template': CustomButtonTemplate;
  }
}
