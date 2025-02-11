import * as maptilersdk from '@maptiler/sdk';
import mapstyle from '@maptiler/sdk/dist/maptiler-sdk.css';
import { mdiClose, mdiThemeLightDark } from '@mdi/js';
import { LitElement, html, css, TemplateResult, unsafeCSS, CSSResultGroup, PropertyValues } from 'lit';
import { styleMap } from 'lit-html/directives/style-map.js';
import { customElement, property, state } from 'lit/decorators.js';

import { carLocationIcon } from '../../const/imgconst';
import { MapData } from '../../types';
import { VehicleCard } from '../../vehicle-info-card';

const themeColors = {
  backgroundColor: {
    light: 'rgb(255, 255, 255)',
    dark: '#222222',
  },
  fill: {
    light: '#222222',
    dark: '#FFFFFF',
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

function getStyleByMode(mode: string) {
  return mode == 'dark' ? maptilersdk.MapStyle.STREETS.DARK : maptilersdk.MapStyle.STREETS.PASTEL;
}

@customElement('vic-maptiler-popup')
export class VicMaptilerPopup extends LitElement {
  @property({ attribute: false }) private mapData!: MapData;
  @property({ attribute: false }) private card!: VehicleCard;

  @state() private _themeMode?: 'dark' | 'light';
  @state() private map?: maptilersdk.Map | null;
  @state() private _mapInitialized: boolean = false;

  connectedCallback(): void {
    super.connectedCallback();
    window.maptiler = this;
    this._themeMode =
      localStorage.getItem('darkMap') === 'true' && localStorage.getItem('darkMap') !== null ? 'dark' : 'light';
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
  }

  protected async firstUpdated(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    this.initMap();
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('_themeMode') && this._themeMode !== undefined) {
      const oldMode = changedProperties.get('_themeMode') as 'dark' | 'light';
      const newMode = this._themeMode as 'dark' | 'light';
      if (oldMode !== undefined && oldMode !== newMode) {
        console.log('updated', newMode, oldMode);
        this._changeControlTheme(newMode);
      }
    }
  }

  protected shouldUpdate(_changedProperties: PropertyValues): boolean {
    if (_changedProperties.has('_mapInitialized') && this._mapInitialized) {
      setTimeout(() => {
        this._changeControlTheme(this._themeMode as 'dark' | 'light');
      }, 1500);
    }
    return true;
  }

  initMap() {
    if (!this.mapData || this._mapInitialized || !this._themeMode) return;
    const apiKey = this.card.config.extra_configs?.maptiler_api_key;
    if (!apiKey) {
      console.error('MapTiler API key is missing');
      return;
    }

    const mode = this._themeMode as 'dark' | 'light';
    const mapEl = this.shadowRoot?.getElementById('map') as HTMLElement;
    maptilersdk.config.apiKey = apiKey;
    const mapOptions: maptilersdk.MapOptions = {
      container: mapEl,
      zoom: 13.5,
      hash: false,
      pitch: 0,
      style: getStyleByMode(mode),
      geolocateControl: true,
      fullscreenControl: true,
    };

    this.map = new maptilersdk.Map(mapOptions);
    this.map.setCenter([this.mapData.lon, this.mapData.lat]);

    this.map.on('load', () => {
      this.addMarker();
    });

    this.map.addControl(
      {
        onAdd: (map) => {
          this.map = map as maptilersdk.Map;
          const geolocateCar = this._geolocateCar();
          geolocateCar.addEventListener('click', () => {
            this.map?.easeTo({ center: [this.mapData.lon, this.mapData.lat], zoom: 17.5, pitch: 60, bearing: 0 });
          });
          return geolocateCar;
        },
        onRemove: () => {
          // Nothing to do here
        },
      },
      'top-right'
    );

    this.map.on('error', (e) => {
      console.warn('Map error:', e.error);
    });
    this._mapInitialized = true;
  }

  private async addMarker() {
    const popUp = await this._markerPopup();
    const pictureUrl = this.mapData.entityPic;
    const markerEl = document.createElement('div');
    markerEl.id = 'marker';
    const pulse = document.createElement('div');
    pulse.classList.add('pulse');
    markerEl.appendChild(pulse);
    const marker = document.createElement('div');
    marker.id = 'marker-pic';
    marker.style.backgroundImage = pictureUrl ? `url(${pictureUrl})` : 'none';
    markerEl.appendChild(marker);
    new maptilersdk.Marker({ element: markerEl })
      .setLngLat([this.mapData.lon, this.mapData.lat])
      .setPopup(popUp)
      .addTo(this.map!);
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

  _geolocateCar(): HTMLElement {
    const iconStyle = `background-image: url(${carLocationIcon}); background-size: 60%;`;
    const findCar = document.createElement('div');
    findCar.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    findCar.innerHTML = `
      <button class="maplibregl-ctrl-find-car" type="button" title="Find Car">
        <span class="maplibregl-ctrl-icon" style="${iconStyle}"></span>
      </button>
      `;

    return findCar;
  }

  private _handleThemeToggle() {
    const mode = localStorage.getItem('darkMap') === 'true' ? 'dark' : 'light';
    if (mode === 'dark') {
      this.map?.setStyle(getStyleByMode('light'), { diff: false });
      this._themeMode = 'light';
      localStorage.removeItem('darkMap');
    } else {
      this.map?.setStyle(getStyleByMode('dark'), { diff: false });
      this._themeMode = 'dark';
      localStorage.setItem('darkMap', 'true');
    }
  }

  _changeControlTheme(mode: 'dark' | 'light') {
    const setTheme = (key: string) => {
      return mode === 'dark' ? themeColors[key].dark : themeColors[key].light;
    };

    const mapContainer = this.shadowRoot?.querySelector('#map') as HTMLElement;

    const controlContainer = mapContainer.querySelector('.maplibregl-control-container') as HTMLElement;
    if (!controlContainer) return;
    let ready = false;
    // Select the container with the control buttons

    // Select both top-right and bottom-right containers (instead of using `||`)
    const controlButtons = [
      controlContainer?.querySelector('.maplibregl-ctrl-top-left'),
      controlContainer?.querySelector('.maplibregl-ctrl-top-right'),
      controlContainer?.querySelector('.maplibregl-ctrl-bottom-right'),
    ].filter(Boolean); // Filter out null values

    if (!controlButtons || controlButtons.length === 0) return;

    // Iterate through all control button groups (top-right, bottom-right)
    for (const controlButtonGroup of controlButtons) {
      const controlGroups = Array.from(controlButtonGroup!.querySelectorAll('.maplibregl-ctrl.maplibregl-ctrl-group'));
      // Iterate through each control group
      for (const controlGroup of controlGroups) {
        const element = controlGroup as HTMLElement;
        element.style.backgroundColor = setTheme('backgroundColor') as string;
        element.style.boxShadow = setTheme('boxShadow') as string;

        // Select all buttons within the control group
        const buttons = Array.from(controlGroup.querySelectorAll('button'));
        // console.log('buttons', buttons);
        // Iterate through each button
        for (const button of buttons) {
          const buttonEl = button as HTMLButtonElement;
          // buttonEl.style.backgroundColor = setTheme('backgroundColor') as string;
          buttonEl.setAttribute('mode', mode);
          buttonEl.style.borderTop = setTheme('borderTop');
        }

        // const buttonsWithIcons = Array.from(controlGroup.querySelectorAll('button > span'));
        // // Iterate through each button with an icon
        // for (const spanEl of buttonsWithIcons) {
        //   const span = spanEl as HTMLSpanElement;
        //   const computedStyle = window.getComputedStyle(span);

        //   if (computedStyle.backgroundImage) {
        //     const newFillColor = setTheme('fill');

        //     // Try replacing without encoding
        //     span.style.backgroundImage = computedStyle.backgroundImage.replace('controlButtonsIconColor', newFillColor);
        //   }
        // }
      }

      ready = true;
    }
    if (ready) {
      controlContainer.classList.toggle('ready', ready);
    }
  }

  render(): TemplateResult {
    const haButtons = this._renderHaButtons();

    return html`
      <div class="tiler-map" style="${this._computeMapStyle()}">
        <div id="map"></div>
        ${haButtons}
      </div>
    `;
  }

  private _renderHaButtons() {
    if (!this._mapInitialized) return html``;
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

        #ha-button {
          position: absolute;
          z-index: 100;
          color: var(--vic-map-button-color);
          background-color: var(--vic-map-button-bg);
          box-shadow: var(--vic-map-button-shadow);
          border-radius: 50%;
          animation: fadeIn 600ms;
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

        .maplibregl-control-container {
          opacity: 0;
        }

        .maplibregl-control-container.ready {
          opacity: 1;
          transition: opacity 0.5s;
        }

        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-top-left,
        .maplibregl-ctrl-top-right {
          padding: 0.5rem;
        }
        button[mode='dark'] > span {
          filter: invert(1);
        }

        button > span:focus,
        button > span:hover,
        button > span:active {
          filter: none;
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
