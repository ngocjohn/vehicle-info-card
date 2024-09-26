import { LitElement, css, html, TemplateResult, PropertyValues, nothing, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { Pagination } from 'swiper/modules';

import Swiper from 'swiper';

import { ButtonCardEntity, HomeAssistantExtended as HomeAssistant, VehicleCardConfig } from '../types';
import { addActions } from '../utils/tap-action';
import { getTemplateValue, getBooleanTemplate } from '../utils/ha-helpers';

import swipercss from '../css/swiper-bundle.css';
import mainstyle from '../css/styles.css';

import { VehicleCard } from '../vehicle-info-card';

interface customButton {
  notify: boolean;
  state: string;
}

@customElement('vehicle-buttons')
export class VehicleButtons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Object }) component!: VehicleCard;
  @property({ type: Object }) _config!: VehicleCardConfig;
  @property({ type: Object }) _buttons!: ButtonCardEntity;

  @state() _secondaryInfo: { [key: string]: customButton } = {};
  private swiper: Swiper | null = null;

  private activeSlideIndex: number = 0;
  @property() private _customButtonReady = false;

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

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    super.firstUpdated(_changedProperties);
    this._fetchSecondaryInfo();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('hass')) {
      this.checkCustomChanged();
    }
  }

  private async checkCustomChanged(): Promise<void> {
    // console.log('check custom changed');
    let changed = false;
    let changedKeys: string[] = [];
    for (const key in this._secondaryInfo) {
      const oldState = this._secondaryInfo[key].state;
      const oldNotify = this._secondaryInfo[key].notify;
      // check if the state or notify has changed
      const { state, notify } = await this._getSecondaryInfo(key);
      if (oldState !== state || oldNotify !== notify) {
        // this._fetchSecondaryInfo();
        console.log('change detected');
        changedKeys.push(key);
        changed = true;
      } else {
        // console.log('no change detected');
      }
    }

    if (changed) {
      const newSecondaryInfo = { ...this._secondaryInfo }; // Copy the object
      await Promise.all(
        changedKeys.map(async (key) => {
          newSecondaryInfo[key] = await this._getSecondaryInfo(key);
          console.log('secondary info', newSecondaryInfo[key]);
        })
      );

      // Trigger reactivity by reassigning the object
      this._secondaryInfo = newSecondaryInfo;

      // Force a re-render
      this.requestUpdate();
    }
  }

  private async _fetchSecondaryInfo(): Promise<void> {
    this._customButtonReady = false;

    console.log('prepare custom button:', this._customButtonReady);
    const filteredBtns = Object.keys(this._buttons).filter((key) => this._buttons[key].custom_button);
    await Promise.all(
      filteredBtns.map(async (key) => {
        this._secondaryInfo[key] = await this._getSecondaryInfo(key);
      })
    );

    this._customButtonReady = true;
    console.log('custom button ready:', this._customButtonReady);
    if (this._useButtonSwiper) {
      this.updateComplete.then(() => {
        this.initSwiper();
        this._setButtonActions();
      });
    } else {
      this._setButtonActions();
    }
  }

  private async _getSecondaryInfo(key: string): Promise<customButton> {
    let state = '';
    let notify = false;

    const button = this._buttons[key].button;

    state = button.secondary
      ? await getTemplateValue(this.hass, button.secondary)
      : button.attribute
        ? this.component.getFormattedAttributeState(button.entity, button.attribute)
        : this.component.getStateDisplay(button.entity);
    notify = button.notify ? await getBooleanTemplate(this.hass, button.notify) : false;

    return { state, notify };
  }

  private initSwiper = (): void => {
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
    // After initialization, set the active slide to the previously saved index
    this.swiper?.on('slideChange', () => {
      this.activeSlideIndex = this.swiper?.activeIndex ?? 0;
    });

    if (this.activeSlideIndex !== 0 && this.swiper) {
      this.swiper.slideTo(this.activeSlideIndex, 0, false);
    }

    console.log('swiper init done');
  };

  private get _useButtonSwiper(): boolean {
    return this._config.button_grid?.use_swiper || false;
  }

  private _renderSwiper(): TemplateResult {
    if (!this._useButtonSwiper) return html``;
    // console.log('render swiper');
    const baseButtons = this._buttons;
    const showError = this._config.show_error_notify;
    return html`
      <section id="button-swiper">
        <div class="swiper-container">
          <div class="swiper-wrapper">${this._buttonsGridGroup(baseButtons, showError)}</div>
          <div class="swiper-pagination"></div>
        </div>
      </section>
    `;
  }

  private _renderGrid(): TemplateResult {
    if (this._useButtonSwiper) return html``;
    console.log('render grid');
    const baseButtons = this._buttons;
    const showError = this._config.show_error_notify;
    return html`
      <section id="button-swiper">
        <div class="grid-container">
          ${Object.keys(baseButtons).map((key) => {
            return html`${this._renderButton(key, showError)} `;
          })}
        </div>
      </section>
    `;
  }

  protected render(): TemplateResult {
    if (!this._customButtonReady) return html``;
    const selectedType = this._useButtonSwiper ? this._renderSwiper() : this._renderGrid();
    return selectedType;
  }

  // Chunked buttons into groups of 4 for slides in swiper
  private _buttonsGridGroup(BaseButton: ButtonCardEntity, showError: boolean): TemplateResult {
    const rowSize = this.component.config?.button_grid?.rows_size ? this.component.config.button_grid.rows_size * 2 : 4;
    const chunkedCardTypes = this._chunkObject(BaseButton, rowSize); // Divide into groups of 4
    const slides = Object.keys(chunkedCardTypes).map((key) => {
      const buttons = html`
        <div class="grid-container">
          ${Object.keys(chunkedCardTypes[key]).map((key) => {
            return html`${this._renderButton(key, showError)} `;
          })}
        </div>
      `;
      return html`<div class="swiper-slide">${buttons}</div>`;
    });

    return html`${slides}`;
  }

  // Render button template
  private _renderButton(key: string, showError: boolean): TemplateResult {
    const button = this._buttons[key].button;
    const customBtn = this._buttons[key].custom_button;
    const buttonName = customBtn ? button?.primary : this._buttons[key].default_name;
    const buttonIcon = customBtn ? button?.icon : this._buttons[key].default_icon;
    const secondaryInfo = customBtn ? this._secondaryInfo[key].state : this.component.getSecondaryInfo(key);
    const btnNotify = customBtn ? this._secondaryInfo[key].notify : this.component.getErrorNotify(key);
    const btnEntity = customBtn ? button?.entity : '';

    return html`
      <div class="grid-item click-shrink" @click=${() => this._handleClick(key)} id="${`button-${key}`}">
        <div class="item-icon">
          <div class="icon-background">
            <ha-state-icon
              .hass=${this.hass}
              .stateObj=${btnEntity ? this.hass.states[btnEntity] : undefined}
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
  }

  private _chunkObject = (obj: ButtonCardEntity, size: number): ButtonCardEntity => {
    const keys = Object.keys(obj);

    return keys.reduce((chunked: ButtonCardEntity, key: string, index: number) => {
      const chunkIndex = Math.floor(index / size);

      if (!chunked[chunkIndex]) {
        chunked[chunkIndex] = {} as ButtonCardEntity;
      }

      chunked[chunkIndex][key] = obj[key];

      // console.log('chunked', chunked);
      return chunked;
    }, {} as ButtonCardEntity);
  };

  private _setButtonActions = (): void => {
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
    console.log('Button actions set');
  };

  private _handleClick = (btnId: string): void => {
    const button = this._buttons[btnId];
    if (!button) return;
    if (button?.button_type !== 'action') {
      this.component.toggleCardFromButtons(btnId);
    } else {
      // const action = customBtn.button_action;
      // console.log('button action', action);
    }
  };

  public showCustomBtnEditor(btnId: string): void {
    this.updateComplete.then(() => {
      const btnType = `button-${btnId}`;
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
