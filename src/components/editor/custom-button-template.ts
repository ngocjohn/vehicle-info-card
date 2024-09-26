import { LitElement, html, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { isString } from 'es-toolkit';

import { ExtendedButtonConfigItem, CardTypeConfig } from '../../types';

import editorcss from '../../css/editor.css';

@customElement('custom-button-template')
export class CustomButtonTemplate extends LitElement {
  @property({ type: Object }) editor!: any;
  @property() button!: ExtendedButtonConfigItem;
  @property() card!: CardTypeConfig;
  @property({ type: Boolean }) isButtonPreview: boolean = false;

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
    const isDefaultCard = this.button.isDefaultCard;
    const localizeKey = this.localizeKey;

    const checkboxConfigs = [
      ...(isDefaultCard
        ? [{ label: localizeKey('useCustomButton'), value: this.button.enabled, configValue: 'enabled' }]
        : []),
      { label: localizeKey('hideButton'), value: this.button.hide, configValue: 'hide' },
    ];

    return html`
      ${!this.button.isHidden
        ? html`<div class="item-content">
            <ha-button @click=${() => this.editor._toggleShowButton(this.card)}>${localizeKey('showButton')}</ha-button>
          </div> `
        : ''}
      <div class="item-content">
        <ha-button @click=${(ev: Event) => this._dispatchEvent(ev, 'toggle-preview-button')}
          >${!this.isButtonPreview ? localizeKey('preview') : localizeKey('hidePreview')}</ha-button
        >
      </div>
      <div class="item-content">
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
      </div>
      <div class="item-content">
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
      </div>
    `;
  }

  private _buttonTitleIconForms(): TemplateResult {
    const { primary, icon, entity } = this.button;
    const button = this.card.button;

    const attributes = entity ? Object.keys(this.editor.hass.states[entity].attributes) : [];
    const attrOpts = [...attributes.map((attr) => ({ value: attr, label: attr }))];

    const entitySelector = html`
      <div class="item-content">
        <ha-entity-picker
          .hass=${this.editor.hass}
          .label=${'Entity'}
          .value=${this.button.entity || ''}
          .configValue=${'entity'}
          .configBtnType=${button}
          @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
          .allow-custom-entity
        ></ha-entity-picker>
      </div>
    `;

    const attributeSelector = html`
      <div class="item-content">
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
      </div>
    `;

    const primaryInput = html`
      <div class="item-content">
        <ha-textfield
          .label=${'Button Title'}
          .value=${primary}
          .configValue=${'primary'}
          .configBtnType=${button}
          @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
        ></ha-textfield>
      </div>
    `;

    const iconSelector = html`
      <div class="item-content">
        <ha-icon-picker
          .label=${'Icon'}
          .value=${icon}
          .configValue=${'icon'}
          .configBtnType=${button}
          @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
        ></ha-icon-picker>
      </div>
    `;

    return html` ${primaryInput}${iconSelector} ${entitySelector}${attributeSelector}`;
  }

  private _templateUI(label: string, value: string, configValue: string, helper: string): TemplateResult {
    const button = this.card.button;

    return html`
      <div class="template-ui">
        <p>${label}</p>
        <ha-code-editor
          .mode=${'jinja2'}
          .dir=${'ltr'}
          .value=${value}
          .configValue=${configValue}
          .configBtnType=${button}
          @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
          .linewrap=${false}
          .autofocus=${true}
          .autocompleteEntities=${true}
          .autocompleteIcons=${true}
        ></ha-code-editor>
        <ha-input-helper-text>${helper}</ha-input-helper-text>
      </div>
    `;
  }

  render(): TemplateResult {
    const localizeKey = this.localizeKey;
    const { notify, secondary } = this.button;
    const editorHeader = this._editorHeader();
    const buttonTitleIconForms = this._buttonTitleIconForms();
    const secondaryUI = this._templateUI(
      localizeKey('secondaryInfo'),
      secondary,
      'secondary',
      localizeKey('secondaryInfoHelper')
    );
    const notifyUI = this._templateUI(localizeKey('notifyInfo'), notify, 'notify', localizeKey('notifyInfoHelper'));

    return html` <div class="card-button-cfg">${editorHeader}${buttonTitleIconForms}</div>
      ${secondaryUI}${notifyUI}`;
  }

  private _dispatchEvent(ev: any, type: string) {
    const target = ev.target;
    const configValue = target?.configValue;
    const configBtnType = target?.configBtnType;
    const newValue =
      target.checked !== undefined
        ? target.checked
        : configValue === 'attribute' || configValue === 'button_type'
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
    console.log('dispatched event', type, configValue, configBtnType, value);
  }
}
