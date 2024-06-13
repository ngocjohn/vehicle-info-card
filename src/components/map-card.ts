import { LitElement, html, css, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { HomeAssistant } from 'custom-card-helpers';

import L from 'leaflet';
import 'leaflet-providers/leaflet-providers.js';
import mapstyle from '../css/leaflet.css';

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
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: String }) deviceTracker = '';
  @property({ type: Boolean }) darkMode = false;
  @property({ type: Boolean }) popup = false;

  @state() private map: L.Map | null = null;
  @state() private marker: L.Marker | null = null;
  @state() private lat = 0;
  @state() private lon = 0;
  @state() private zoom = 15;
  @state() private state = '';
  @state() private address: Partial<Address> = {};
  @state() private enableAdress = false;
  @state() private apiKey = '';

  firstUpdated(): void {
    this.setEntityAttribute();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    if (changedProperties.has('darkMode')) {
      this.updateCSSVariables();
    }
  }

  setEntityAttribute(): void {
    const deviceTracker = this.hass.states[this.deviceTracker];
    if (deviceTracker) {
      this.lat = deviceTracker.attributes.latitude;
      this.lon = deviceTracker.attributes.longitude;
      this.state = deviceTracker.state;
      this.getAddress(this.lat, this.lon);
    }
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  updateCSSVariables(): void {
    if (this.darkMode) {
      this.style.setProperty('--map-marker-color', 'var(--accent-color)');
    } else {
      this.style.setProperty('--map-marker-color', 'var(--primary-color)');
    }
  }

  async getAddress(lat: number, lon: number): Promise<void> {
    let address: Partial<Address> | null = null;
    if (this.apiKey !== '') {
      address = await this.getAddressFromGoggle(lat, lon);
    } else {
      address = await this.getAddressFromOpenStreet(lat, lon);
    }
    if (address) {
      this.address = address;
      this.enableAdress = true;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      mapstyle,
      css`
        *:focus {
          outline: none;
        }
        :host {
          --map-marker-color: var(--primary-color);
        }
        .map-wrapper {
          width: 100%;
          height: 100%;
        }
        #map {
          height: 100%;
          width: 100%;
          background: transparent !important;
          mask-image: linear-gradient(to right, transparent 0%, black 25%, black 90%, transparent 100%),
            linear-gradient(to bottom, transparent 20%, black 35%, black 90%, transparent 100%);
          mask-composite: intersect;
        }
        .marker {
          position: relative;
          width: 46px;
          height: 46px;
        }
        .marker.dark {
          filter: brightness(0.5);
        }
        .dot {
          position: absolute;
          width: 14px;
          height: 14px;
          background-color: var(--map-marker-color);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          border: 1px solid white;
          transform: translate(-50%, -50%);
          opacity: 0.6;
        }
        .shadow {
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle, var(--map-marker-color) 0%, transparent 100%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: none !important;
          opacity: 0.3;
        }
        .marker:hover .dot {
          opacity: 1;
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
          color: grey;
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
      `,
    ];
  }

  initMap(): void {
    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
    };

    this.map = L.map(this.shadowRoot?.getElementById('map') as HTMLElement, mapOptions).setView(
      [this.lat, this.lon],
      this.zoom,
    );

    const tileLayer = this.darkMode ? 'CartoDB.DarkMatter' : 'CartoDB.Positron';
    L.tileLayer.provider(tileLayer).addTo(this.map);

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
    this.marker = L.marker([this.lat, this.lon], { icon: customIcon }).addTo(this.map);
    // Add click event listener to marker
    if (this.popup) {
      this.marker.on('click', () => {
        this.togglePopup();
      });
    }

    this.marker.bindTooltip(this.state);
    this.updateMap();
  }

  togglePopup(): void {
    const event = new CustomEvent('toggle-map-popup', {
      detail: {},
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private updateMap(): void {
    if (!this.map || !this.marker) return;
    const offset: [number, number] = this.calculateLatLngOffset(
      this.map,
      this.lat,
      this.lon,
      this.map.getSize().x / 5,
      3,
    );
    this.map.setView(offset, this.zoom);
    this.marker.setLatLng([this.lat, this.lon]);
  }

  private calculateLatLngOffset(
    map: L.Map,
    lat: number,
    lng: number,
    xOffset: number,
    yOffset: number,
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
        <div id="map" style=${this.darkMode ? 'filter: brightness(1.5);' : ''}></div>
        <div class="reset-button" @click=${this.updateMap}>
          <ha-icon icon="mdi:compass"></ha-icon>
        </div>
        ${this._renderAddress()}
      </div>
    `;
  }

  private _renderAddress() {
    if (!this.enableAdress) return html``;
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

  private async getAddressFromOpenStreet(lat: number, lng: number): Promise<Partial<Address> | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`;
    console.log(url);
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
        throw new Error('Failed to fetch address');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      return null;
    }
  }

  private async getAddressFromGoggle(lat: number, lng: number): Promise<Partial<Address> | null> {
    const apiKey = this.apiKey; // Replace with your API key
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

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
