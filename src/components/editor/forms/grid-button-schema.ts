import memoizeOne from 'memoize-one';

export const BUTTON_GRID_SCHEMA = memoizeOne(
  () =>
    [
      {
        name: '',
        type: 'expandable',
        title: 'Button Grid Configuration',
        schema: [
          {
            name: 'button_grid',
            type: 'grid',
            schema: [
              {
                name: 'use_swiper',
                label: 'Use Swiper for Button Grid',
                type: 'boolean',
              },
              {
                name: 'button_layout',
                label: 'Button Layout',
                default: 'horizontal',
                selector: {
                  select: {
                    mode: 'dropdown',
                    options: [
                      { value: 'horizontal', label: 'Horizontal' },
                      { value: 'vertical', label: 'Vertical' },
                    ],
                  },
                },
              },
              {
                name: 'rows_size',
                label: 'Rows Size',
                default: 2,
                selector: { number: { max: 10, min: 1, mode: 'box', step: 1 } },
              },
              {
                name: 'columns_size',
                label: 'Columns Size',
                default: 2,
                selector: { number: { max: 10, min: 1, mode: 'box', step: 1 } },
              },
            ] as const,
          },
        ],
      },
    ] as const
);
