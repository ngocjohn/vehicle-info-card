import memoizeOne from 'memoize-one';

import { DEFAULT_HOURS_TO_SHOW, DEFAULT_ZOOM } from '../../../const/maptiler-const';

const themeModes = ['auto', 'light', 'dark'] as const;
const labelModes = ['name', 'state', 'icon', 'attribute'] as const;

const sharedDefaultMapConfig = [
  { name: 'aspect_ratio', label: 'Aspect Ratio', selector: { text: {} } },
  {
    name: 'default_zoom',
    label: 'Default Zoom',
    default: DEFAULT_ZOOM,
    selector: { number: { mode: 'box', min: 0 } },
  },
  {
    name: 'theme_mode',
    label: 'Theme Mode',
    default: 'auto',
    selector: {
      select: {
        mode: 'dropdown',
        options: themeModes.map((themeMode) => ({
          value: themeMode,
          label: themeMode.charAt(0).toUpperCase() + themeMode.slice(1),
        })),
      },
    },
  },
  {
    name: 'hours_to_show',
    label: 'Hours to Show',
    default: DEFAULT_HOURS_TO_SHOW,
    selector: { number: { mode: 'box', min: 0 } },
  },
  {
    name: 'history_period',
    label: 'History Period',
    default: '',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'today', label: 'Today' },
          { value: 'yesterday', label: 'Yesterday' },
        ],
      },
    },
  },
  {
    name: 'auto_fit',
    label: 'Auto Fit',
    default: false,
    selector: { boolean: {} },
  },
  {
    name: 'fit_zones',
    label: 'Fit Zones',
    default: false,
    selector: { boolean: {} },
  },
];

export const maptilerPopupSchema = memoizeOne(
  (deviceTracker: string, disabled: boolean) =>
    [
      {
        name: '',
        type: 'grid',
        schema: [
          ...sharedDefaultMapConfig,
          {
            name: 'path_color',
            label: 'Path Color',
            selector: {
              ui_color: {
                include_none: false,
                include_states: false,
                default_color: '',
              },
            },
          },
          {
            name: 'label_mode',
            label: 'Label Mode',
            selector: {
              select: {
                mode: 'dropdown',
                options: labelModes.map((labelMode) => ({
                  value: labelMode,
                  label: labelMode.charAt(0).toUpperCase() + labelMode.slice(1),
                })),
              },
            },
          },
          {
            name: 'attribute',
            label: 'Attribute',
            disabled: disabled,
            selector: {
              attribute: {
                entity_id: deviceTracker,
              },
            },
          },
        ],
      },
    ] as const
);
