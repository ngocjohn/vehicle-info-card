import * as maptilersdk from '@maptiler/sdk';
import mapstyle from '@maptiler/sdk/dist/maptiler-sdk.css';
import { LitElement, html, css, TemplateResult, unsafeCSS, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { MapData } from '../../types';
import { VehicleCard } from '../../vehicle-info-card';

@customElement('vic-maptiler-popup')
export class VicMaptilerPopup extends LitElement {
  @property({ attribute: false }) private mapData!: MapData;
  @property({ attribute: false }) private card!: VehicleCard;
  @state() private map?: maptilersdk.Map | null;

  firstUpdated() {
    this.initMap();
  }

  initMap() {
    const mapEl = this.shadowRoot?.getElementById('map') as HTMLElement;
    maptilersdk.config.apiKey = 'wqgT0yoI9VXek2vtI8PE';
    const mapOptions: maptilersdk.MapOptions = {
      container: mapEl,
      zoom: 15,
      style: maptilersdk.MapStyle.STREETS.DARK,
      hash: false,
      pitch: 0,
      center: [this.mapData.lon, this.mapData.lat],
      attributionControl: false,
      geolocateControl: true,
      fullscreenControl: true,
    };

    this.map = new maptilersdk.Map(mapOptions);
    this.map.on('load', () => {
      this.addMarker();
    });
  }

  addMarker() {
    const marker = new maptilersdk.Marker().setLngLat([this.mapData.lon, this.mapData.lat]).addTo(this.map!);
  }

  addController() {
    const geolocate = new maptilersdk.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: false,
    });
    this.map!.addControl(geolocate);
  }

  render(): TemplateResult {
    return html`
      <div class="tiler-map">
        <div id="map"></div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      unsafeCSS(mapstyle),
      css`
        .tiler-map {
          position: relative;
          width: 100%;
          min-height: 75vh;
          height: 100%;
        }
        #map {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
          border-radius: 0.5rem;
        }
        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right {
          display: none;
        }
      `,
    ];
  }
}
