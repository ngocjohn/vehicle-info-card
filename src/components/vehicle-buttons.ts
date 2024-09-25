import { LitElement, css, html, TemplateResult, PropertyValues, nothing, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { Pagination } from 'swiper/modules';

import Swiper from 'swiper';

import { ButtonCardEntity, HomeAssistantExtended as HomeAssistant } from '../types';
import { addActions } from '../utils/tap-action';

import swipercss from '../css/swiper-bundle.css';
import mainstyle from '../css/styles.css';

@customElement('vehicle-buttons')
export class VehicleButtons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) component?: any;
  @property() swiper: Swiper | null = null;
  @property({ type: Object }) _buttons!: ButtonCardEntity;

  constructor() {
    super();
    this._handleClick = this._handleClick.bind(this);
  }

  static get styles(): CSSResultGroup {
    return [
      swipercss,
      css`
        #button-swiper {
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
          padding-bottom: 12px;
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

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this.updateComplete.then(() => {
      this.initSwiper();
    });
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('_buttons') && this._buttons) {
      this._setButtonActions();
    }
  }

  private _setButtonActions(): void {
    this.updateComplete.then(() => {
      const buttons = this._buttons;
      Object.keys(buttons).forEach((btn) => {
        const btnId = btn;
        const btnElt = this.shadowRoot?.getElementById(btnId);

        // Only add actions if button_type is not 'default'
        if (btnElt && this._buttons[btnId]?.button_type === 'action') {
          addActions(btnElt, this._buttons[btnId].button.button_action);
          // console.log('Button action added:', this.component.customButtons[btnId].button_action);
        } else {
          btnElt?.addEventListener('click', () => this._handleClick(btnId));
          // console.log('Default button action added:', btnId);
        }
      });
    });
  }

  private _handleClick(btnId: string): void {
    const button = this._buttons[btnId];
    if (!button) return;
    if (button?.button_type !== 'action') {
      this.component?.toggleCardFromButtons(btnId);
    } else {
      // const action = customBtn.button_action;
      // console.log('button action', action);
    }
  }

  private get _useButtonSwiper(): boolean {
    return this.component.config?.button_grid?.use_swiper ?? false;
  }

  private initSwiper(): void {
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
    console.log('swiper init');
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      modules: [Pagination],
      centeredSlides: true,
      grabCursor: true,
      speed: 500,
      roundLengths: true,
      spaceBetween: 12,
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      loop: false,
      slidesPerView: 'auto',
      pagination: {
        el: paginationEl,
        clickable: true,
      },
    });
  }

  private _chunkObject(obj: ButtonCardEntity, size: number): ButtonCardEntity {
    const chunked = {} as ButtonCardEntity;
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i += size) {
      const chunk = keys.slice(i, i + size).reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {} as ButtonCardEntity);
      chunked[i] = chunk;
    }
    return chunked;
  }

  private _buttonsGridGroup(BaseButton: ButtonCardEntity, showError: boolean): TemplateResult {
    const rowSize = this.component.config?.button_grid?.rows_size ? this.component.config.button_grid.rows_size * 2 : 4;
    const chunkedCardTypes = this._chunkObject(BaseButton, rowSize); // Divide into groups of 4
    const slides = Object.keys(chunkedCardTypes).map((key) => {
      const buttons = html`
        <div class="grid-container">
          ${Object.keys(chunkedCardTypes[key]).map((key) => {
            const button = this._buttons[key].button;
            const customBtn = this._buttons[key].custom_button;
            const buttonName = customBtn ? button?.primary : this._buttons[key].default_name;
            const buttonIcon = customBtn ? button?.icon : this._buttons[key].default_icon;
            const secondaryInfo = customBtn ? button?.secondary : this.component.getSecondaryInfo(key);
            const btnNotify = customBtn ? button?.notify : this.component.getErrorNotify(key);
            const btnEntity = customBtn ? button?.entity : '';
            return html`
              <div class="grid-item click-shrink" @click=${() => this._handleClick(key)}>
                <div class="item-icon">
                  <div class="icon-background">
                    <ha-state-icon
                      .hass=${this.component._hass}
                      .stateObj=${btnEntity ? this.component._hass.states[btnEntity] : undefined}
                      .icon=${buttonIcon}
                      id="${key}"
                    ></ha-state-icon>
                  </div>
                  ${showError
                    ? html`
                        <div class="item-notify ${btnNotify ? '' : 'hidden'}">
                          <ha-icon icon="mdi:alert-circle"></ha-icon>
                        </div>
                      `
                    : nothing}
                </div>
                <div class="item-content">
                  <div class="primary"><span class="title">${buttonName}</span></div>
                  <span class="secondary">${secondaryInfo}</span>
                </div>
              </div>
            `;
          })}
        </div>
      `;
      return html`<div class="swiper-slide">${buttons}</div>`;
    });

    return html`${slides}`;
  }

  protected render(): TemplateResult {
    const showError = this.component.config.show_error_notify;
    const baseButtons = this._buttons;

    return html`
      <section id="button-swiper">
        ${this._useButtonSwiper
          ? html`
              <div class="swiper-container">
                <div class="swiper-wrapper">${this._buttonsGridGroup(baseButtons, showError)}</div>
                <div class="swiper-pagination"></div>
              </div>
            `
          : html`
              <div class="grid-container">
                ${Object.keys(baseButtons).map((key) => {
                  const button = baseButtons[key].button;
                  const customBtn = baseButtons[key].custom_button;
                  const buttonName = customBtn ? button?.primary : baseButtons[key].default_name;
                  const buttonIcon = customBtn ? button?.icon : baseButtons[key].default_icon;
                  const secondaryInfo = customBtn ? button?.secondary : this.component.getSecondaryInfo(key);
                  const btnNotify = customBtn ? button?.notify : this.component.getErrorNotify(key);
                  const btnEntity = customBtn ? button?.entity : '';
                  return html`
                    <div class="grid-item click-shrink" @click=${() => this._handleClick(key)}>
                      <div class="item-icon">
                        <div class="icon-background">
                          <ha-state-icon
                            .hass=${this.component._hass}
                            .stateObj=${btnEntity ? this.component._hass.states[btnEntity] : undefined}
                            .icon=${buttonIcon}
                            id="${key}"
                          ></ha-state-icon>
                        </div>
                        ${showError
                          ? html`
                              <div class="item-notify ${btnNotify ? '' : 'hidden'}">
                                <ha-icon icon="mdi:alert-circle"></ha-icon>
                              </div>
                            `
                          : nothing}
                      </div>
                      <div class="item-content">
                        <div class="primary"><span class="title">${buttonName}</span></div>
                        <span class="secondary">${secondaryInfo}</span>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}
      </section>
    `;
  }

  public showCustomBtnEditor(btnType: string): void {
    this.updateComplete.then(() => {
      const gridBtns = this.shadowRoot?.querySelectorAll('.grid-item') as NodeListOf<HTMLElement>;
      const btnElt = this.shadowRoot?.getElementById(btnType) as HTMLElement;

      if (!btnElt) return;

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
    });
  }
}
