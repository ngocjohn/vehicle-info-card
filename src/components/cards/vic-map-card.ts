// Leaflet imports
import L from 'leaflet';
import mapstyle from 'leaflet/dist/leaflet.css';
import 'leaflet-providers';
// Lit imports
import { LitElement, html, css, TemplateResult, PropertyValues, CSSResultGroup, unsafeCSS } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { MapData, SECTION, SECTION_DEFAULT_ORDER } from '../../types';
import { LovelaceCardConfig } from '../../types/ha-frontend/lovelace/lovelace';
import { _getMapAddress, createMapPopup } from '../../utils';
import { createCloseHeading } from '../../utils/create';
import { VehicleCard } from '../../vehicle-info-card';

@customElement('vehicle-map')
export class VehicleMap extends LitElement {
  @property({ attribute: false }) private mapData!: MapData;
  @property({ attribute: false }) private card!: VehicleCard;
  @property({ type: Boolean }) private isDark!: boolean;
  @property({ type: Boolean }) open!: boolean;

  @state() private map: L.Map | null = null;
  @state() private latLon: L.LatLng | null = null;
  @state() private marker: L.Marker | null = null;

  @state() private mapCardPopup?: LovelaceCardConfig[];
  @state() private _addressReady = false;

  @state() private _address: Partial<MapData['address']> | null = null;

  private get mapPopup(): boolean {
    return this.card.config.enable_map_popup;
  }

  private get zoom(): number {
    return this.card.config.map_popup_config.default_zoom ?? 14;
  }

  protected async updated(changedProperties: PropertyValues): Promise<void> {
    super.updated(changedProperties);
    if (changedProperties.has('mapData') && this.mapData && this.mapData !== undefined) {
      this.initMap();
      this._getAddress();
    }
  }

  private async _getAddress(): Promise<void> {
    if (!this.mapData || this.mapData.lat === undefined || this.mapData.lon === undefined) return;
    const address = await _getMapAddress(this.card, this.mapData.lat, this.mapData.lon);
    if (address) {
      this._address = address;
      this._addressReady = true;
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

  initMap(): void {
    const { lat, lon } = this.mapData;
    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
    };

    const mapContainer = this.shadowRoot?.getElementById('map') as HTMLElement;
    if (!mapContainer) return;
    this.map = L.map(mapContainer, mapOptions).setView([lat, lon], this.zoom);
    const offset: [number, number] = this.calculateLatLngOffset(this.map, lat, lon, this.map.getSize().x / 5, 3);

    this.latLon = L.latLng(offset[0], offset[1]);
    this.map.setView(this.latLon, this.zoom);

    // Add tile layer to map
    this._createTileLayer(this.map);
    // Add marker to map
    this.marker = this._createMarker(this.map);
  }

  private _createTileLayer(map: L.Map): L.TileLayer {
    const tileOpts = {
      tileSize: 256,
      className: 'map-tiles',
    };

    const tileLayer = L.tileLayer.provider('CartoDB.Positron', tileOpts).addTo(map);
    return tileLayer;
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

  private resetMap(): void {
    if (!this.map || !this.latLon) return;
    this.map.flyTo(this.latLon, this.zoom);
  }

  private calculateLatLngOffset(
    map: L.Map,
    lat: number,
    lng: number,
    xOffset: number,
    yOffset: number
  ): [number, number] {
    // Convert the lat/lng to a point
    const point = map.latLngToContainerPoint([lat, lng]);
    // Apply the offset
    const newPoint = L.point(point.x - xOffset, point.y - yOffset);
    // Convert the point back to lat/lng
    const newLatLng = map.containerPointToLatLng(newPoint);
    return [newLatLng.lat, newLatLng.lng];
  }

  protected render(): TemplateResult {
    return html`
      <div class="map-wrapper" style=${this._computeMapStyle()}>
        <div id="overlay-container">
          <div class="reset-button" @click=${this.resetMap}>
            <ha-icon icon="mdi:compass"></ha-icon>
          </div>
          ${this._renderAddress()}
        </div>
        <div id="map"></div>
      </div>
      ${this._renderMapDialog()}
    `;
  }

  private _renderAddress(): TemplateResult {
    if (this.card.config.extra_configs?.show_address === false) return html``;
    if (!this._addressReady) return html` <div class="address loading"><span class="loader"></span></div> `;

    const address = this._address || {};
    return html`
      <div class="address">
        <div class="address-line">
          <ha-icon icon="mdi:map-marker"></ha-icon>
          <div>
            <span>${address.streetNumber} ${address.streetName}</span><br /><span
              style="text-transform: uppercase; opacity: 0.8; letter-spacing: 1px"
              >${!address.sublocality ? address.city : address.sublocality}</span
            >
          </div>
        </div>
      </div>
    `;
  }

  private _renderMapDialog() {
    if (!this.open) return html``;
    const styles = html`
      <style>
        ha-dialog {
          --mdc-dialog-min-width: 500px;
          --mdc-dialog-max-width: 600px;
          --dialog-backdrop-filter: blur(2px);
        }
        @media all and (max-width: 600px), all and (max-height: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: 100vw;
            --mdc-dialog-max-width: 100vw;
            --mdc-dialog-min-height: 100%;
            --mdc-dialog-max-height: 100%;
            --vertical-align-dialog: flex-end;
            --ha-dialog-border-radius: 0;
          }
        }
      </style>
    `;
    return html`
      <ha-dialog
        open
        .heading=${createCloseHeading(this.card._hass, 'Map')}
        @closed=${() => (this.open = false)}
        hideActions
        flexContent
      >
        ${styles}
        <div class="container">${this.mapCardPopup}</div>
      </ha-dialog>
    `;
  }

  private async _toggleMapDialog() {
    if (!this.mapPopup) return;
    if (this.mapCardPopup !== undefined) {
      this.open = !this.open;
      return;
    } else {
      createMapPopup(this.card._hass, this.card.config).then((popup) => {
        this.mapCardPopup = popup;
        setTimeout(() => {
          this.open = true;
        }, 50);
      });
    }
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
        .address {
          position: absolute;
          width: max-content;
          height: fit-content;
          bottom: 15%;
          left: 1rem;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          flex-direction: column;
          gap: 0.5rem;
          color: var(--primary-text-color);
          backdrop-filter: blur(2px);
          .address-line {
            display: flex;
            gap: 0.5rem;
            align-items: center;
            text-shadow: 0 0 black;
            span {
              font-size: 0.9rem;
            }
          }
        }
        .loader {
          width: 48px;
          height: 48px;
          display: inline-block;
          position: relative;
          place-self: center;
        }
        .loader::after,
        .loader::before {
          content: '';
          box-sizing: border-box;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid #fff;
          position: absolute;
          left: 0;
          top: 0;
          animation: animloader 2s linear infinite;
        }
        .loader::after {
          animation-delay: 1s;
        }

        @keyframes animloader {
          0% {
            transform: scale(0);
            opacity: 1;
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
