import { LitElement, css, html, TemplateResult, PropertyValues, nothing, CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators';
import { Pagination } from 'swiper/modules';

import Swiper from 'swiper';

import { CardTypeConfig } from '../types';

import swipercss from '../css/swiper-bundle.css';
import mainstyle from '../css/styles.css';

@customElement('vehicle-buttons')
export class VehicleButtons extends LitElement {
  @property({ type: Object }) component?: any;
  @property({ type: Array }) buttons: CardTypeConfig[] = [];

  @property() swiper: Swiper | null = null;

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
      if (this._useButtonSwiper) this.initSwiper();
    });
  }

  private get _useButtonSwiper(): boolean {
    return this.component.config?.button_grid?.use_swiper ?? false;
  }

  private initSwiper(): void {
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
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
      slidesPerView: 1,
      pagination: {
        el: paginationEl,
        clickable: true,
      },
    });
  }

  private _chunkArray(arr: CardTypeConfig[], chunkSize: number): CardTypeConfig[][] {
    const result: CardTypeConfig[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  }

  private _buttonsGridGroup(baseCardTypes: CardTypeConfig[], showError: boolean): TemplateResult {
    const rowSize = this.component.config?.button_grid?.rows_size ? this.component.config.button_grid.rows_size * 2 : 4;
    const chunkedCardTypes = this._chunkArray(baseCardTypes, rowSize); // Divide into groups of 4
    const slides = chunkedCardTypes.map((cardGroup) => {
      const buttons = html`
        <div class="grid-container">
          ${cardGroup.map((cardType) => {
            const customBtn = this.component.customButtons[cardType.button];
            const buttonName = customBtn?.primary ?? cardType.name;
            const buttonIcon = customBtn?.icon ?? cardType.icon;
            const secondaryInfo = customBtn?.secondary ?? this.component.getSecondaryInfo(cardType.type);
            const btnNotify = customBtn?.notify ?? this.component.getErrorNotify(cardType.type);
            return html`
              <div
                id="${cardType.button}"
                class="grid-item click-shrink"
                @click=${() => this.component.toggleCardFromButtons(cardType.type)}
              >
                <div class="item-icon">
                  <div class="icon-background"><ha-icon .icon="${buttonIcon}"></ha-icon></div>
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
    const baseCardTypes = this.buttons;
    return html`
      <section id="button-swiper">
        ${this._useButtonSwiper
          ? html`
              <!-- Swiper Layout -->
              <div class="swiper-container">
                <div class="swiper-wrapper">${this._buttonsGridGroup(baseCardTypes, showError)}</div>
                <div class="swiper-pagination"></div>
              </div>
            `
          : html`
              <div class="grid-container">
                ${baseCardTypes.map((cardType) => {
                  const customBtn = this.component.customButtons[cardType.button];
                  const buttonName = customBtn?.primary ?? cardType.name;
                  const buttonIcon = customBtn?.icon ?? cardType.icon;
                  const secondaryInfo = customBtn?.secondary ?? this.component.getSecondaryInfo(cardType.type);
                  const btnNotify = customBtn?.notify ?? this.component.getErrorNotify(cardType.type);

                  return html`
                    <div
                      id="${cardType.button}"
                      class="grid-item click-shrink"
                      @click=${() => this.component.toggleCardFromButtons(cardType.type)}
                    >
                      <div class="item-icon">
                        <div class="icon-background"><ha-icon .icon="${buttonIcon}"></ha-icon></div>
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
