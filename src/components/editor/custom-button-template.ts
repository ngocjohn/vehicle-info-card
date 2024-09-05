import { LitElement, html, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators';
import { isString } from 'es-toolkit';

import { HomeAssistantExtended as HomeAssistant, ButtonConfigItem, CardTypeConfig } from '../../types';

import editorcss from '../../css/editor.css';

@customElement('custom-button-template')
export class CustomButtonTemplate extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() button!: ButtonConfigItem;
  @property() card!: CardTypeConfig;
  @property({ type: Boolean }) useDefault: boolean = false;
  @property({ type: Boolean }) isAddedCard: boolean = false;
  @property({ type: Boolean }) isButtonPreview: boolean = false;

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  private get cardButton(): string {
    return this.card.button;
  }

  private _editorHeader(): TemplateResult {
    return html`<div class="sub-card-header">
      <ha-formfield style="${this.isAddedCard ? 'display: none;' : ''}" .label=${'Use custom button?'}>
        <ha-checkbox
          .checked=${this.useDefault}
          .disabled=${this.isAddedCard}
          .configValue=${'enabled'}
          .configBtnType=${this.card.button}
          @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
        ></ha-checkbox>
      </ha-formfield>
      <ha-button @click=${(ev: Event) => this._dispatchEvent(ev, 'toggle-show-button')}>Show Button</ha-button>
      <ha-button @click=${(ev: Event) => this._dispatchEvent(ev, 'toggle-preview-button')}
        >${!this.isButtonPreview ? 'Preview' : 'Close Preview'}</ha-button
      >
    </div>`;
  }

  private _buttonTitleIconForms(): TemplateResult {
    const { primary, icon } = this.button;
    const button = this.card.button;
    const useDefault = this.useDefault;

    const primaryInput = html`
      <ha-textfield
        .disabled=${!useDefault}
        .label=${'Button Title'}
        .value=${primary}
        .configValue=${'primary'}
        .configBtnType=${button}
        @change=${(ev: Event) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-textfield>
    `;

    const iconSelector = html`
      <ha-icon-picker
        .disabled=${!useDefault}
        .hass=${this.hass}
        .label=${'Icon'}
        .value=${icon}
        .configValue=${'icon'}
        .configBtnType=${button}
        @value-changed=${(ev: any) => this._dispatchEvent(ev, 'btn-changed')}
      ></ha-icon-picker>
    `;

    return html`${primaryInput}${iconSelector}`;
  }

  private _templateUI(label: string, value: string, configValue: string, helper: string): TemplateResult {
    const button = this.card.button;
    const useDefault = this.useDefault;

    return html`
      <div class="template-ui">
        <p>${label}</p>
        <ha-code-editor
          .mode=${'jinja2'}
          .hass=${this.hass}
          .dir=${'ltr'}
          .value=${value}
          .configValue=${configValue}
          .configBtnType=${button}
          .readOnly=${!useDefault}
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
    const { notify, secondary } = this.button;

    const editorHeader = this._editorHeader();
    const buttonTitleIconForms = this._buttonTitleIconForms();
    const secondaryUI = this._templateUI(
      'Secondary information',
      secondary,
      'secondary',
      'Use Jinja2 template to display secondary information'
    );
    const notifyUI = this._templateUI(
      'Notify config',
      notify,
      'notify',
      `The result must return 'True' boolean to show the notification`
    );

    return html`${editorHeader}
      <div class="card-button-cfg">${buttonTitleIconForms}</div>
      ${secondaryUI}${notifyUI}`;
  }

  private _dispatchEvent(ev: any, type: string) {
    const target = ev.target;
    const configValue = target?.configValue;
    const configBtnType = target?.configBtnType;
    const newValue = target.checked !== undefined ? target.checked : target.value;
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
  }
}
