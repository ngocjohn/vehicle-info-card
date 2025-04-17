// Lit
import { LitElement, css, html, TemplateResult, PropertyValues, CSSResultGroup, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';
// Swiper
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';

// Styles
import mainstyle from '../../css/styles.css';
// Local imports
import { ButtonCardEntity, HomeAssistant, VehicleCardConfig } from '../../types';
import { VehicleCard } from '../../vehicle-info-card';
// Components
import './vic-button-single';

@customElement('vehicle-buttons')
export class VehicleButtons extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public component!: VehicleCard;
  @property({ attribute: false }) _config!: VehicleCardConfig;
  @property({ type: Object }) _buttons!: ButtonCardEntity;

  @state() swiper: Swiper | null = null;
  @state() public activeSlideIndex: number = 0;
  @state() private _cardCurrentSwipeIndex?: number;

  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
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
        /* .swiper-wrapper {
          flex-direction: initial;
          flex-wrap: wrap;
        } */
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

        .grid-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(calc((100% - 24px) / 2), 1fr));
          grid-template-rows: auto;
          grid-gap: var(--vic-gutter-gap);
          position: relative;
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
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
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

  public getErrorNotify = (key: string) => {
    return this.component.getErrorNotify(key);
  };

  public getSecondaryInfo = (key: string) => {
    return this.component.getSecondaryInfo(key);
  };

  private _renderButton(key: string): TemplateResult {
    const index = Object.keys(this._buttons).indexOf(key);
    const button = this._buttons[key];
    return html` <vic-button-single
      id="${`button-${key}`}"
      .hass=${this.hass}
      ._config=${this._config}
      ._card=${this}
      ._button=${button}
      ._index=${index}
    ></vic-button-single>`;
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

  public _handleClick = (btnId: string): void => {
    this.component._currentSwipeIndex = this.activeSlideIndex;
    this.component._currentCardType = btnId;
  };

  public showCustomBtnEditor = (key: string): void => {
    const btnId = `button-${key}`;
    const gridBtns = this.shadowRoot?.querySelectorAll('vic-button-single') as NodeListOf<HTMLElement>;
    const btnElt = Array.from(gridBtns).find((btn) => btn.id === btnId);

    if (!btnElt) return;

    const highlightButton = () => {
      const filteredBtns = Array.from(gridBtns).filter((btn) => btn.id !== btnId);
      const gridItem = btnElt.shadowRoot?.querySelector('.grid-item') as HTMLElement;
      filteredBtns.forEach((btn) => (btn.style.opacity = '0.2'));
      gridItem.classList.add('redGlows');

      setTimeout(() => {
        filteredBtns.forEach((btn) => (btn.style.opacity = ''));
        gridItem.classList.remove('redGlows');
      }, 3000);
    };

    if (this.swiper) {
      const targetSlide = btnElt.closest('.swiper-slide') as HTMLElement;
      const targetSlideIndex = Array.from(targetSlide.parentElement?.children || []).indexOf(targetSlide);

      if (targetSlideIndex !== -1) {
        console.log('swiper slide to', targetSlideIndex);
        this.swiper?.slideTo(targetSlideIndex);
        setTimeout(highlightButton, 500);
      }
    } else {
      setTimeout(highlightButton, 500);
    }
  };

  public swipeToButton(btnId: string): void {
    this.updateComplete.then(() => {
      const btnType = `button-${btnId}`;
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
          this.swiper?.slideTo(targetSlideIndex, 0, false);
        }
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-buttons': VehicleButtons;
  }
}
