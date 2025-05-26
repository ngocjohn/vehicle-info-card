// Lit
import { LitElement, html, CSSResultGroup, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import editorcss from '../../css/editor.css';
import { VehicleCardEditor } from '../../editor';
import { HomeAssistant, VehicleCardConfig } from '../../types';
import { fireEvent } from '../../types/ha-frontend/fire-event';

@customElement('custom-yaml-editor')
export class CustomYamlEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) editor!: VehicleCardEditor;
  @property({ attribute: false }) configDefault: any = {};
  @state() isDefaultCard?: boolean;
  @state() configType!: string;

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
  }

  protected updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
  }
  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="card-config">
        <ha-yaml-editor
          .hass=${this.hass}
          .defaultValue=${this.configDefault}
          .copyClipboard=${true}
          @value-changed=${this._onChange}
        ></ha-yaml-editor>
      </div>
    `;
  }

  private _onChange(ev: CustomEvent): void {
    ev.stopPropagation();
    const { isValid, value } = ev.detail;
    let config = { ...this.editor._config } as VehicleCardConfig;
    if (!config || !isValid) {
      return;
    }
    value.button.enabled = !this.isDefaultCard ? (value.button.enabled = true) : value.button.enabled;

    if (this.isDefaultCard) {
      config = {
        ...config,
        [this.configType]: value,
      };
    } else {
      config = {
        ...config,
        added_cards: {
          ...config.added_cards,
          [this.configType]: {
            ...config.added_cards[this.configType],
            button: value,
          },
        },
      };
    }
    fireEvent(this, 'config-changed', { config });
  }
}
