// Lit
import { LitElement, css, html, TemplateResult, PropertyValues, CSSResultGroup, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
// Swiper
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';
// Custom helpers
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import tinycolor from 'tinycolor2';
// Local imports
import { ButtonCardEntity, HA as HomeAssistant, VehicleCardConfig } from '../../types';
import { addActions } from '../../utils';
import { RenderTemplateResult, subscribeRenderTemplate } from '../../utils/ws-templates';
import { VehicleCard } from '../../vehicle-info-card';

// Styles
import mainstyle from '../../css/styles.css';

const TEMPLATE_KEYS = ['secondary', 'notify', 'icon_template', 'color_template'] as const;
type TemplateKey = (typeof TEMPLATE_KEYS)[number];
const COLOR_AlPHA = '.2';

@customElement('vehicle-buttons')
export class VehicleButtons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) private component!: VehicleCard;
  @property({ attribute: false }) _config!: VehicleCardConfig;
  @property({ type: Object }) _buttons!: ButtonCardEntity;
  @state() private _cardCurrentSwipeIndex?: number;

  @state() private _templateResults: Record<string, Partial<Record<TemplateKey, RenderTemplateResult | undefined>>> =
    {};

  @state() private _unsubRenderTemplates: Record<string, Map<TemplateKey, Promise<UnsubscribeFunc>>> = {};

  @state() swiper: Swiper | null = null;
  @state() public activeSlideIndex: number = 0;

  constructor() {
    super();
    this._handleClick = this._handleClick.bind(this);
  }

  connectedCallback(): void {
    super.connectedCallback();
    console.log('Vehicle buttons connected');
    window.BenzButtons = this; // Expose the class to the window object
    this._tryConnect();
  }

  disconnectedCallback(): void {
    console.log('Vehicle buttons disconnected');
    this._tryDisconnect();
    super.disconnectedCallback();
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(swipercss),
      css`
        #button-swiper {
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
          padding: 0 0 var(--vic-card-padding) 0;
          border: none !important;
          background: none !important;
          overflow: visible;
        }
        .swiper-container {
          width: 100%;
          height: 100%;
        }
        .swiper-slide {
          height: 100%;
          width: 100%;
        }
        .swiper-pagination {
          margin-top: var(--swiper-pagination-bottom);
          display: block;
        }

        .swiper-pagination-bullet {
          background-color: var(--swiper-theme-color);
          transition: all 0.3s ease-in-out !important;
        }
        .swiper-pagination-bullet-active {
          opacity: 0.7;
        }
      `,
      mainstyle,
    ];
  }

  private get useSwiper(): boolean {
    return this._config.button_grid?.use_swiper || false;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    if (this.useSwiper) {
      this.initSwiper();
      this._setButtonActions();
    } else {
      this._setButtonActions();
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
  }

  public isTemplate(btnKey: string, templateKey: string): boolean {
    const value = this._buttons[btnKey].button[templateKey];
    return value?.includes('{');
  }

  private async _tryConnect(): Promise<void> {
    const customKeys = Object.keys(this._buttons).filter((key) => this._buttons[key].custom_button);

    for (const key of customKeys) {
      TEMPLATE_KEYS.forEach((templateKey) => {
        this._subscribeTemplate(key, templateKey);
      });
    }
  }

  private async _subscribeTemplate(key: string, templateKey: TemplateKey): Promise<void> {
    if (!this.hass || !this.isTemplate(key, templateKey)) {
      return;
    }

    const button = this._buttons[key].button;

    try {
      const sub = subscribeRenderTemplate(
        this.hass.connection,
        (result) => {
          this._templateResults = {
            ...this._templateResults,
            [key]: {
              ...(this._templateResults[key] || {}),
              [templateKey]: result,
            },
          };
        },
        {
          template: button[templateKey] ?? '',
          variables: {
            config: button,
            user: this.hass.user!.name,
            entity: button.entity,
          },
        }
      );

      // Ensure the nested map for the button exists
      if (!this._unsubRenderTemplates[key]) {
        this._unsubRenderTemplates[key] = new Map();
      }

      this._unsubRenderTemplates[key].set(templateKey, sub);
      await sub; // Ensure subscription completes
    } catch (_err) {
      const result = {
        result: button[templateKey] ?? '',
        listeners: {
          all: false,
          domains: [],
          entities: [],
          time: false,
        },
      };
      this._templateResults = {
        ...this._templateResults,
        [key]: {
          ...(this._templateResults[key] || {}),
          [templateKey]: result,
        },
      };
      if (this._unsubRenderTemplates[key]) {
        this._unsubRenderTemplates[key].delete(templateKey);
      }
    }
  }

  private async _tryDisconnect(): Promise<void> {
    for (const key in this._unsubRenderTemplates) {
      await this._tryDisconnectKey(key);
    }
  }

  private async _tryDisconnectKey(buttonKey: string): Promise<void> {
    const unsubMap = this._unsubRenderTemplates[buttonKey];
    if (!unsubMap) {
      return;
    }

    for (const [templateKey, unsubPromise] of unsubMap.entries()) {
      try {
        const unsub = await unsubPromise;
        unsub();
        unsubMap.delete(templateKey);
      } catch (err: any) {
        if (err.code === 'not_found' || err.code === 'template_error') {
          // If we get here, the connection was probably already closed. Ignore.
        } else {
          throw err;
        }
      }
    }

    // Remove the button key from the unsub map if all subscriptions are cleared
    if (unsubMap.size === 0) {
      delete this._unsubRenderTemplates[buttonKey];
    }
  }

  private _getCustomState(key: string, templateKey: string) {
    const button = this._buttons[key].button;
    switch (templateKey) {
      case 'secondary':
        const state = button.secondary
          ? this._templateResults[key]?.secondary?.result ?? button.secondary
          : button.attribute
          ? this.component.getFormattedAttributeState(button.entity, button.attribute)
          : this.component.getStateDisplay(button.entity);
        return state;
      case 'notify':
        return this._templateResults[key]?.notify?.result ?? '';
      case 'icon_template':
        const icon = button.icon_template
          ? this._templateResults[key]?.icon_template?.result.toString() ?? button.icon
          : button.icon;
        return icon.includes('mdi:') ? icon : '';
      case 'color_template':
        return this._templateResults[key]?.color_template?.result ?? '';
    }
  }

  private initSwiper(): void {
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
    // console.log('swiper init');

    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      modules: [Pagination],
      grabCursor: true,
      speed: 500,
      roundLengths: true,
      spaceBetween: 12,
      loop: false,
      slidesPerView: 'auto',
      pagination: {
        el: paginationEl,
        clickable: true,
      },
    });
    // After initialization, set the active slide to the previously saved index
    this.swiper?.on('slideChange', () => {
      this.activeSlideIndex = this.swiper?.activeIndex ?? 0;
    });

    if (
      this.swiper &&
      this._cardCurrentSwipeIndex !== undefined &&
      this._cardCurrentSwipeIndex !== this.activeSlideIndex
    ) {
      this.swiper.slideTo(this._cardCurrentSwipeIndex, 0, false);
    }
  }

  private _renderSwiper(): TemplateResult {
    // if (!this.useSwiper) return html``;
    // console.log('render swiper');
    const baseButtons = this._buttons;

    return html`
      <section id="button-swiper">
        <div class="swiper-container">
          <div class="swiper-wrapper">${this._buttonsGridGroup(baseButtons)}</div>
          <div class="swiper-pagination"></div>
        </div>
      </section>
    `;
  }

  private _renderGrid(): TemplateResult {
    // if (this.useSwiper) return html``;
    // console.log('render grid');
    const baseButtons = this._buttons;

    return html`
      <section id="button-swiper">
        <div class="grid-container">
          ${Object.keys(baseButtons).map((key) => {
            return html`${this._renderButton(key)} `;
          })}
        </div>
      </section>
    `;
  }

  protected render(): TemplateResult {
    return html`${when(
      this.useSwiper,
      () => this._renderSwiper(),
      () => this._renderGrid()
    )}`;
  }

  // Chunked buttons into groups of 4 for slides in swiper
  private _buttonsGridGroup(BaseButton: ButtonCardEntity): TemplateResult {
    const rowSize = this.component.config?.button_grid?.rows_size ? this.component.config.button_grid.rows_size * 2 : 4;
    const chunkedCardTypes = this._chunkObject(BaseButton, rowSize); // Divide into groups of 4
    // console.log('chunked', chunkedCardTypes);
    const slides = Object.keys(chunkedCardTypes).map((key) => {
      const buttons = html`
        <div class="grid-container">
          ${Object.keys(chunkedCardTypes[key]).map((key) => {
            return html`${this._renderButton(key)} `;
          })}
        </div>
      `;
      return html`<div class="swiper-slide">${buttons}</div>`;
    });
    return html`${slides}`;
  }

  // Render button template
  private _renderButton(key: string): TemplateResult {
    const getTemplate = (templateKey: TemplateKey) => this._getCustomState(key, templateKey);
    const { show_error_notify } = this._config;
    const { button, custom_button, default_name, default_icon } = this._buttons[key];

    const primary = custom_button ? button?.primary : default_name;
    const icon = custom_button ? getTemplate('icon_template') : default_icon;
    const secondary = custom_button ? getTemplate('secondary') : this.component.getSecondaryInfo(key);
    const notify = custom_button ? getTemplate('notify') : this.component.getErrorNotify(key);
    const entity = custom_button ? button?.entity : '';
    const color = custom_button ? getTemplate('color_template') : '';
    const iconBackground = color ? this._setColorAlpha(color) : this._getBackgroundColors();

    return html`
      <div id="${`button-${key}`}" class="grid-item click-shrink">
        <div class="click-container" id="${`button-action-${key}`}">
          <div class="item-icon">
            <div class="icon-background" style=${`background-color: ${iconBackground}`}>
              <ha-state-icon
                .hass=${this.hass}
                .stateObj=${entity ? this.hass.states[entity] : undefined}
                .icon=${icon}
                style=${color ? `color: ${color}` : ''}
              ></ha-state-icon>
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

  private _chunkObject = (obj: ButtonCardEntity, size: number): ButtonCardEntity => {
    const keys = Object.keys(obj);

    return keys.reduce((chunked: ButtonCardEntity, key: string, index: number) => {
      const chunkIndex = Math.floor(index / size);

      if (!chunked[chunkIndex]) {
        chunked[chunkIndex] = {} as ButtonCardEntity;
      }

      chunked[chunkIndex][key] = obj[key];

      // console.log('chunked', obj[key]);
      return chunked;
    }, {} as ButtonCardEntity);
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

  private applyMarquee() {
    this.updateComplete.then(() => {
      const items = this.shadowRoot?.querySelectorAll('.primary') as NodeListOf<HTMLElement>;
      if (!items) return;
      items.forEach((item) => {
        const itemText = item.querySelector('span');
        if (item.scrollWidth > item.clientWidth) {
          item.classList.add('title-wrap');
          itemText?.classList.add('marquee');
          setTimeout(() => {
            itemText?.classList.remove('marquee');
            item.classList.remove('title-wrap');
          }, 18000);
        } else {
          item.classList.remove('title-wrap');
          itemText?.classList.remove('marquee');
        }
      });
    });
  }

  private _setButtonActions = (): void => {
    const buttons = this._buttons;
    Object.keys(buttons).forEach((btn) => {
      const btnId = btn;
      const btnEltId = `button-action-${btn}`;
      const btnType = this._buttons[btnId].button_type;
      const btnAction = this._buttons[btnId].button.button_action;
      const btnElt = this.shadowRoot?.getElementById(btnEltId);
      // Only add actions if button_type is not 'default'
      if (btnElt && btnType !== undefined && btnType === 'action' && btnAction) {
        addActions(btnElt, btnAction);
      } else {
        btnElt?.addEventListener('click', () => this._handleClick(btnId));
        // console.log('Default button action added:', btnId);
      }
    });
    this.applyMarquee();
  };

  private _handleClick = (btnId: string): void => {
    const button = this._buttons[btnId];
    const btnType = button?.button_type;
    if (btnType === 'default') {
      this.component._currentSwipeIndex = this.activeSlideIndex;
      this.component._currentCardType = btnId;
    }
  };

  public showCustomBtnEditor(btnId: string): void {
    this.updateComplete.then(() => {
      const btnType = `button-${btnId}`;
      const gridBtns = this.shadowRoot?.querySelectorAll('.grid-item') as NodeListOf<HTMLElement>;
      const btnElt = this.shadowRoot?.getElementById(btnType) as HTMLElement;

      if (!btnElt) return;
      if (this.useSwiper) {
        const swiperSlides = this.shadowRoot?.querySelectorAll('.swiper-slide') as NodeListOf<HTMLElement>;
        let targetSlideIndex = -1;

        swiperSlides.forEach((slide, index) => {
          if (slide.contains(btnElt)) {
            targetSlideIndex = index;
          }
        });

        if (targetSlideIndex !== -1) {
          this.swiper?.slideTo(targetSlideIndex);

          // Wait until the slide transition completes
          setTimeout(() => {
            const filteredBtns = Array.from(gridBtns).filter((btn) => btn.id !== btnType);

            filteredBtns.forEach((btn) => {
              btn.style.opacity = '0.2';
            });

            btnElt.classList.add('redGlows');
            setTimeout(() => {
              filteredBtns.forEach((btn) => {
                btn.style.opacity = '';
              });
              btnElt.classList.remove('redGlows');
            }, 3000);
          }, 500);
        }
      } else {
        // Wait until the slide transition completes
        setTimeout(() => {
          const filteredBtns = Array.from(gridBtns).filter((btn) => btn.id !== btnType);

          filteredBtns.forEach((btn) => {
            btn.style.opacity = '0.2';
          });

          btnElt.classList.add('redGlows');
          setTimeout(() => {
            filteredBtns.forEach((btn) => {
              btn.style.opacity = '';
            });
            btnElt.classList.remove('redGlows');
          }, 3000);
        }, 500);
      }
    });
  }
}

declare global {
  interface Window {
    BenzButtons: VehicleButtons;
  }
  interface HTMLElementTagNameMap {
    'vehicle-buttons': VehicleButtons;
  }
}
