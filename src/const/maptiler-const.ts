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
export const DEFAULT_ZOOM = 14;

export const MAPTILER_STYLE = {
  dark: 'STREETS.DARK',
  light: 'STREETS',
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
}

export type MAP_TYPES = 'points' | 'route';

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
