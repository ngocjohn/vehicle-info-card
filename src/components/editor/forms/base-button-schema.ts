import memoizeOne from 'memoize-one';
const DEFAULT_ACTIONS = ['more-info', 'toggle', 'navigate', 'perform-action', 'assist'];
const BUTTON_TYPES = ['default', 'action'] as const;
export const USE_CUSTOM_HIDE_SCHEMA = memoizeOne(
  (isDefaultCard: boolean) =>
    [
      {
        name: '',
        type: 'grid',
        schema: [
          {
            name: 'hide',
            label: 'hideButton',
            selector: { boolean: {} },
          },
          {
            ...(isDefaultCard && {
              name: 'enabled',
              label: 'useCustomButton',
              selector: { boolean: {} },
            }),
          },
        ],
      },
    ] as const
);

export const BTN_TYPE_PRIMARY_SCHEMA = [
  {
    name: '',
    type: 'grid',
    schema: [
      {
        name: 'button_type',
        label: 'Button Type',
        required: true,
        default: 'default',
        selector: {
          select: {
            mode: 'dropdown',
            options: BUTTON_TYPES.map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1),
            })),
          },
        },
      },
      {
        name: 'primary',
        label: 'Button Title',
        selector: { text: {} },
      },
      {
        name: 'icon',
        label: 'Icon',
        selector: { icon: {} },
        context: { icon_entity: 'entity' },
      },
    ],
  },
] as const;

export const BTN_SECONDARY_SCHEMA = memoizeOne(
  (entityId: string) =>
    [
      {
        name: '',
        type: 'expandable',
        title: 'Secondary content',
        schema: [
          {
            name: 'entity',
            selector: { entity: {} },
          },
          {
            name: 'attribute',
            label: 'Attribute',
            selector: {
              attribute: {
                entity_id: entityId,
              },
            },
          },
          {
            name: 'secondary',
            label: 'secondaryInfo',
            helper: 'secondaryInfoHelper',
            selector: { template: {} },
          },
        ],
      },
    ] as const
);

export const BTN_EXTRA_TEMPLATES_SCHEMA = [
  {
    name: '',
    type: 'expandable',
    title: 'Extra templates',
    schema: [
      {
        name: 'notify',
        label: 'notifyInfo',
        helper: 'notifyInfoHelper',
        selector: { template: {} },
      },
      {
        name: 'icon_template',
        label: 'iconInfo',
        helper: 'iconInfoHelper',
        selector: { template: {} },
      },
      {
        name: 'color_template',
        label: 'colorInfo',
        helper: 'colorInfoHelper',
        selector: { template: {} },
      },
      {
        name: 'picture_template',
        label: 'pictureInfo',
        helper: 'pictureInfoHelper',
        selector: { template: {} },
      },
    ],
  },
] as const;

export const BTN_ACTION_SCHEMA = [
  {
    name: 'button_action',
    type: 'expandable',
    title: 'Button Interaction',
    schema: [
      {
        name: 'entity',
        selector: { entity: {} },
      },
      {
        name: '',
        type: 'optional_actions',
        flatten: true,
        schema: [
          {
            name: 'tap_action',
            label: 'Tap Action',
            selector: {
              ui_action: {
                actions: DEFAULT_ACTIONS,
                default_action: 'none',
              },
            },
          },
          {
            name: 'double_tap_action',
            label: 'Double Tap Action',
            selector: {
              ui_action: {
                actions: DEFAULT_ACTIONS,
                default_action: 'none',
              },
            },
          },
          {
            name: 'hold_action',
            label: 'Hold Action',
            selector: {
              ui_action: {
                actions: DEFAULT_ACTIONS,
                default_action: 'none',
              },
            },
          },
        ],
      },
    ] as const,
  },
] as const;

export const GENERIC_LABEL = [
  'tap_action',
  'double_tap_action',
  'hold_action',
  'button_type',
  'primary',
  'icon',
  'attribute',
];
