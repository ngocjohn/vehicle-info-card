import { LitElement, css, html, TemplateResult, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators';
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from '../css/swiper-bundle.css';
import { VehicleCardConfig } from '../types';

@customElement('header-slide')
export class HeaderSlide extends LitElement {
  @state() private config!: VehicleCardConfig;
  @state() private editMode!: boolean;
  @state() private showImageIndex!: boolean;
  @state() private images: { url: string; title: string }[] = [];

  private swiper: Swiper | null = null;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this.images = this.config.images;
    this.showImageIndex = this.config.show_image_index;
    this.updateComplete.then(() => {
      this.initSwiper();
    });
  }

  initSwiper(): void {
    // Destroy the existing Swiper instance if it exists

    const swiperCon = this.shadowRoot?.querySelector('.swiper-container');
    if (!swiperCon) return;
    const paginationEl = swiperCon.querySelector('.swiper-pagination') as HTMLElement;
    this.swiper = new Swiper(swiperCon as HTMLElement, {
      modules: [Pagination],
      centeredSlides: true,
      grabCursor: true,
      speed: 500,
      roundLengths: true,
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
      loop: true,
      slidesPerView: 1,
      pagination: {
        el: paginationEl,
        clickable: true,
      },
    });
  }

  render(): TemplateResult {
    const images = this.images;
    if (!images || images.length === 0) {
      return html``;
    }
    const imagesLength = images.length;
    return html`
      <section id="swiper">
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

  static styles = [
    swipercss,
    css`
      :host {
        --swiper-pagination-bottom: 0px;
        --swiper-theme-color: var(--primary-text-color);
      }
      section {
        display: block;
        padding: 1rem 0;
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
        max-height: 125px;
      }
      .swiper-slide:active {
        scale: 1.02;
      }
      .swiper-slide img {
        width: 100%;
        height: 100%;
        max-height: 150px;
        object-fit: scale-down;
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
