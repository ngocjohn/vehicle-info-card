import { LitElement, html, css, TemplateResult, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, state } from 'lit/decorators.js';

// Leaflet imports
import L from 'leaflet';
import 'leaflet-providers/leaflet-providers.js';

import mapstyle from '../../css/leaflet.css';

interface Address {
  streetNumber: string;
  streetName: string;
  sublocality: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

@customElement('vehicle-map')
export class VehicleMap extends LitElement {
  @state() private deviceTracker: { lat: number; lon: number } = { lat: 0, lon: 0 };
  @state() private darkMode!: boolean;
  @state() private apiKey?: string;
  @state() private mapPopup!: boolean;
  @state() private map: L.Map | null = null;
  @state() private marker: L.Marker | null = null;
  @state() private zoom = 16;
  @state() private state = '';
  @state() private address: Partial<Address> = {};
  @state() private loadingAdress: boolean = false;

  static get styles(): CSSResultGroup {
    return [
      mapstyle,
      css`
        *:focus {
          outline: none;
        }
        :host {
          --vic-map-marker-color: var(--primary-color);
          --vic-map-tiles-light-filter: none;
          --vic-map-tiles-dark-filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3)
            brightness(0.7);
          --vic-map-tiles-filter: var(--vic-map-tiles-light-filter);
          --vic-marker-dark-filter: brightness(1) contrast(1.2) saturate(6) brightness(1.3);
          --vic-marker-light-filter: none;
          --vic-maker-filter: var(--vic-marker-light-filter);
          --vic-map-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%),
            linear-gradient(to bottom, transparent 10%, black 20%, black 90%, transparent 100%);
        }
        .map-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .map-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--card-background-color);
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
          top: 15%;
          right: 1rem;
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

  firstUpdated(): void {
    this.updateCSSVariables();
    this.setEntityAttribute();
  }

  updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('darkMode')) {
      this.updateCSSVariables();
      this.updateMap();
    }
  }

  setEntityAttribute(): void {
    const { lat, lon } = this.deviceTracker;
    if (lat && lon) {
      this.getAddress(lat, lon);
    }

    setTimeout(() => {
      this.initMap();
    }, 200);
  }

  private updateCSSVariables(): void {
    if (this.darkMode) {
      this.style.setProperty('--vic-map-marker-color', 'var(--accent-color)');
      this.style.setProperty('--vic-marker-filter', 'var(--vic-marker-dark-filter)');
      this.style.setProperty('--vic-map-tiles-filter', 'var(--vic-map-tiles-dark-filter)');
    } else {
      this.style.setProperty('--vic-map-marker-color', 'var(--primary-color)');
      this.style.setProperty('--vic-marker-filter', 'var(--vic-marker-light-filter)');
      this.style.setProperty('--vic-map-tiles-filter', 'var(--vic-map-tiles-light-filter)');
    }
  }

  async getAddress(lat: number, lon: number): Promise<void> {
    this.loadingAdress = true;
    let address: Partial<Address> | null = null;
    if (this.apiKey) {
      address = await this.getAddressFromGoggle(lat, lon);
    } else {
      address = await this.getAddressFromOpenStreet(lat, lon);
    }
    if (address) {
      this.address = address;
      this.loadingAdress = false;
      this.requestUpdate();
    } else {
      this.loadingAdress = true;
    }
  }

  initMap(): void {
    const { lat, lon } = this.deviceTracker;
    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
    };

    this.map = L.map(this.shadowRoot?.getElementById('map') as HTMLElement, mapOptions).setView([lat, lon], this.zoom);

    const mapboxToken = `pk.eyJ1IjoiZW1rYXkyazkiLCJhIjoiY2xrcHo5NzJwMXJ3MDNlbzM1bWJhcGx6eiJ9.kyNZp2l02lfkNlD2svnDsg`;
    const tileUrl = `https://api.mapbox.com/styles/v1/emkay2k9/clyd2zi0o00mu01pgfm6f6cie/tiles/{z}/{x}/{y}@2x?access_token=${mapboxToken}`;

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      tileSize: 512,
      zoomOffset: -1,
      className: 'map-tiles',
    }).addTo(this.map);

    // Define custom icon for marker
    const customIcon = L.divIcon({
      html: `<div class="marker">
              <div class="dot"></div>
              <div class="shadow"></div>
            </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'custom-marker',
    });

    // Add marker to map
    this.marker = L.marker([lat, lon], { icon: customIcon }).addTo(this.map);
    // Add click event listener to marker
    if (this.mapPopup) {
      this.marker.on('click', () => {
        this.togglePopup();
      });
    }

    this.marker.bindTooltip(this.state);
    this.updateMap();
    this.updateCSSVariables();
  }

  private togglePopup(): void {
    const event = new CustomEvent('toggle-map-popup', {
      detail: {},
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private updateMap(): void {
    if (!this.map || !this.marker) return;
    const { lat, lon } = this.deviceTracker;
    const offset: [number, number] = this.calculateLatLngOffset(this.map, lat, lon, this.map.getSize().x / 5, 3);
    this.map.setView(offset, this.zoom);
    this.marker.setLatLng([lat, lon]);
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
    return html`
      <div class="map-wrapper">
        <div id="map"></div>
        <div class="map-overlay"></div>
        <div class="reset-button" @click=${this.updateMap}>
          <ha-icon icon="mdi:compass"></ha-icon>
        </div>
        ${this._renderAddress()}
      </div>
    `;
  }

  private _renderAddress() {
    if (this.loadingAdress) {
      return html`<div class="address" style="left: 10%;"><span class="loader"></span></div>`;
    }
    return html`
      <div class="address">
        <div class="address-line">
          <ha-icon icon="mdi:map-marker"></ha-icon>
          <div>
            <span>${this.address.streetNumber} ${this.address.streetName}</span><br /><span
              style="text-transform: uppercase; opacity: 0.8; letter-spacing: 1px"
              >${!this.address.sublocality ? this.address.city : this.address.sublocality}</span
            >
          </div>
        </div>
      </div>
    `;
  }

  private async getAddressFromOpenStreet(lat: number, lon: number): Promise<Partial<Address> | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        // Extract address components from the response
        const address = {
          streetNumber: data.address.house_number || '', // Retrieve street number
          streetName: data.address.road || '',
          sublocality: data.address.suburb || data.address.village || '',
          city: data.address.city || data.address.town || '',
          state: data.address.state || data.address.county || '',
          country: data.address.country || '',
          postcode: data.address.postcode || '',
        };

        return address;
      } else {
        throw new Error('Failed to fetch address OpenStreetMap');
      }
    } catch (error) {
      // console.error('Error fetching address:', error);
      return null;
    }
  }

  private async getAddressFromGoggle(lat: number, lon: number): Promise<Partial<Address> | null> {
    const apiKey = this.apiKey; // Replace with your API key
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const addressComponents = data.results[0].address_components;
        let streetNumber = '';
        let streetName = '';
        let sublocality = '';
        let city = '';

        addressComponents.forEach((component) => {
          if (component.types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (component.types.includes('route')) {
            streetName = component.long_name;
          }
          if (component.types.includes('sublocality')) {
            sublocality = component.short_name;
          }

          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          // Sometimes city might be under 'administrative_area_level_2' or 'administrative_area_level_1'
          if (!city && component.types.includes('administrative_area_level_2')) {
            city = component.short_name;
          }
          if (!city && component.types.includes('administrative_area_level_1')) {
            city = component.short_name;
          }
        });

        return {
          streetNumber,
          streetName,
          sublocality,
          city,
        };
      } else {
        throw new Error('No results found');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      return null;
    }
  }
}
