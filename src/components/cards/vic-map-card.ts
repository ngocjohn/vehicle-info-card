// Leaflet imports
import * as L from 'leaflet';
import mapstyle from 'leaflet/dist/leaflet.css';
import 'leaflet-providers';
// Lit imports
import { LitElement, html, css, TemplateResult, PropertyValues, CSSResultGroup, unsafeCSS, nothing } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { MAPTILER_DIALOG_STYLES, DEFAULT_DIALOG_STYLES, DEFAULT_HOURS_TO_SHOW } from '../../const/maptiler-const';
import {
  HistoryStates,
  isComponentLoaded,
  MapData,
  SECTION,
  SECTION_DEFAULT_ORDER,
  subscribeHistory,
  HomeAssistant,
} from '../../types';
import { MapPopupConfig } from '../../types/card-config/mini-map';
import { LovelaceCardConfig } from '../../types/ha-frontend/lovelace/lovelace';
import { _getHistoryPoints, _getMapAddress, createMapPopup } from '../../utils';
import './vic-maptiler-popup';
import { createCloseHeading } from '../../utils/create';
import { VehicleCard } from '../../vehicle-info-card';

export interface MapConfig extends MapPopupConfig {
  device_tracker: string;
  google_api_key?: string;
  maptiler_api_key?: string;
}

