import * as maptilersdk from '@maptiler/sdk';
import mapstyle from '@maptiler/sdk/dist/maptiler-sdk.css';
import { mdiClose, mdiThemeLightDark } from '@mdi/js';
import { LitElement, html, css, TemplateResult, unsafeCSS, CSSResultGroup, nothing, PropertyValues } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';

import { carLocationIcon } from '../../const/imgconst';
import { MapData } from '../../types';
import { VehicleCard } from '../../vehicle-info-card';

const themeColors = {
  backgroundColor: {
    light: '#fff',
    dark: '#222222',
  },
  fill: {
    light: '#333',
    dark: '#c1c1c1',
  },
  boxShadow: {
    light: '0 0 0 2px rgba(0, 0, 0, 0.1)',
    dark: '0 0 0 2px rgba(255, 255, 255, 0.1)',
  },
  borderTop: {
    light: '1px solid #ddd',
    dark: '1px solid #424242',
  },
};

@customElement('vic-maptiler-popup')
export class VicMaptilerPopup extends LitElement {
  @property({ attribute: false }) private mapData!: MapData;
  @property({ attribute: false }) private card!: VehicleCard;
  @state() private _themeMode?: 'dark' | 'light';
  @state() private map?: maptilersdk.Map | null;

  private _loadError: boolean = false;
  private observer?: MutationObserver | null;
  private _observerReady = false;

  connectedCallback(): void {
    super.connectedCallback();
    window.maptiler = this;
    const mapConfigMode = this.card.config.map_popup_config.theme_mode;
    if (mapConfigMode === 'auto') {
      this._themeMode = this.card.isDark ? 'dark' : 'light';
    } else {
      this._themeMode = mapConfigMode as 'dark' | 'light';
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    localStorage.removeItem('darkMap');
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this._observerReady = false;
    }
  }

  protected async firstUpdated(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.initMap();
    if (this.map && !this._observerReady) {
      this._addObserver();
    }
  }

  private async _addObserver() {
    if (this._observerReady) return;
    // Initialize the MutationObserver to observe changes in the map controls
    this.observer = new MutationObserver((mutations) => {
      let themeChangeRequired = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          themeChangeRequired = true; // Only change theme if childList mutations are detected
        }
      });

