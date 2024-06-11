import { LitElement, css, html } from 'lit';
import Swiper from 'swiper';
import { Pagination } from 'swiper/modules';
import swipercss from '../css/swiper-bundle.css';

export class HeaderSlide extends LitElement {
  static get properties() {
    return {
      images: { Type: Array },
      swiper: { Type: Object },
    };
  }

  static get styles() {
    return [
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

  firstUpdated() {
    if (!this.swiper) {
      this.initSwiper();
    }
  }

  initSwiper() {
    const swiperCon = this.shadowRoot.querySelector('.swiper-container');
    if (!swiperCon) return;
    const paginationEl = swiperCon.querySelector('.swiper-pagination');
    this.swiper = new Swiper(swiperCon, {
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

  render() {
    const images = this.images;
    if (!images || images.length === 0) {
      return html``;
    }
    return html`
      <section id="swiper">
        <div class="swiper-container">
          <div class="swiper-wrapper">
            ${images.map(
              (image) => html`
                <div class="swiper-slide">
                  <img src="${image}" />
                </div>
              `,
            )}
          </div>
          <div class="swiper-pagination"></div>
        </div>
      </section>
    `;
  }
}
customElements.define('header-slide', HeaderSlide);
