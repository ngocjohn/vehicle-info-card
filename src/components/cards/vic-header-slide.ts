import { LitElement, css, html, TemplateResult, PropertyValues, unsafeCSS, CSSResultGroup } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, state } from 'lit/decorators.js';
import Swiper from 'swiper';
import { Autoplay, Pagination, EffectFade, EffectCoverflow } from 'swiper/modules';
import swipercss from 'swiper/swiper-bundle.css';
import { SwiperOptions } from 'swiper/types';

import { VehicleCardConfig } from '../../types';

@customElement('header-slide')
export class HeaderSlide extends LitElement {
  @state() private config!: VehicleCardConfig;
  @state() private editMode!: boolean;
  @state() private images: { url: string; title: string }[] = [];

  private swiper: Swiper | null = null;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._copyImageFromConfig();
  }

  private _copyImageFromConfig(): void {
    if (!this.config || !this.config.images) return;
    this.images = this.config.images;
    this.updateComplete.then(() => {
      this.initSwiper();
    });
  }

  private get showImageIndex(): boolean {
    return this.config?.show_image_index ?? false;
  }

  private initSwiper(): void {
    if (this.config.images.length === 0 || !this.config.images) return;
    const config = this.config?.extra_configs?.images_swipe || {};

    const swiperCon = this.shadowRoot?.querySelector('.swiper-container') as HTMLElement;
    if (!swiperCon) return;
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;

    const swiperConfig = () => {
      const defaultConfig: SwiperOptions = {
        modules: [Pagination, Autoplay, EffectFade, EffectCoverflow],
        centeredSlides: true,
        grabCursor: true,
        keyboard: {
          enabled: true,
          onlyInViewport: true,
        },
        loop: config.loop || true,
        speed: config.speed || 500,
        pagination: {
          clickable: true,
          el: paginationEl,
          dynamicBullets: true,
        },
        roundLengths: true,
        slidesPerView: 1,
        spaceBetween: 12,
      };
      const effeConfig: Partial<Record<string, Partial<SwiperOptions>>> = {
        slide: {},
        fade: {
          effect: 'fade',
          fadeEffect: { crossFade: true },
        },
        coverflow: {
          effect: 'coverflow',
          coverflowEffect: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          },
        },
      };

      if (config.autoplay === true) {
        Object.assign(defaultConfig, { autoplay: { delay: config.delay || 5000, disableOnInteraction: false } });
      }

      if (config.effect) {
        Object.assign(defaultConfig, effeConfig[config.effect || 'slide']);
      }
      return defaultConfig;
    };

    this.swiper = new Swiper(swiperCon, swiperConfig());
  }

  render(): TemplateResult {
    const imageConfig = this.config?.extra_configs?.images_swipe;
    const { max_height, max_width } = imageConfig ?? { max_height: 150, max_width: 450 };
    const styleImages = {
      '--vic-images-slide-height': `${max_height}px`,
      '--vic-images-slide-width': `${max_width}px`,
    };
    const images = this.images;
    const imagesLength = images.length;
    if (!images || images.length === 0) {
      return html``;
    }

    return html`
      <section id="swiper" style=${styleMap(styleImages)}>
        <div class="swiper-container">
          <div class="swiper-wrapper">
            ${images.map(
              (image, index) => html`
                <div class="swiper-slide">
                  ${this.editMode && this.showImageIndex
                    ? html`<span class="image-index">[${index + 1} / ${imagesLength}] - ${image.title}</span>`
                    : ''}
                  <img src="${image.url}" />
                </div>
              `
            )}
          </div>
          <div class="swiper-pagination"></div>
        </div>
      </section>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(swipercss),
      css`
        :host {
          --swiper-pagination-bottom: -8px;
          --swiper-theme-color: var(--primary-text-color);
        }
        section {
          display: block;
          padding: 1rem 0;
        }
        .swiper-wrapper {
          display: flex;
        }
        .swiper-container {
          width: 100%;
          height: 100%;
          display: block;
        }
        .swiper-slide {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        .swiper-slide:active {
          scale: 1.02;
        }
        .swiper-slide img {
          width: 100%;
          height: 100%;
          max-height: 150px;
          object-fit: scale-down;
          max-height: var(--vic-images-slide-height, 150px);
          max-width: var(--vic-images-slide-width, 450px);
        }
        .swiper-slide .image-index {
          position: absolute;
          bottom: 0;
          left: var(--vic-card-padding);
          padding: var(--vic-gutter-gap);
          background-color: var(--swiper-theme-color);
          color: var(--primary-background-color);
          font-size: 1rem;
          font-weight: bold;
          z-index: 1;
        }
        .swiper-pagination {
          display: block;
        }
        .swiper-pagination-bullet {
          background-color: var(--swiper-theme-color);
          transition: all 0.3s ease-in-out !important;
        }
        .swiper-pagination-bullet-active {
          width: 18px !important;
          border-radius: 1rem !important;
          opacity: 0.7;
        }
      `,
    ];
  }
}