      if (themeChangeRequired) {
        // Use requestAnimationFrame to debounce the theme change if multiple mutations occur
        requestAnimationFrame(() => {
          this._changeControlTheme(this._themeMode as 'dark' | 'light');
        });
      }
    });
    // Wait for the map container to be available and observe changes in the controls
    const mapContainer = this.shadowRoot?.querySelector('#map') as HTMLElement;
    if (mapContainer) {
      const controlContainer = mapContainer.querySelector('.maplibregl-control-container') as HTMLElement;
      if (controlContainer) {
        console.log('controlContainer found');
        this.observer.observe(controlContainer, { childList: true, subtree: true });
        console.log('Observer added');
        this._observerReady = true; // Mark the observer as ready
      } else {
        console.log('controlContainer not found. Delaying observer addition.');
        // Retry observing after a small delay if controlContainer isn't available
        setTimeout(() => this._addObserver(), 500); // Adjust delay as needed
      }
    }
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (_changedProperties.has('_themeMode')) {
      const oldMode = _changedProperties.get('_themeMode') as 'dark' | 'light';
      const newMode = this._themeMode as 'dark' | 'light';
      if (oldMode !== undefined && oldMode !== newMode) {
        console.log('Theme mode changed:', newMode);
        return true;
      }
    }
    return true;
  }

  initMap() {
    const demoStyle = 'https://demotiles.maplibre.org/style.json';
    const apiKey = this.card.config.extra_configs.maptiler_api_key!;
    const mapConfig = this.card.config.map_popup_config;
    const mode = this._themeMode!;
    const mapEl = this.shadowRoot?.getElementById('map') as HTMLElement;
    maptilersdk.config.apiKey = apiKey;
    const mapOptions: maptilersdk.MapOptions = {
      container: mapEl,
      zoom: mapConfig.default_zoom || 13.5,
      hash: false,
      style: this.getStyleByMode(mode),
      geolocateControl: true,
      fullscreenControl: true,
      canvasContextAttributes: { antialias: true },
    };

    this.map = new maptilersdk.Map(mapOptions);
    this.map.setCenter([this.mapData.lon, this.mapData.lat]);
    this.map.on('error', (e) => {
      console.log('Map error:', e.error);
      this._loadError = true;
      this.map?.setStyle(demoStyle);
      this.map?.setZoom(5);
    });
    this.map.on('load', () => {
      this.addMarker();
      this._addFindCarControl();
    });

    this.map.on('styleimagemissing', (e) => {
      this.map?.addImage(e.id, {
        width: 0,
        height: 0,
        data: new Uint8Array(0),
      });
    });
  }

  private getStyleByMode(mode: string) {
    return mode == 'dark' ? maptilersdk.MapStyle.STREETS.DARK : maptilersdk.MapStyle.STREETS;
  }

  private _addBuildings() {
    const apiKey = this.card.config.extra_configs?.maptiler_api_key;
    const layers = this.map?.getStyle().layers;
    if (!layers) return;
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout?.['text-field']) {
        labelLayerId = layers[i].id;
        console.log('labelLayerId', labelLayerId);
        break;
      }
    }

    this.map?.addSource('openmaptiles', {
      url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${apiKey}`,
      type: 'vector',
    });

    this.map?.addLayer(
      {
        id: '3d-buildings',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 15,
        filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', 'render_height'],
            0,
            'lightblue',
            30,
            'royalblue',
            100,
            'blue',
          ],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, ['get', 'render_height']],
          'fill-extrusion-base': ['case', ['>=', ['get', 'zoom'], 16], ['get', 'render_min_height'], 0],
        },
      },
      labelLayerId
    );
  }

  private async addMarker() {
    const popUp = await this._markerPopup();
    const markerEl = this._createMarker();

    new maptilersdk.Marker({ element: markerEl })
      .setLngLat([this.mapData.lon, this.mapData.lat])
      .setPopup(popUp)
      .addTo(this.map!);

    markerEl.addEventListener('dblclick', (ev: MouseEvent) => {
      ev.stopPropagation();
      ev.preventDefault();
    });
  }

  private _createMarker(): HTMLElement {
    const pictureUrl = this.mapData.entityPic;
    const markerEl = document.createElement('div');
    markerEl.id = 'marker';
    markerEl.innerHTML = `
        <div class="pulse"></div>
        <div id="marker-pic" style="background-image: url(${pictureUrl || 'none'})"></div>
    `;
    return markerEl;
  }

  private async _markerPopup() {
    const deviceTracker = this.card.config.device_tracker!;
    const deviceName = this.card.getFormattedAttributeState(deviceTracker, 'friendly_name');
    const deviceState = this.card.getStateDisplay(deviceTracker);
    let popupContent = `
      ${deviceName}<br />
      ${deviceState} <br />
    `;
    // Wait for the address to be fetched
    const address = await this._getAddress();

    if (address) {
      popupContent += `<br />${address}`;
    }

    const popUp = new maptilersdk.Popup({ offset: 32, closeButton: false, closeOnMove: true }).setHTML(popupContent);
    return popUp;
  }

  _getAddress = async () => {
    const { lat, lon } = this.mapData;
    const apiKey = this.card.config.extra_configs?.maptiler_api_key;
    if (!apiKey) {
      console.error('MapTiler API key is missing');
      return;
    }
    const url = `https://api.maptiler.com/geocoding/${lon},${lat}.json?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const placeNameKey = Object.keys(feature).find((key) => key !== 'place_name_en' && key.startsWith('place_name_'));

      const address = placeNameKey ? feature[placeNameKey] : feature.place_name_en;
      console.log('address', address);
      return address;
    } else {
      return '';
    }
  };

  private _addFindCarControl() {
    this.map?.addControl(
      {
        onAdd: () => {
          const iconStyle = `background-image: url(${carLocationIcon}); background-size: 60%;`;
          const findCar = document.createElement('div');
          findCar.className = 'maplibregl-ctrl maplibregl-ctrl-group';
          findCar.innerHTML = `
            <button class="maplibregl-ctrl-find-car" type="button" title="Find Car">
              <span class="maplibregl-ctrl-icon" style="${iconStyle}"></span>
            </button>
          `;
          findCar.addEventListener('click', () => {
            this.map?.flyTo({ center: [this.mapData.lon, this.mapData.lat], zoom: 17.5, pitch: 60, bearing: 0 });
          });

          return findCar;
        },
        onRemove: () => {},
      },
      'top-right'
    );
  }

  private _handleThemeToggle() {
    const mode = this._themeMode;
    if (mode === 'dark') {
      this.map?.setStyle(this.getStyleByMode('light'), { diff: false });
      this._themeMode = 'light';
      localStorage.removeItem('darkMap');
    } else {
      this.map?.setStyle(this.getStyleByMode('dark'), { diff: false });
      this._themeMode = 'dark';
      localStorage.setItem('darkMap', 'true');
    }
  }

  // Your existing change control theme logic here
  _changeControlTheme(mode: 'dark' | 'light') {
    // Your existing implementation for applying themes to the controls
    const setTheme = (key: string) => {
      return mode === 'dark' ? themeColors[key].dark : themeColors[key].light;
    };

    const mapContainer = this.shadowRoot?.querySelector('#map') as HTMLElement;
    const controlContainer = mapContainer.querySelector('.maplibregl-control-container') as HTMLElement;

    if (controlContainer) {
      const controlButtons = [
        controlContainer?.querySelector('.maplibregl-ctrl-top-left'),
        controlContainer?.querySelector('.maplibregl-ctrl-top-right'),
        controlContainer?.querySelector('.maplibregl-ctrl-bottom-right'),
      ].filter(Boolean) as HTMLElement[];

      if (!controlButtons.length || controlButtons.length === 0) return;
      // Apply styles to control buttons
      for (const controlButtonGroup of controlButtons) {
        const controlGroups = Array.from(
          controlButtonGroup!.querySelectorAll('.maplibregl-ctrl.maplibregl-ctrl-group')
        );
        for (const controlGroup of controlGroups) {
          const element = controlGroup as HTMLElement;
          element.style.backgroundColor = setTheme('backgroundColor') as string;
          element.style.boxShadow = setTheme('boxShadow') as string;

          const buttons = Array.from(controlGroup.querySelectorAll('button'));
          for (const button of buttons) {
            const buttonEl = button as HTMLButtonElement;

            const spanEl = button?.querySelector('span') as HTMLSpanElement;
            if (spanEl) {
              const computedStyle = window.getComputedStyle(spanEl);
              const backgroundImage = computedStyle.backgroundImage;
              if (backgroundImage.startsWith('url("data:image/svg+xml')) {
                const fillColor = setTheme('fill') as string;
                const svgUri = backgroundImage.slice(5, -2);
                const decodedSvg = decodeURIComponent(svgUri.split(',')[1]);

                const updatedSvg = decodedSvg
                  .replace(/fill:[^;"]*/g, `fill:${fillColor}`)
                  .replace(/fill="[^"]*"/g, `fill="${fillColor}"`);

                const encodedSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(updatedSvg)}`;
                spanEl.style.backgroundImage = `url("${encodedSvg}")`;
              }
            }
            const prevButton = button?.previousElementSibling as HTMLButtonElement;
            if (prevButton && prevButton.type === 'button') {
              buttonEl.style.borderTop = setTheme('borderTop') as string;
            }
          }
        }
      }
    }
  }

  render(): TemplateResult {
    const haButtons = this._renderHaButtons();
    const loadError = this._renderLoadError();
    return html`
      <div class="tiler-map" style="${this._computeMapStyle()}">
        ${loadError}
        <div id="map">${haButtons}</div>
      </div>
    `;
  }

  private _renderLoadError(): TemplateResult | typeof nothing {
    if (!this._loadError) return nothing;
    return html`<div id="error">
      <ha-alert alert-type="error">Error fetching the map. Please verify your API key and try again.</ha-alert>
    </div>`;
  }

  private _renderHaButtons(): TemplateResult {
    return html`
      <ha-icon-button
        id="ha-button"
        class="close-btn"
        .path="${mdiClose}"
        .label="${'Close'}"
        @click="${this._closeDialog}"
      ></ha-icon-button>
      <ha-icon-button
        id="ha-button"
        class="theme-toggle"
        .label="${this._themeMode === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}"
        .path="${mdiThemeLightDark}"
        @click="${this._handleThemeToggle}"
      ></ha-icon-button>
    `;
  }

  private _closeDialog() {
    this.dispatchEvent(new CustomEvent('close-dialog', { bubbles: true, composed: true }));
  }

  private _computeMapStyle() {
    const getStyle = (key: string) => {
      return this._themeMode === 'dark' ? themeColors[key].dark : themeColors[key].light;
    };

    const entityPic = this.mapData?.entityPic;
    const markerColor = this._themeMode === 'dark' ? 'var(--accent-color)' : 'var(--primary-color)';
    const picBgcolor = entityPic ? 'rgba(0, 0, 0, 0.5)' : markerColor;
    const markerSize = entityPic ? '3.5rem' : '2rem';
    const buttonBg = getStyle('backgroundColor');
    const buttonColor = getStyle('fill');
    const boxShadow = getStyle('boxShadow');

    return styleMap({
      '--vic-map-marker-color': markerColor,
      '--vic-map-marker-pic': picBgcolor,
      '--vic-map-marker-size': markerSize,
      '--vic-map-button-bg': buttonBg,
      '--vic-map-button-color': buttonColor,
      '--vic-map-button-shadow': boxShadow,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(mapstyle),
      css`
        .tiler-map {
          position: relative;
          width: 100%;
          height: 75vh;
          font-family: inherit;
        }
        @media all and (max-width: 600px), all and (max-height: 500px) {
          .tiler-map {
            height: 100vh;
          }
        }

        #error {
          position: absolute;
          top: 0.5rem;
          left: 50%;
          transform: translateX(-50%);
          background: var(--card-background-color);
          height: fit-content;
          display: flex;
          justify-content: center;
          z-index: 100;
        }

        #ha-button {
          position: absolute;
          z-index: 100;
          color: var(--vic-map-button-color);
          background-color: var(--vic-map-button-bg);
          box-shadow: var(--vic-map-button-shadow);
          border-radius: 50%;
          animation: fadeIn 600ms;
          --mdc-icon-button-size: 33px;
          margin: 10px;
        }
        .close-btn {
          top: 0.5rem;
          left: 0.5rem;
        }
        .theme-toggle {
          bottom: 0.5rem;
          right: 0.5rem;
        }

        .fade-in {
          animation: fadeIn 0.5s;
        }

        #map {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
        }

        #marker {
          position: relative;
          width: var(--vic-map-marker-size);
          height: var(--vic-map-marker-size);
        }
        #marker .pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: rgb(from var(--vic-map-marker-color) r g b / 1);
          border: 2px solid transparent;
          border-radius: 50%;
          animation: pulse 5s infinite;
        }

        #marker-pic {
          position: absolute;
          width: 100%;
          height: 100%;
          background-size: contain;
          background-color: rgb(from var(--vic-map-marker-color) r g b / 30%);
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          color: white;
        }

        /* .maplibregl-control-container {
          opacity: 0;
        }

        .maplibregl-control-container.ready {
          opacity: 1;
          transition: opacity 0.5s;
        } */

        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-top-left,
        .maplibregl-ctrl-top-right {
          padding: 0.5rem;
        }

        .maplibregl-popup {
          max-width: 200px;
        }
        .maplibregl-popup-content {
          background-color: var(--vic-map-button-bg);
          color: var(--vic-map-button-color);
          border-radius: 0.5rem;
          font-size: 1rem;
        }

        .maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
          border-top-color: var(--vic-map-button-bg);
        }

        .maplibregl-ctrl-bottom-left > .maplibregl-ctrl:not(.maplibregl-map) {
          display: none !important;
        }

        .maplibregl-ctrl-bottom-right > details {
          display: none;
        }
        @media all and (max-width: 600px), all and (max-height: 500px) {
          .maplibregl-ctrl-top-right .maplibregl-ctrl.maplibregl-ctrl-group .maplibregl-ctrl-fullscreen {
            display: none !important;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(0.1);
            opacity: 0;
          }
          30% {
            opacity: 0.5;
          }
          60% {
            transform: scale(2);
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vic-maptiler-popup': VicMaptilerPopup;
  }
  interface Window {
    maptiler: VicMaptilerPopup;
  }
}
