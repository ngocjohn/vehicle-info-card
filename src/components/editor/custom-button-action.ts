import { LitElement, html, TemplateResult, CSSResultGroup, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';

import {
  ExtendedButtonConfigItem,
  CardTypeConfig,
  HomeAssistantExtended as HomeAssistant,
  VehicleCardConfig,
} from '../../types';

import { fireEvent } from 'custom-card-helpers';
import editorcss from '../../css/editor.css';

const ACTIONSELECTOR = [
  {
    name: 'tap_action',
    label: 'Tap action',
    defaultAction: 'more-info',
  },
  {
    name: 'hold_action',
    label: 'Hold action',
    defaultAction: 'none',
  },
  {
    name: 'double_tap_action',
    label: 'Double tap action',
    defaultAction: 'none',
  },
];

@customElement('custom-button-action')
export class CustomButtonAction extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Object }) config!: VehicleCardConfig;
  @property() button!: ExtendedButtonConfigItem;
  @property() card!: CardTypeConfig;
  @property({ type: Boolean }) isButtonPreview: boolean = false;
  @state() _selectedAction: string = 'tap_action';

  static get styles(): CSSResultGroup {
    return [editorcss];
  }

  private get cardButton(): string {
    return this.card.button;
  }

  private _renderActionSelectors(): TemplateResult {
    const buttonAction = this.button.button_action || {};
    // Entity picker for selecting entity to interact with

    // Action selectors mapped from ACTIONSELECTOR
    const actionSelectors = ACTIONSELECTOR.map((action) => {
      return html`
        <div class="action-label">${action.label}</div>
        <div class="select-action">
          <ha-selector
            .hass=${this.hass}
            .label=${action.label}
            .selector=${{
              ui_action: { default_action: action.defaultAction },
            }}
            .value=${buttonAction[action.name] || action.defaultAction}
            .configValue=${action.name}
            .configType=${'button_action'}
            @value-changed=${(ev: CustomEvent) => this._handleActionTypeChange(ev, action?.name, this.cardButton)}
          ></ha-selector>
        </div>
      `;
    });

    return html`${actionSelectors}`;
  }

  protected render(): TemplateResult {
    const infoAlert = 'You are using `default` button type, select `action` to use Tap Action features';

    const buttonAction = this.button.button_action || {};
    // Entity picker for selecting entity to interact with
    const defaultButtonAction = {
      entity: '',
      tap_action: { action: 'more-info' },
      double_tap_action: { action: 'none' },
      hold_action: { action: 'none' },
    };

    const entityPicker = html` <div class="select-action">
      <div class="action-label">Entity to interact with</div>

      <ha-entity-picker
        .hass=${this.hass}
        .value=${buttonAction.entity || defaultButtonAction.entity}
        .label=${'Entity to interact with'}
        .allow-custom-entity
        .configValue=${'entity'}
        .configBtnType=${'button_action'}
        @change=${(ev: any) => this._handleActionTypeChange(ev, 'entity', this.cardButton)}
      ></ha-entity-picker>
    </div>`;

    const alert = html`${this.button.button_type === undefined || this.button.button_type === 'default'
      ? html`<ha-alert
          alert-type="info"
          dismissable
          @alert-dismissed-clicked=${(ev: CustomEvent) => this._handlerAlert(ev)}
          >${infoAlert}</ha-alert
        >`
      : nothing}`;

    const actionConfig = this._renderActionSelectors();
    const actionType = html` ${alert}${entityPicker} ${actionConfig} `;

    return actionType;
  }

  private _handlerAlert(ev: CustomEvent): void {
    const alert = ev.target as HTMLElement;
    alert.style.display = 'none';
  }

  private _handleActionTypeChange(ev: any, actionName: string, buttonName: string): void {
    ev.stopPropagation();
    const actionValue = ev.detail.value || ev.target.value;
    this._selectedAction = actionValue;

    this._customButtonAction(actionName, actionValue, buttonName);
  }

  private _customButtonAction(configValue: string, newValue: string, buttonName: string): void {
    if (!this.config) return;

    const updates: Partial<VehicleCardConfig> = {};

    if (this.config.added_cards.hasOwnProperty(buttonName)) {
      let button = { ...(this.config.added_cards[buttonName].button || {}) };
      let buttonActionConfig = { ...(button.button_action || {}) };
      buttonActionConfig[configValue] = newValue;
      button.button_action = buttonActionConfig;

      updates.added_cards = {
        ...this.config.added_cards,
        [buttonName]: { ...this.config.added_cards[buttonName], button: button },
      };
      // console.log('update added_cards', updates.added_cards[buttonName]);
    } else {
      let button = { ...(this.config[buttonName] || {}) };
      let buttonActionConfig = { ...(button.button_action || {}) };
      buttonActionConfig[configValue] = newValue;
      button.button_action = buttonActionConfig;

      updates[buttonName] = button;
      // console.log('updates', updates);
    }

    if (Object.keys(updates).length > 0) {
      this.config = { ...this.config, ...updates };
      fireEvent(this, 'config-changed', { config: this.config });
    }
  }
}
