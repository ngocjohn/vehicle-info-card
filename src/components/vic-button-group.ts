import { css, CSSResultGroup, html, nothing, TemplateResult, unsafeCSS } from 'lit';
import { customElement, state, queryAll } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import './shared/button/vic-button-card-item';
import { styleMap } from 'lit/directives/style-map.js';
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';
import { SECTION } from 'types';
import { BaseButtonCardItemConfig, IButtonMap } from 'types/card-config/button-card';

import { BaseElement } from './base-element';
import { VicButtonCardItem } from './shared/button/vic-button-card-item';

@customElement('vic-button-group')
export class VicButtonGroup extends BaseElement {
  constructor() {
    super(SECTION.BUTTONS);
    window.VicButtonGroup = this;
  }

  @state() private _buttonsMap: IButtonMap = new Map();
  @state() private swiper?: Swiper;
  @state() private useSwiper!: boolean;

  @state() activeSlideIndex: number = 0;

  @queryAll('vic-button-card-item') _buttonItems!: NodeListOf<VicButtonCardItem>;

  protected async firstUpdated(): Promise<void> {
    if (this.useSwiper) {
      this._initSwiper();
    }
    this._setUpButtonAnimation();
  }

  private _setUpButtonAnimation(): void {
    if (this.store.card._hasAnimated || this.store.card.isEditorPreview || !this.shadowRoot) return;
    this.store.card._hasAnimated = true;

    const runAnimation = () => {
      const buttons = this.shadowRoot?.querySelectorAll('vic-button-card-item');
      if (!buttons || buttons.length === 0) return;

      buttons.forEach((btn: VicButtonCardItem) => {
        requestAnimationFrame(() => {
          btn._zoomInEffect();
        });
      });
      observer.disconnect();
    };

    const observer = new MutationObserver(() => {
      const buttons = this.shadowRoot?.querySelectorAll('vic-button-card-item') as NodeListOf<HTMLElement>;

      if (buttons && buttons.length > 0) {
        requestAnimationFrame(() => runAnimation());
      }
    });

    observer.observe(this.shadowRoot, { childList: true, subtree: false });

    // Fallback in case MutationObserver doesn't trigger
    requestAnimationFrame(() => runAnimation());
  }
  private _initSwiper(): void {
    if (!this.useSwiper) return;
    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;

    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      // grabCursor: true,
      loop: false,
      modules: [Pagination],
      pagination: {
        clickable: true,
        el: paginationEl,
      },
      roundLengths: true,
      slidesPerView: 'auto',
      spaceBetween: 12,
      speed: 500,
      edgeSwipeDetection: true,
    });
    this.swiper?.on('slideChange', () => {
      this.activeSlideIndex = this.swiper?.activeIndex ?? 0;
    });
    if (
      this.swiper &&
      this.store.card._currentSwipeIndex !== undefined &&
      this.store.card._currentSwipeIndex !== this.activeSlideIndex
    ) {
      console.log(
        '%cVIC-BUTTON-GROUP:',
        'color: #bada55;',
        ' Setting initial swipe index to',
        this.store.card._currentSwipeIndex
      );

      this.swiper.slideTo(this.store.card._currentSwipeIndex, 0, false);
    }
  }
  protected render(): TemplateResult {
    this.useSwiper = this.store.gridConfig.swipe || false;
    this._buttonsMap = new Map(Object.entries(this.store._visibleButtons));
    const btnKeys = Array.from(this._buttonsMap.keys());
    const buttons = Array.from(this._buttonsMap.values());
    const { rows, columns } = this.store.gridConfig;
    const useSwiper = this.useSwiper;
    const total = this.useSwiper ? rows! * columns! : btnKeys.length;

    return html`
      <div
        class=${classMap({
          'buttons-group': true,
          'swiper-container': useSwiper,
        })}
        style=${this._computeStyle()}
      >
        <div class="swiper-wrapper">
          ${Array.from({ length: Math.ceil(btnKeys.length / total) }, (_, slideIndex) => {
            const start = slideIndex * total;
            const end = start + total;

            return html`
              <div class="swiper-slide">
                <div class="grid-container" data-slide-index=${slideIndex}>
                  ${buttons.slice(start, end).map((button, index) => {
                    const realIndex = start + index;
                    const keyName = btnKeys[realIndex];
                    return this._renderButton(button, realIndex, slideIndex, keyName);
                  })}
                </div>
              </div>
            `;
          })}
        </div>
        ${this.useSwiper ? html`<div class="swiper-pagination"></div>` : nothing}
      </div>
    `;
  }

  private _renderButton(
    button: BaseButtonCardItemConfig,
    index: number,
    slideIndex: number,
    keyName: string
  ): TemplateResult {
    return html`
      <vic-button-card-item
        ._hass=${this._hass}
        .store=${this.store}
        .car=${this.car}
        ._btnConfig=${button}
        .itemIndex=${index}
        .slideIndex=${slideIndex}
        .buttonKey=${keyName}
        @click-index=${this._handleClickIndex.bind(this)}
      ></vic-button-card-item>
    `;
  }
  _handleClickIndex(ev: Event): void {
    ev.stopPropagation();
    const index = (ev.target as any).itemIndex;
    const key = (ev.target as any).buttonKey;
    console.log('%cVIC-BUTTON-GROUP:', 'color: #bada55;', ' Button clicked index', index, 'key:', key);

    setTimeout(() => {
      this.store.card._currentSwipeIndex = this.activeSlideIndex;
      this.store.card._activeCardIndex = key;
    }, 50);
  }

  private _computeStyle() {
    const { columns } = this.store.gridConfig;
    const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    const paddingBottom = this.swiper?.isLocked || !this.useSwiper ? '0' : undefined;
    let marginTop: string | null = null;
    if (this.parentElement?.previousElementSibling !== null) {
      marginTop = 'var(--vic-card-padding)';
    }

    return styleMap({
      '--vsc-btn-template-columns': gridTemplateColumns,
      paddingBottom,
      marginTop,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      unsafeCSS(swipercss),
      css`
        :host {
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
        }

        .buttons-group {
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
          width: 100%;
          height: auto;
        }

        .swiper-wrapper {
          /* align-items: stretch; */
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
          /* grid-template-columns: repeat(auto-fill, minmax(calc((100% - 24px) / 2), 1fr)); */
          grid-template-rows: auto;
          gap: var(--vic-gutter-gap);
          /* margin-top: 1rem; */
          position: relative;
          grid-template-columns: var(--vsc-btn-template-columns);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vic-button-group': VicButtonGroup;
  }
}
