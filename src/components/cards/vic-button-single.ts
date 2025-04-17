import { forwardHaptic } from 'custom-card-helpers';
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import tinycolor from 'tinycolor2';

// Styles
import mainstyle from '../../css/styles.css';
import { ButtonCardEntity, HomeAssistant, VehicleCardConfig } from '../../types';
import { RenderTemplateResult, subscribeRenderTemplate } from '../../types/ha-frontend/data/ws-templates';
import { addActions, hasTemplate } from '../../utils';
import { VehicleButtons } from './vic-vehicle-buttons';

const TEMPLATE_KEYS = ['secondary', 'notify', 'icon_template', 'color_template', 'picture_template'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];
const COLOR_AlPHA = '.2';

@customElement('vic-button-single')
export class VicButtonSingle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) _config!: VehicleCardConfig;
  @property({ attribute: false }) _card!: VehicleButtons;
  @property({ attribute: false }) _button!: ButtonCardEntity;
  @property({ attribute: false }) _index!: number;

  @state() private _templateResults: Partial<Record<TemplateKey, RenderTemplateResult | undefined>> = {};

  @state() private _unsubRenderTemplates: Map<TemplateKey, Promise<UnsubscribeFunc>> = new Map();

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

  private isTemplate(key: TemplateKey): boolean {
    const button = this._button.button;
    const value = button[key];
    return hasTemplate(value);
  }

  private getValue = (key: TemplateKey) => {
    const button = this._button.button;
    const component = this._card.component;
    const templateResult = this._templateResults[key];

    switch (key) {
      case 'secondary':
        const state = button.secondary
          ? templateResult?.result ?? button.secondary
          : button.attribute
          ? component.getFormattedAttributeState(button.entity, button.attribute)
          : component.getStateDisplay(button.entity);
        return state;
      case 'notify':
        return templateResult?.result ?? '';
      case 'icon_template':
        const icon = button.icon_template ? templateResult?.result.toString() ?? button.icon : button.icon;
        return icon.includes('mdi:') ? icon : '';
      case 'color_template':
        return templateResult?.result ?? button.color_template ?? '';
      case 'picture_template':
        return templateResult?.result ?? '';
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
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      this._tryConnect();
    }
  }

  private _setEventListeners(): void {
    if (!this.isAction) {
      return;
    }
    const btnId = `button-${this._button.key}`;
    const actionConfig = this._button.button.button_action;
    const actionEl = this.shadowRoot?.getElementById(btnId);
    if (actionEl) {
      addActions(actionEl, actionConfig);
    }
  }

  private get isAction(): boolean {
    const buttonType = this._button.button_type;
    return buttonType === 'action';
  }

  protected render(): TemplateResult {
    const getValue = this.getValue;
    const { show_error_notify } = this._config;
    const { button, custom_button, default_name, default_icon, key } = this._button;
    const index = this._index;

    const primary = custom_button ? button?.primary : default_name;
    const icon = custom_button ? getValue('icon_template') : default_icon;
    const secondary = custom_button ? getValue('secondary') : this._card.getSecondaryInfo(key);
    const notify = custom_button ? getValue('notify') : this._card.getErrorNotify(key);
    const entity = custom_button ? button?.entity : '';
    const color = custom_button ? getValue('color_template') : '';

    const iconBackground = color ? this._setColorAlpha(color) : this._getBackgroundColors();
    const picture = custom_button ? getValue('picture_template') : '';

    return html`
      <div
        id="${`button-${key}`}"
        class="grid-item"
        @click=${this._handleNavigate}
        style="animation-delay: ${index * 50}ms"
      >
        <ha-ripple></ha-ripple>
        <div class="click-container click-shrink" id="${`button-action-${key}`}">
          <div class="item-icon">
            <div class="icon-background" style=${`background-color: ${iconBackground}`}>
              ${picture
                ? html`<img src="${picture}" class="icon-picture" />`
                : html`
                    <ha-state-icon
                      .hass=${this.hass}
                      .stateObj=${entity ? this.hass.states[entity] : undefined}
                      .icon=${icon}
                      style=${color ? `color: ${color}` : ''}
                    ></ha-state-icon>
                  `}
            </div>
            <div class="item-notify" ?hidden=${!notify || !show_error_notify}>
              <ha-icon icon="mdi:alert-circle"></ha-icon>
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
        #actionBtn {
          cursor: pointer;
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