@customElement('vehicle-map')
export class VehicleMap extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) mapData!: MapData;
  @property({ attribute: false }) card!: VehicleCard;
  @property({ type: Boolean }) isDark!: boolean;
  @property({ type: Boolean }) open!: boolean;

  @state() private map: L.Map | null = null;
  private latLon: L.LatLng | null = null;
  private marker: L.Marker | null = null;

  private mapCardPopup?: LovelaceCardConfig[];
  @state() private _locateIconVisible = false;
  @state() private _addressReady = false;

  private _address: Partial<MapData['address']> | null = null;
  private _subscribed?: Promise<(() => Promise<void>) | undefined>;
  private _stateHistory?: HistoryStates;
  private _historyPoints?: any | undefined;

  private get mapPopup(): boolean {
    return this.card.config?.enable_map_popup ?? false;
  }

  private get zoom(): number {
    return this.card.config.map_popup_config?.map_zoom ?? 14;
  }

  public get mapConfig(): MapConfig {
    const { map_popup_config, device_tracker = '', google_api_key = '' } = this.card.config;
    const maptiler_api_key = this.card.config.extra_configs?.maptiler_api_key;
    return { ...map_popup_config, device_tracker, google_api_key, maptiler_api_key };
  }

  private get _deviceNotInZone(): boolean {
    const device_tracker = this.mapConfig.device_tracker;
    if (!device_tracker) return true;
    return this.hass.states[device_tracker]?.state === 'not_home';
  }

  private get _deviceState(): string {
    const device_tracker = this.mapConfig.device_tracker;
    if (!device_tracker) return '';
    const stateObj = this.hass.states[device_tracker];
    return stateObj ? this.hass.formatEntityState(stateObj) : '';
  }

  connectedCallback() {
    super.connectedCallback();
    this._subscribeHistory();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  private _subscribeHistory() {
    const mapConfig = this.mapConfig;
    const hass = this.hass;
    if (
      !isComponentLoaded(hass!, 'history') ||
      this._subscribed ||
      !(mapConfig.hours_to_show ?? DEFAULT_HOURS_TO_SHOW)
    ) {
      return;
    }

    const historyPeriod = mapConfig?.history_period;
    const now = new Date();

    // Get range of time to show
    let startTime = new Date(now);
    let endTime = new Date(now);
    if (historyPeriod === 'today') {
      startTime.setHours(0, 0, 0, 0);
    } else if (historyPeriod === 'yesterday') {
      startTime.setDate(now.getDate() - 1);
      startTime.setHours(0, 0, 0, 0);
    } else {
      startTime = new Date(now.getTime() - 60 * 60 * (mapConfig.hours_to_show ?? DEFAULT_HOURS_TO_SHOW) * 1000);
    }

    this._subscribed = subscribeHistory(
      hass!,
      (combinedHistory) => {
        if (!this._subscribed) {
          // Message came in before we had a chance to unload
          return;
        }
        this._stateHistory = combinedHistory;
        // console.log('History updated:', this._stateHistory);
      },
      new Date(startTime),
      new Date(endTime),
      [mapConfig.device_tracker!]
    ).catch((err) => {
      this._subscribed = undefined;
      console.error('Error subscribing to history', err);
      return undefined;
    });
  }

  private _unsubscribeHistory() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
  }

  protected async updated(changedProperties: PropertyValues): Promise<void> {
    super.updated(changedProperties);
    if (changedProperties.has('mapData') && this.mapData && this.mapData !== undefined) {
      this.initMap();
      this._getAddress();
    }
  }

  protected shouldUpdate(changedProperties: PropertyValues): boolean {
    if (changedProperties.has('hass') && this.hass && this.map) {
      const { lat, lon } = this.mapData;
      const stateObj = this.hass.states[this.mapConfig.device_tracker!];
      if (stateObj) {
        const { latitude, longitude } = stateObj.attributes;
        if (lat !== latitude || lon !== longitude) {
          console.log('Map data changed:', lat, lon);
          this.mapData.lat = latitude;
          this.mapData.lon = longitude;
          this.latLon = this._getTargetLatLng(this.map);
          this.marker?.setLatLng([latitude, longitude]);
          this.map.setView(this.latLon, this.zoom);
          this._getAddress();
        }
      }
    }
    return true;
  }

  private async _getAddress(): Promise<void> {
    const { lat, lon } = this.mapData;
    const address = await _getMapAddress(this.card, lat, lon);
    if (address) {
      this._address = address;
      this.mapData.address = address;
      this._addressReady = true;
    } else if (!this._address) {
      this._addressReady = true;
    }
  }

  initMap(): void {
    const { lat, lon } = this.mapData;
    const defaultZoom = this.zoom;
    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
      zoom: defaultZoom,
    };

    const mapContainer = this.shadowRoot?.getElementById('map') as HTMLElement;
    if (!mapContainer) return;
    this.map = L.map(mapContainer, mapOptions).setView([lat, lon]);

    this.latLon = this._getTargetLatLng(this.map);

    this.map.setView(this.latLon, this.zoom);

    // Add tile layer to map
    this._createTileLayer(this.map);
    // Add marker to map
    this.marker = this._createMarker(this.map);
    this.map.on('moveend zoomend', () => {
      // check visibility of marker icon on view
      const bounds = this.map!.getBounds();
      const isMarkerVisible = bounds.contains(this.marker!.getLatLng());
      this._locateIconVisible = isMarkerVisible;
    });
  }

  private _getTargetLatLng(map: L.Map): L.LatLng {
    const { lat, lon } = this.mapData;
    const mapSizeSplit = map.getSize().x;
    const targetPoint = map.project([lat, lon], this.zoom).subtract([mapSizeSplit / 5, 3]);
    const targetLatLng = map.unproject(targetPoint, this.zoom);
    return targetLatLng;
  }

  private _createMarker(map: L.Map): L.Marker {
    const { lat, lon } = this.mapData;

    const customIcon = L.divIcon({
      html: `<div class="marker">
            </div>`,
      iconSize: [24, 24],
      className: 'marker',
    });

    // Add marker to map
    const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
    // Add click event listener to marker
    marker.on('click', () => {
      this._toggleMapDialog();
    });

    return marker;
  }

  private _createTileLayer(map: L.Map): L.TileLayer {
    const tileOpts = {
      tileSize: 256,
      className: 'map-tiles',
    };

    const tileLayer = L.tileLayer.provider('CartoDB.Positron', tileOpts).addTo(map);
    return tileLayer;
  }

  private resetMap(): void {
    if (!this.map || !this.latLon) return;
    this.map.flyTo(this.latLon, this.zoom);
  }

  protected render(): TemplateResult {
    const maptiler_api_key = this.card.config.extra_configs?.maptiler_api_key;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return html`
      <div class="map-wrapper" ?safari=${isSafari} style=${this._computeMapStyle()}>
        <div id="overlay-container">
          <div class="reset-button" @click=${this.resetMap} .hidden=${this._locateIconVisible}>
            <ha-icon icon="mdi:compass"></ha-icon>
          </div>
          ${this._renderAddress()}
        </div>
        <div id="map"></div>
      </div>

      ${maptiler_api_key ? this._renderMaptilerDialog() : this._renderMapDialog()}
    `;
  }

  private _renderAddress(): TemplateResult {
    const useZoneName = this.mapConfig?.use_zone_name;

    if (this.card.config.map_popup_config?.show_address === false) return html``;
    if (!this._addressReady) return html` <div class="address-line loading"><span class="loader"></span></div> `;

    const address = this._address || {};
    const inZone = !this._deviceNotInZone;

    const addressContent =
      useZoneName && inZone
        ? html`<span class="primary">${this._deviceState}</span>`
        : html`
            <span class="secondary">${address.streetName}</span>
            <span class="primary">${address.sublocality || address.city}</span>
          `;

    return address?.streetName
      ? html` <div class="address-line">
          <ha-icon icon="mdi:map-marker"></ha-icon>
          <div class="address-info">${addressContent}</div>
        </div>`
      : html``;
  }

  private _renderMaptilerDialog(): TemplateResult | typeof nothing {
    const maptiler_api_key = this.card.config.extra_configs?.maptiler_api_key;
    if (!this.open || !maptiler_api_key) return nothing;

    this._historyPoints = _getHistoryPoints(this.card.config!, this._stateHistory);

    return html`
      <ha-dialog open @closed=${() => (this.open = false)} hideActions flexContent>
        ${MAPTILER_DIALOG_STYLES}

        <vic-maptiler-popup
          .mapData=${this.mapData}
          .card=${this.card}
          ._mapConfig=${this.mapConfig}
          ._paths=${this._historyPoints}
          @close-dialog=${() => {
            this.open = false;
          }}
        ></vic-maptiler-popup>
      </ha-dialog>
    `;
  }

  private _renderMapDialog(): TemplateResult | typeof nothing {
    if (!this.open) return nothing;
    return html`
      <ha-dialog
        open
        .heading=${createCloseHeading(this.hass, 'Map')}
        @closed=${() => (this.open = false)}
        hideActions
        flexContent
      >
        ${DEFAULT_DIALOG_STYLES}
        <div class="container">${this.mapCardPopup}</div>
      </ha-dialog>
    `;
  }

  private async _toggleMapDialog() {
    if (!this.mapPopup) return;
    if (!this.mapConfig.maptiler_api_key && !this.mapCardPopup && !this.open) {
      createMapPopup(this.hass, this.card.config).then((popup) => {
        this.mapCardPopup = popup;
        setTimeout(() => {
          this.open = true;
        }, 50);
      });
    } else {
      this.open = !this.open;
      return;
    }
  }
  private _computeMapStyle() {
    const sectionOrder = this.card.config.extra_configs?.section_order ?? [...SECTION_DEFAULT_ORDER];
    const noHeader = this.card.config.name?.trim() === '' || this.card.config.name === undefined;
    const firstItem = sectionOrder[0] === SECTION.MINI_MAP && noHeader;
    const lastItem = sectionOrder[sectionOrder.length - 1] === SECTION.MINI_MAP;
    const mapSingle = sectionOrder.includes(SECTION.MINI_MAP) && sectionOrder.length === 1;

    let maskImage = 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)';

    if (lastItem && !firstItem) {
      maskImage = 'linear-gradient(to bottom, transparent 0%, black 10%)';
    } else if (firstItem && !lastItem) {
      maskImage = 'linear-gradient(to bottom, black 90%, transparent 100%)';
    } else if (mapSingle) {
      maskImage = 'linear-gradient(to bottom, transparent 0%, black 0%, black 100%, transparent 100%)';
    }

    const markerColor = this.isDark ? 'var(--accent-color)' : 'var(--primary-color)';
    const markerFilter = this.isDark ? 'contrast(1.2) saturate(6) brightness(1.3)' : 'none';
    const tileFilter = this.isDark
      ? 'brightness(0.6) invert(1) contrast(6) saturate(0.3) brightness(0.7) opacity(.25)'
      : 'grayscale(1) contrast(1.1) opacity(1)';
    const minimapHeight = this.card.config.extra_configs?.mini_map_height;
    return styleMap({
      '--vic-map-marker-color': markerColor,
      '--vic-marker-filter': markerFilter,
      '--vic-map-tiles-filter': tileFilter,
      '--vic-map-mask-image': maskImage,
      '--vic-map-height': minimapHeight ? `${minimapHeight}px` : `150px`,
      height: minimapHeight ? `${minimapHeight}px` : `150px`,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(mapstyle),
      css`
        *:focus {
          outline: none;
        }
        .map-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-wrapper[safari] {
          width: calc(100% + 0.6rem);
          left: -0.5rem;
        }

        .map-wrapper.loading {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #overlay-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          /* background-color: var(--ha-card-background, var(--card-background-color)); */
          /* opacity: 0.6;  */
        }

        #map {
          height: 100%;
          width: 100%;
          background-color: transparent !important;
          mask-image: var(--vic-map-mask-image);
          mask-composite: intersect;
        }

        .map-tiles {
          filter: var(--vic-map-tiles-filter, none);
          position: relative;
          width: 100%;
          height: 100%;
        }

        .marker {
          position: relative;
          width: 24px;
          height: 24px;
          /* filter: var(--vic-marker-filter); */
        }

        .marker::before {
          content: '';
          position: absolute;
          width: calc(100% + 1rem);
          height: calc(100% + 1rem);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-image: radial-gradient(
            circle,
            transparent 0%,
            rgb(from var(--vic-map-marker-color) r g b / 25%) 100%
          );
          border-radius: 50%;
          border: none !important;
          /* opacity: 0.6; */
        }

        .marker::after {
          content: '';
          position: absolute;
          width: 50%;
          height: 50%;
          background-color: var(--vic-map-marker-color);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          /* border: 1px solid white; */
          transform: translate(-50%, -50%);
          opacity: 1;
          transition: all 0.2s ease;
        }
        .marker:hover::after {
          width: calc(60% + 1px);
          height: calc(60% + 1px);
        }

        .leaflet-control-container {
          display: none;
        }

        .reset-button {
          position: absolute;
          top: 1em;
          right: 1em;
          z-index: 2;
          cursor: pointer;
          opacity: 0.5;
          &:hover {
            opacity: 1;
          }
        }
        .address-line {
          position: absolute;
          width: max-content;
          height: fit-content;
          bottom: 1rem;
          left: 1rem;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary-text-color);
          backdrop-filter: blur(2px);
          text-shadow: 0 0 black;
          ha-icon {
            color: var(--secondary-text-color);
          }
          .address-info {
            display: flex;
            flex-direction: column;
          }
          .address-info span {
            font-weight: 400;
            font-size: 12px;
            letter-spacing: 0.5px;
            line-height: 16px;
          }
          span.primary {
            text-transform: uppercase;
            opacity: 0.8;
            letter-spacing: 1px;
          }
        }
        .loader {
          width: 48px;
          height: 48px;
          display: inline-block;
          position: relative;
        }
        .loader::after,
        .loader::before {
          content: '';
          box-sizing: border-box;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid var(--primary-text-color);
          position: absolute;
          left: 0;
          top: 0;
          animation: animloader 2s linear infinite;
          opacity: 0;
        }
        .loader::after {
          animation-delay: 1s;
        }

        @keyframes animloader {
          0% {
            transform: scale(0);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vehicle-map': VehicleMap;
  }
}
