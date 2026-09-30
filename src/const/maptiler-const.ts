import { html } from 'lit';

export const STYLE_SCHEMA = [
  {
    name: 'Navigation and city exploration',
    selector: {
      select: {
        options: ['STREETS', 'STREETS.DARK', 'STREETS.LIGHT', 'STREETS.PASTEL'],
      },
    },
  },
  {
    name: 'Data visualization',
    selector: {
      select: {
        options: ['DATAVIZ', 'DATAVIZ.DARK', 'DATAVIZ.LIGHT'],
      },
    },
  },
  {
    name: 'Minimalist and general purpose',
    selector: {
      select: {
        options: ['BASIC', 'BASIC.DARK', 'BASIC.LIGHT'],
      },
    },
  },
  {
    name: 'High contrast navigation',
    selector: {
      select: {
        options: ['BRIGHT', 'BRIGHT.DARK', 'BRIGHT.LIGHT', 'BRIGHT.PASTEL'],
      },
    },
  },
  {
    name: 'Topographic study',
    selector: {
      select: {
        options: ['TOPO', 'TOPO.SHINY', 'TOPO.PASTEL', 'TOPO.TOPOGRAPHIQUE'],
      },
    },
  },
  {
    name: 'Minimalist',
    selector: {
      select: {
        options: ['VOYAGER', 'VOYAGER.DARK', 'VOYAGER.LIGHT', 'VOYAGER.VINTAGE'],
      },
    },
  },
  {
    name: 'High contrast',
    selector: {
      select: {
        options: ['TONER', 'TONER.BACKGROUND', 'TONER.LITE', 'TONER.LINES'],
      },
    },
  },
  {
    name: 'Neutral greyscale style with hillshading',
    selector: {
      select: {
        options: ['BACKDROP', 'BACKDROP.DARK', 'BACKDROP.LIGHT'],
      },
    },
  },
  {
    name: 'Other',
    selector: {
      select: {
        options: ['OPENSTREETMAP', 'OUTDOOR', 'WINTER', 'SATELLITE', 'HYBRID'],
      },
    },
  },
];

export const DARK_AVAILABLE_STYLES = ['STREETS', 'BASIC', 'BRIGHT', 'DATAVIZ', 'VOYAGER', 'BACKDROP'];

export const DEFAULT_HOURS_TO_SHOW = 0;
export const DEFAULT_ZOOM = 13;

/**
 * Style ids passed to the MapTiler SDK.
 *
 * These must be real MapTiler Cloud style ids, not the `NAME.VARIANT` shorthand
 * used in the style picker. The SDK's `expandMapStyle()` builds the request URL
 * by direct interpolation, so an unrecognised name is not rejected locally - it
 * is turned into a 404 (`…/maps/STREETS.DARK/style.json`). `STREETS.DARK` and
 * `STREETS.LIGHT` were never style ids, which made the popup 404 and fall back
 * to the deprecated `streets-v2` default.
 *
 * `STREETS` and the `.DARK` / `.LIGHT` variants are the SDK's own shorthands;
 * see `mappersdk.MapStyle` in the style picker. These are the concrete v4 ids
 * they resolve to, used here so `maptilersdk.Map({ style })` gets something the
 * API accepts.
 */
export const MAPTILER_STYLE = {
  dark: 'streets-v4-dark',
  light: 'streets-v4',
  demo: 'https://demotiles.maplibre.org/style.json',
};

export const MAPTILER_THEME = {
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
  themeBtn: {
    light: `mdi:weather-sunny`,
    dark: `mdi:weather-night`,
  },
};

export enum MAP_STORAGE {
  THEME_STYLE = 'vic-mapstyle',
  DARK = 'vic-mapDark',
  PATH_HIDDEN = 'vic-pathHidden',
}

export enum MAP_SOURCE {
  POINTS = 'points',
  ROUTE = 'route',
  MARKER_CIRCLE = 'marker-circle',
}

export type MAP_TYPES = 'points' | 'route' | 'circle-radius' | 'circle-outline';

export const MAPTILER_DIALOG_STYLES = html`
  <style>
    ha-dialog {
      --mdc-dialog-min-width: 85vw;
      --mdc-dialog-max-width: 85vw;
      --dialog-backdrop-filter: blur(2px);
      --dialog-content-padding: 0;
    }
    @media all and (max-width: 600px), all and (max-height: 500px) {
      ha-dialog {
        --mdc-dialog-min-width: 100vw;
        --mdc-dialog-max-width: 100vw;
        --mdc-dialog-min-height: 100%;
        --mdc-dialog-max-height: 100%;
        --vertical-align-dialog: flex-end;
        --ha-dialog-border-radius: 0;
        --dialog-content-padding: 0;
      }
      .mdc-dialog .mdc-dialog__content {
        padding: 0;
      }
    }
  </style>
`;

export const DEFAULT_DIALOG_STYLES = html` <style>
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
</style>`;
