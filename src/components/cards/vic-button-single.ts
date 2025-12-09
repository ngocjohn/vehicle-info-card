import { HassEntity, UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import tinycolor from 'tinycolor2';

// Styles
import mainstyle from '../../css/styles.css';
import {
  ButtonCardEntity,
  HomeAssistant,
  VehicleCardConfig,
  BUTTON_LAYOUT,
  forwardHaptic,
  hasItemAction,
} from '../../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../../types/ha-frontend/data/ws-templates';
import { addActions, hasTemplate } from '../../utils';
import { VehicleButtons } from './vic-vehicle-buttons';

const TEMPLATE_KEYS = [
  'secondary',
  'notify',
  'icon_template',
  'color_template',
  'picture_template',
  'notify_icon',
  'notify_color',
] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];

const COLOR_AlPHA = '.2';

@customElement('vic-button-single')
export class VicButtonSingle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) _config!: VehicleCardConfig;
  @property({ attribute: false }) _card!: VehicleButtons;
  @property({ attribute: false }) _button!: ButtonCardEntity;
  @property({ attribute: 'layout', type: String }) layout?: BUTTON_LAYOUT;

  @property({ attribute: false }) _entityStateObj?: HassEntity;

  @state() private _templateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};
  @state() private _unsubRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

  @state() private _iconStyle: Record<string, string | undefined> = {};
  @state() private _stateBadgeEl?: any;

  connectedCallback(): void {
    super.connectedCallback();
    this._tryConnect();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._tryDisconnect();
  }

  private async _tryConnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._subscribeRenderTemplate(key);
    });
  }

  private async _subscribeRenderTemplate(key: TemplateKey): Promise<void> {
    if (this._unsubRenderTemplates.get(key) !== undefined || !this.hass || !this.isTemplate(key)) {
      return;
    }
    const button = this._button.button;

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [key]: result,
          };
        },
        {
          template: button[key] ?? '',
          entity_ids: button.entity ? [button.entity] : undefined,
          variables: {
            config: button,
            user: this.hass.user!.name,
          },
          strict: true,
        }
      );

      this._unsubRenderTemplates.set(key, sub);
      await sub;
    } catch (e) {
      console.error('Error subscribing to render template:', e);
      const result = {
        result: button[key] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [key]: result,
      };
      this._unsubRenderTemplates.delete(key);
    }
  }

  private async _tryDisconnect(): Promise<void> {
    TEMPLATE_KEYS.forEach((key) => {
      this._tryDisconnectKey(key);
    });
  }

  private async _tryDisconnectKey(key: TemplateKey): Promise<void> {
    const unsubRenderTemplate = this._unsubRenderTemplates.get(key);
    if (!unsubRenderTemplate) {
      return;
    }

    try {
      const unsub = await unsubRenderTemplate;
      unsub();
      this._unsubRenderTemplates.delete(key);
    } catch (err: any) {
      if (err.code === 'not_found' || err.code === 'template_error') {
        // If we get here, the connection was probably already closed. Ignore.
      } else {
        throw err;
      }
    }
  }

  private get _stateColor(): Boolean {
    if (!this._entityStateObj || !this._button.custom_button) return false;
    return this._button.button?.state_color || false;
  }

  private isTemplate(key: TemplateKey): boolean {
    const button = this._button.button;
    const value = button[key];
    return hasTemplate(value);
  }

  private getValue = (key: string) => {
    const { button, custom_button, default_name, default_icon, key: buttonKey } = this._button;
    const component = this._card.component;
    const templateResult = this._templateResults[key];

    switch (key) {
      case 'primary':
        return custom_button ? button?.primary : default_name;
      case 'icon':
        return custom_button ? this.getValue('icon_template') : default_icon;

      case 'secondary':
        if (!custom_button) {
          return component.getSecondaryInfo(buttonKey);
        }
        const state = button.secondary
          ? templateResult?.result ?? button.secondary
          : button.attribute
          ? component.getFormattedAttributeState(button.entity, button.attribute)
          : component.getStateDisplay(button.entity);
        return state;

      case 'notify':
        return custom_button ? templateResult?.result : component.getErrorNotify(buttonKey);

      case 'icon_template':
        const icon = button.icon_template ? templateResult?.result.toString() ?? button.icon : button.icon;
        return icon.includes('mdi:') ? icon : '';
      case 'color_template':
        return templateResult?.result ?? button.color_template ?? '';

      case 'color':
        return this.getValue('color_template') || 'var(--secondary-text-color)';

      case 'picture_template':
        return templateResult?.result ?? '';

      case 'entity':
        return custom_button ? button?.entity : '';

      case 'picture':
        return custom_button ? this.getValue('picture_template') : '';
      case 'notify_icon':
        return custom_button ? templateResult?.result ?? button.notify_icon ?? 'mdi:alert-circle' : 'mdi:alert-circle';
      case 'notify_color':
        return templateResult?.result ?? button.notify_color ?? 'var(--error-color)';
    }
  };

  private _setColorAlpha(color: string): string {
    const colorObj = tinycolor(color);
    return colorObj.setAlpha(COLOR_AlPHA).toRgbString();
  }

  private _getBackgroundColors(): string {
    const cssColor = getComputedStyle(this).getPropertyValue('--primary-text-color');
    const rgbaColor = this._setColorAlpha(cssColor);
    return rgbaColor;
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    this._setEventListeners();
    this._applyMarquee();
    this._updateStateBadgeEl();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has('hass')) {
      this._tryConnect();
    }

    if (changedProperties.has('hass') && this.hass) {
      const oldHass = changedProperties.get('hass') as HomeAssistant | undefined;
      if (oldHass) {
        const oldEntityObj = oldHass.states[this._button.button?.entity] as HassEntity | undefined;
        const newEntityObj = this.hass.states[this._button.button?.entity] as HassEntity;
        if (oldEntityObj && newEntityObj && oldEntityObj !== newEntityObj) {
          // Log the change to console
          this._entityStateObj = newEntityObj;
          setTimeout(() => {
            const newIconStyle = this._stateBadgeEl?._iconStyle || {};
            const currentStyle = this._iconStyle;
            // Check if the icon style has changed
            if (JSON.stringify(currentStyle) !== JSON.stringify(newIconStyle)) {
              // Update the icon style only if it has changed

              this._iconStyle = newIconStyle;
              this.requestUpdate('_iconStyle');
            }
          }, 100);
        }
      }
    }
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('_button') && this._button && this._button.button) {
      // Update the entity state object if the button has an entity
      const entity = this._button.button.entity;
      if (entity && this.hass) {
        this._entityStateObj = this.hass.states[entity] as HassEntity | undefined;
      } else {
        this._entityStateObj = undefined;
      }
    }
  }

  private _updateStateBadgeEl(): void {
    if (!this._stateBadgeEl) {
      this._stateBadgeEl = this.shadowRoot?.querySelector('state-badge');
      if (this._stateBadgeEl) {
        // Wait for the state badge to be rendered before setting the initial icon style
        if (this._stateColor) {
          setTimeout(() => {
            const _iconStyle = this._stateBadgeEl?._iconStyle || {};
            this._iconStyle = _iconStyle;
            this.requestUpdate('_iconStyle');
          }, 0);
        } else {
          this._iconStyle = {};
          this._stateBadgeEl.stateColor = false;
        }
      }
    }
  }

  private _setEventListeners(): void {
    if (!this.isAction) {
      return;
    }
    // const btnId = `button-${this._button.key}`;
    const actionConfig = this._button.button?.button_action || {};
    if (hasItemAction(actionConfig)) {
      const actionEl = this.shadowRoot?.getElementById('actionBtn') as HTMLElement;
      addActions(actionEl, actionConfig);
    }
  }

  private get isAction(): boolean {
    const buttonType = this._button.button_type;
    return buttonType === 'action';
  }

  protected render(): TemplateResult {
    const { show_error_notify } = this._config;
    const { key } = this._button;

    const stateColor = this._stateColor;
    const stateObj = this._entityStateObj;

    const getValue = this.getValue;

    const primary = getValue('primary');
    const icon = getValue('icon');
    const secondary = getValue('secondary');
    const notify = getValue('notify');
    const entity = getValue('entity');
    const color = getValue('color');
    const picture = getValue('picture');
    const notifyIcon = getValue('notify_icon');
    const notifyColor = getValue('notify_color');

    // const iconBackground = color ? this._setColorAlpha(color) : this._getBackgroundColors();
    const iconBackgroundColor = stateColor
      ? this._iconStyle.color ?? color ?? 'var(--disabled-text-color)'
      : color || 'var(--disabled-text-color)';
    const iconColor = color ? color : 'var(--secondary-text-color)';

    const iconStyle = {
      '--vic-icon-bg-color': `${iconBackgroundColor}`,
      '--vic-icon-color': `${iconColor}`,
      '--vic-notify-color': `${notifyColor}`,
    };

    const iconElement =
      this._stateColor && entity
        ? html`<state-badge
            .hass=${this.hass}
            .stateObj=${stateObj}
            .stateColor=${this._stateColor}
            .overrideIcon=${icon}
            .color=${this._stateColor ? undefined : iconColor}
          ></state-badge>`
        : html`<ha-state-icon
            .hass=${this.hass}
            .stateObj=${stateObj}
            .icon=${icon}
            style=${`color: ${iconColor};`}
          ></ha-state-icon>`;

    return html`
      <div
        id="actionBtn"
        data-key="${`button-${key}`}"
        class="grid-item"
        @click=${this._handleNavigate}
        ?transparent=${this._card.buttonConfig.transparent}
        style=${styleMap(iconStyle)}
      >
        <ha-ripple></ha-ripple>
        <div
          class="click-container click-shrink"
          id="${`button-action-${key}`}"
          ?vertical=${this.layout === 'vertical'}
        >
          <div class="item-icon">
            <div class="icon-background">
              ${picture ? html`<img src="${picture}" class="icon-picture" />` : iconElement}
            </div>
            <div class="item-notify" ?hidden=${!notify || !show_error_notify}>
              <div class="notify-icon">
                <ha-icon .icon="${notifyIcon}"></ha-icon>
              </div>
            </div>
          </div>
          <div class="item-content">
            <div class="primary">
              <span>${primary}</span>
            </div>
            <span class="secondary">${secondary}</span>
          </div>
        </div>
      </div>
    `;
  }

  private _applyMarquee = () => {
    this.updateComplete.then(() => {
      const primary = this.shadowRoot?.querySelector('.primary') as HTMLElement;
      if (primary) {
        const span = primary.querySelector('span') as HTMLElement;
        if (primary.scrollWidth > primary.clientWidth) {
          const offset = primary.scrollWidth - primary.clientWidth;
          const speed = offset / 5;
          primary.style.setProperty('--speed', `${speed}s`);
          primary.style.setProperty('--offset', `-${offset}px`);
          primary.classList.add('title-wrap');
          span.classList.add('marquee');
          span.addEventListener('animationend', () => {
            span.classList.remove('marquee');
            primary.classList.remove('title-wrap');
            primary.style.removeProperty('--offset');
            primary.style.removeProperty('--speed');
          });
        } else {
          primary.classList.remove('title-wrap');
          span.classList.remove('marquee');
        }
      }
    });
  };

  private _handleNavigate(event: Event): void {
    event.stopPropagation();
    if (this.isAction) return;
    forwardHaptic('light');
    this._card._handleClick(this._button.key);
  }

  static get styles(): CSSResultGroup {
    return [
      mainstyle,
      css`
        :host {
          --vic-notify-icon-color: var(--white-color);
        }
        #actionBtn {
          cursor: pointer;
        }
        /* GRID ITEM */
        .grid-item {
          display: flex;
          position: relative;
          padding: var(--vic-gutter-gap) var(--vic-card-padding);
          background: var(--secondary-background-color, var(--card-background-color, #fff));
          box-shadow: var(--ha-card-box-shadow);
          box-sizing: border-box;
          border-radius: var(--ha-card-border-radius, 12px);
          border-width: var(--ha-card-border-width, 1px);
          border-style: solid;
          border-color: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
          transition: all 0.3s ease-out;
          opacity: 1;
          cursor: pointer;
          align-items: center;
          height: 100%;
          overflow: hidden;
        }

        .grid-item[transparent] {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        .grid-item .click-container {
          position: relative;
          display: flex;
          flex-direction: row;
          align-items: center;
          flex: 1 1 0%;
          min-width: 0px;
          box-sizing: border-box;
          pointer-events: none;
          gap: 1em;
        }

        .grid-item .click-container[vertical] {
          flex-direction: column;
          text-align: center;
          gap: 10px;
        }

        .grid-item .item-notify {
          position: absolute;
          top: 3px;
          right: -3px;
        }

        .grid-item .item-notify .notify-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          width: var(--vic-notify-size, 18px);
          height: var(--vic-notify-size, 18px);
          font-size: var(--vic-notify-size, 18px);
          border-radius: 50%;
          background-color: var(--vic-notify-color, var(--error-color));
          transition: background-color 280ms ease-in-out;
        }

        .notify-icon ha-icon {
          --mdc-icon-size: 12px;
          color: var(--vic-notify-icon-color, rgb(var(--rgb-white))) !important;
        }

        .grid-item .item-notify[hidden] {
          display: none;
        }

        .grid-item .item-icon {
          position: relative;
          padding: 6px;
          margin: -6px;
        }

        .item-icon .icon-background {
          position: relative;
          width: var(--vic-icon-size);
          height: var(--vic-icon-size);
          border-radius: var(--vic-icon-border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: background-color 180ms ease-in-out, opacity 180ms ease-in-out;
        }

        .item-icon .icon-background::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background-color: var(--vic-icon-bg-color, var(--disabled-text-color));
          opacity: var(--vic-icon-bg-opacity);
          transition: background-color 180ms ease-in-out, opacity 180ms ease-in-out;
        }

        .icon-picture {
          width: 100%;
          height: 100%;
          border-radius: var(--vic-icon-border-radius);
        }

        .grid-item .item-content {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .grid-item .item-content .primary {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 1rem;
          font-weight: 500;
        }

        .grid-item .item-content > .primary > .title {
          display: inline-block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
          font-size: 1rem;
        }

        .grid-item .item-content .secondary {
          color: var(--secondary-text-color);
          text-transform: capitalize;
          letter-spacing: 0.5px;
          white-space: nowrap;
          font-weight: 400;
          font-size: 12px;
          line-height: 16px;
          text-overflow: ellipsis;
        }

        .primary.title-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          display: block;
          left: 0;
          top: 0;
        }

        .primary.title-wrap::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: -10px;
          width: 15%;
          height: 100%;
          background-image: linear-gradient(
            to left,
            transparent 0,
            var(--secondary-background-color, var(--card-background-color, #fff)) 100%
          );
        }

        .marquee {
          display: inline-block;
          animation: marquee linear 1s infinite;
          overflow: visible !important;
          animation-iteration-count: 3;
          animation-duration: var(--speed, 6s);
        }

        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }

          50% {
            transform: translateX(var(--offset));
          }

          100% {
            transform: translateX(0%);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vic-button-single': VicButtonSingle;
  }
}
