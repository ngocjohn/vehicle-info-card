import { LitElement, html, css } from 'lit';

import L from 'leaflet';
import 'leaflet-providers/leaflet-providers.js';

import mapstyle from '../css/leaflet.css';

export class VehicleMap extends LitElement {
  static get properties() {
    return {
      hass: {},
      deviceTracker: { Type: String },
      lat: { Type: Number },
      lon: { Type: Number },
      zoom: { Type: Number },
      picture: { Type: String },
      map: { Type: Object },
      marker: { Type: Object },
      address: { Type: Object },
      darkMode: { Type: Boolean },
      state: { Type: String },
      apiKey: { Type: String },
      popup: { Type: Boolean },
      enableAdress: { Type: Boolean },
    };
  }
  constructor() {
    super();
    this.lat = 0;
    this.lon = 0;
    this.zoom = 16;
    this.picture = '';
    this.state = '';
    this.address = {};
    this.darkMode = false;
    this.popup = false;
    this.enableAdress = false;
  }

  firstUpdated() {
    this.setEntityAttribute();
  }

  updated(changedProperties) {
    if (changedProperties.has('darkMode')) {
      this.updateCSSVariables();
    }
  }

  setEntityAttribute() {
    const deviceTracker = this.hass.states[this.deviceTracker];
    if (deviceTracker) {
      this.lat = deviceTracker.attributes.latitude;
      this.lon = deviceTracker.attributes.longitude;
      this.picture = deviceTracker.attributes.entity_picture;
      this.state = deviceTracker.state;
      this.getAddressData(this.lat, this.lon);
      this.darkMode = this.hass.themes.darkMode;
    }
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  updateCSSVariables() {
    if (this.darkMode) {
      this.style.setProperty('--map-marker-color', 'var(--accent-color)');
    } else {
      this.style.setProperty('--map-marker-color', 'var(--primary-color)');
    }
  }

  static get styles() {
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

  initMap() {
    const mapOptions = {
      dragging: true,
      zoomControl: false,
      scrollWheelZoom: true,
    };

    this.map = L.map(this.shadowRoot.getElementById('map'), mapOptions).setView([this.lat, this.lon], this.zoom);

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

  togglePopup() {
    const event = new CustomEvent('toggle-map-popup', {
      detail: {},
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  updateMap() {
    const offset = this.calculateLatLngOffset(this.map, this.lat, this.lon, this.map.getSize().x / 5, 3);
    this.map.setView(offset, this.zoom);
    this.marker.setLatLng([this.lat, this.lon]);
  }

  calculateLatLngOffset(map, lat, lng, xOffset, yOffset) {
    // Convert the lat/lng to a point
    const point = map.latLngToContainerPoint([lat, lng]);
    // Apply the offset
    const newPoint = L.point(point.x - xOffset, point.y - yOffset);
    // Convert the point back to lat/lng
    const newLatLng = map.containerPointToLatLng(newPoint);
    return [newLatLng.lat, newLatLng.lng];
  }

  render() {
    return html` <div class="map-wrapper">
      <div id="map" style=${this.darkMode ? 'filter: brightness(1.5);' : ''}></div>
      <div class="reset-button" @click=${this.updateMap}>
        <ha-icon icon="mdi:compass"></ha-icon>
      </div>
      ${this._renderAddress()}
    </div>`;
  }

  _renderAddress() {
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

  async getAddressFromOpenStreet(lat, lon) {
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
        throw new Error('Failed to fetch address');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
      return null;
    }
  }

  async getAddressFromGoggle(lat, lng) {
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

  async getAddressData(lat, lon) {
    let address;
    if (this.apiKey) {
      address = await this.getAddressFromGoggle(lat, lon);
    } else {
      address = await this.getAddressFromOpenStreet(lat, lon);
    }
    if (address) {
      this.address = address;
      this.enableAdress = true;
      this.requestUpdate();
    } else {
      this.enableAdress = false;
      console.log('Could not retrieve address');
    }
  }
}
customElements.define('vehicle-map', VehicleMap);
