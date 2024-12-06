/* eslint-disable @typescript-eslint/no-explicit-any */

import { isString } from 'es-toolkit';
import { LitElement, html, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { VehicleCardEditor } from '../../editor';
import { ExtendedButtonConfigItem, CardTypeConfig } from '../../types';
import './custom-yaml-editor';

@customElement('custom-button-template')
export class CustomButtonTemplate extends LitElement {
  @property({ type: Object }) editor!: VehicleCardEditor;
  @property({ attribute: false }) button!: ExtendedButtonConfigItem;
  @property({ attribute: false }) card!: CardTypeConfig;
  @property({ type: Boolean }) isButtonPreview: boolean = false;
  @state() _yamlMode = false;

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  private get cardButton(): string {
    return this.card.button;
  }

  private localizeKey = (label: string): string => {
    return this.editor.localize(`editor.buttonConfig.${label}`);
  };

  private _editorHeader(): TemplateResult {
    const localizeKey = this.localizeKey;

    return html`
      <div class="card-button-cfg ha-button">
        ${!this.button.isHidden
          ? html`<ha-button @click=${() => this.editor._toggleShowButton(this.card)}
              >${localizeKey('showButton')}</ha-button
            >`
          : ''}
        <ha-button @click=${(ev: Event) => this._dispatchEvent(ev, 'toggle_preview_button')}
          >${!this.isButtonPreview ? localizeKey('preview') : localizeKey('hidePreview')}</ha-button
        >
        <ha-button @click=${() => (this._yamlMode = !this._yamlMode)}>
          ${this._yamlMode ? 'Hide' : 'Show'} YAML
        </ha-button>
      </div>
    `;
  }

  private _buttonTitleIconForms(): TemplateResult {
    const localizeKey = this.localizeKey;
    const { primary, icon, entity, isDefaultCard } = this.button;
    const button = this.card.button;

    const attributes = entity ? Object.keys(this.editor.hass.states[entity].attributes) : [];
    const attrOpts = [...attributes.map((attr) => ({ value: attr, label: attr }))];

    const buttonTypeSelector = html`
      <ha-combo-box
        .item-value-path=${'value'}
        .item-label-path=${'label'}
        .label=${'Button Type'}
        .value=${this.button.button_type || 'default'}
        .configValue=${'button_type'}
        .configBtnType=${this.card.button}
        .items=${[
          { value: 'default', label: 'Default' },
          { value: 'action', label: 'Action' },
        ]}
        @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-combo-box>
    `;

    const entitySelector = html`
      <ha-entity-picker
        .hass=${this.editor.hass}
        .label=${'Entity'}
        .value=${this.button.entity || ''}
        .configValue=${'entity'}
        .configBtnType=${button}
        @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-entity-picker>
    `;

    const attributeSelector = html`
      <ha-combo-box
        .item-value-path=${'value'}
        .item-label-path=${'label'}
        .label=${'Attribute'}
        .hass=${this.editor.hass}
        .value=${this.button.attribute || ''}
        .configValue=${'attribute'}
        .configBtnType=${button}
        .items=${attrOpts}
        @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-combo-box>
    `;

    const primaryInput = html`
      <ha-textfield
        .label=${'Button Title'}
        .value=${primary || ''}
        .configValue=${'primary'}
        .configBtnType=${button}
        @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-textfield>
    `;

    const iconSelector = html`
      <ha-icon-picker
        .label=${'Icon'}
        .value=${icon}
        .configValue=${'icon'}
        .configBtnType=${button}
        @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-icon-picker>
    `;

    const checkboxConfigs = [
      ...(isDefaultCard
        ? [{ label: localizeKey('useCustomButton'), value: this.button.enabled, configValue: 'enabled' }]
        : []),
      { label: localizeKey('hideButton'), value: this.button.hide, configValue: 'hide' },
    ];

    const checkBoxes = html` <div class="card-button-cfg">
      ${checkboxConfigs.map(
        (config) => html`
          <ha-formfield .label=${config.label}>
            <ha-checkbox
              .checked=${config.value}
              .configValue=${config.configValue}
              .configBtnType=${this.card.button}
              @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
            ></ha-checkbox>
          </ha-formfield>
        `
      )}
    </div>`;
    return html` ${checkBoxes}
      <div class="card-button-cfg">
        ${buttonTypeSelector} ${primaryInput}${iconSelector} ${entitySelector}${attributeSelector}
      </div>`;
  }

  private _createTemplateSelector(configKey: string): TemplateResult {
    const cardButton = this.card.button;
    const button = this.button;
    const value = button[configKey] || '';
    const localTrans = configKey.replace('_template', '');
    const label = this.localizeKey(`${localTrans}Info`);
    const helper = this.localizeKey(`${localTrans}InfoHelper`);

    return html`
      <ha-selector
        .hass=${this.editor.hass}
        .value=${value}
        .configValue=${configKey}
        .configBtnType=${cardButton}
        .label=${label}
        .helper=${helper}
        .required=${false}
        .selector=${{ template: {} }}
        @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-selector>
    `;
  }

  private _renderTemplateSelector(): TemplateResult {
    const templateSelectors = ['secondary', 'notify', 'icon_template', 'color_template', 'picture_template'];
    return html`${templateSelectors.map((configKey) => this._createTemplateSelector(configKey))}`;
  }

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
        .hass=${this.editor.hass}
        .editor=${this.editor}
        .configDefault=${defaultConfig}
        .isDefaultCard=${isDefaultCard}
        .configType=${this.cardButton}
      ></custom-yaml-editor>
    `;
  }

  render(): TemplateResult {
    const editorHeader = this._editorHeader();
    const buttonTitleIconForms = this._buttonTitleIconForms();
    const templateConfig = this._renderTemplateSelector();
    const yamlEditor = this._renderYamlEditor();

    const uiModeWrapper = html` ${buttonTitleIconForms} ${templateConfig} `;

    return html`${editorHeader}${this._yamlMode ? yamlEditor : uiModeWrapper}`;
  }

  private _dispatchEvent(ev: any, type: string) {
    const customEventValues = [
      'attribute',
      'button_type',
      'secondary',
      'notify',
      'icon_template',
      'color_template',
      'picture_template',
    ];
    const target = ev.target;
    const configValue = target?.configValue;
    const configBtnType = target?.configBtnType;
    const newValue =
      target.checked !== undefined
        ? target.checked
        : customEventValues.includes(configValue)
        ? ev.detail.value
        : target.value;
    const value = isString(newValue) ? newValue.trim() : newValue;
    const eventDetail = {
      detail: {
        type: type,
        config: this.card.config,
        card: this.card,
        button: this.cardButton,
        configValue: configValue,
        configBtnType: configBtnType,
        value: value,
      },
      bubbles: true,
      composed: true,
    };
    this.dispatchEvent(new CustomEvent('custom-button-changed', eventDetail));
    console.log('dispatched event', type, configValue, configBtnType, eventDetail);
  }
}
