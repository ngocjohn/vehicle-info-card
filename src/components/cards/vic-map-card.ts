// Leaflet imports
import L from 'leaflet';
import mapstyle from 'leaflet/dist/leaflet.css';
import { LitElement, html, css, TemplateResult, PropertyValues, CSSResultGroup, unsafeCSS } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import 'leaflet-providers/leaflet-providers.js';

import { MapData } from '../../types';
import { isEmpty } from '../../utils';
import { createCloseHeading } from '../../utils/create';
import { VehicleCard } from '../../vehicle-info-card';

@customElement('vehicle-map')
export class VehicleMap extends LitElement {
  @property({ attribute: false }) private mapData!: MapData;
  @property({ attribute: false }) private card!: VehicleCard;
  @property({ type: Boolean }) private isDark!: boolean;

  @state() private map: L.Map | null = null;
  @state() private marker: L.Marker | null = null;
  @state() private zoom = 17;

  @property({ type: Boolean }) open!: boolean;

  private get mapPopup(): boolean {
    return this.card.config.enable_map_popup;
  }

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this.initMap();
  }

  private _computeMapStyle() {
    const markerColor = this.isDark ? 'var(--accent-color)' : 'var(--primary-color)';
    const markerFilter = this.isDark ? 'contrast(1.2) saturate(6) brightness(1.3)' : 'none';
    const tileFilter = this.isDark
      ? 'brightness(0.6) invert(1) contrast(6) saturate(0.3) brightness(0.7) opacity(.25)'
      : 'grayscale(1) contrast(1.1) opacity(0.7)';
    return styleMap({
      '--vic-map-marker-color': markerColor,
      '--vic-marker-filter': markerFilter,
      '--vic-map-tiles-filter': tileFilter,
    });
  }

  initMap(): void {
    const { lat, lon } = this.mapData;
    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
    };

    this.map = L.map(this.shadowRoot?.getElementById('map') as HTMLElement, mapOptions).setView([lat, lon], this.zoom);
    const offset: [number, number] = this.calculateLatLngOffset(this.map, lat, lon, this.map.getSize().x / 5, 3);
    this.map.setView(offset, this.zoom);

    L.tileLayer
      .provider('CartoDB.Positron', {
        maxNativeZoom: 18,
        maxZoom: 18,
        minZoom: 14,
        tileSize: 256,
        className: 'map-tiles',
      })
      .addTo(this.map);

    // Define custom icon for marker
    const customIcon = L.divIcon({
      html: `<div class="marker">
              <div class="dot"></div>
              <div class="shadow"></div>
            </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'marker',
    });

    // Add marker to map
    this.marker = L.marker([lat, lon], { icon: customIcon }).addTo(this.map);
    // Add click event listener to marker
    if (this.mapPopup) {
      this.marker.on('click', () => {
        this.open = true;
      });
    }
  }

  private resetMap(): void {
    if (!this.map || !this.marker) return;
    const latLon = this.marker.getLatLng();
    this.map.flyTo(latLon, this.zoom);
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

  render(): TemplateResult {
    if (!this.mapData) return html`<div class="map-wrapper loading"><span class="loader"></span></div>`;
    return html`
      <div class="map-wrapper" style=${this._computeMapStyle()}>
        <div class="map-overlay"></div>
        <div id="map"></div>
        <div class="reset-button" @click=${this.resetMap}>
          <ha-icon icon="mdi:compass"></ha-icon>
        </div>
        ${this._renderAddress()}
      </div>
      ${this._renderMapDialog()}
    `;
  }

  private _renderAddress(): TemplateResult {
    if (!this.mapData.address || isEmpty(this.mapData.address)) {
      return html`<div class="address" style="left: 10%;"><span class="loader"></span></div>`;
    }
    const address = this.mapData?.address || {};
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
          --mdc-dialog-min-width: 560px;
          --mdc-dialog-max-width: 600px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
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
        @closed=${() => this._closeDialog()}
        hideActions
        flexContent
      >
        ${styles}
        <div class="container">${this.mapData.popUpCard}</div>
      </ha-dialog>
    `;
  }

  private _closeDialog() {
    this.open = false;
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(mapstyle),
      css`
        *:focus {
          outline: none;
        }
        :host {
          --vic-map-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%),
            linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%);
        }
        .map-wrapper {
          position: relative;
          width: 100%;
          height: 150px;
        }
        .map-wrapper.loading {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .map-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--ha-card-background, var(--card-background-color));
          opacity: 0.6; /* Adjust the opacity as needed */
          pointer-events: none; /* Ensure the overlay does not interfere with map interactions */
        }
        #map {
          height: 100%;
          width: 100%;
          background: transparent !important;
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
          width: 46px;
          height: 46px;
          filter: var(--vic-marker-filter);
        }

        .dot {
          position: absolute;
          width: 14px;
          height: 14px;
          background-color: var(--vic-map-marker-color);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          border: 1px solid white;
          transform: translate(-50%, -50%);
          opacity: 1;
        }
        .shadow {
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle, var(--vic-map-marker-color) 0%, transparent 100%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: none !important;
          opacity: 0.6;
        }
        .marker:hover .dot {
          filter: brightness(1.2);
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
          top: 50%;
          left: 1rem;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          flex-direction: column;
          gap: 0.5rem;
          color: var(--primary-text-color);
          backdrop-filter: blur(1px);
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
