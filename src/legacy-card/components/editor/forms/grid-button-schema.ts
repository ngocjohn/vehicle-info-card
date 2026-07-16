import memoizeOne from 'memoize-one';

export const BUTTON_GRID_SCHEMA = memoizeOne(
  () =>
    [
      {
        name: 'button_grid',
        type: 'expandable',
        title: 'Button Grid Configuration',
        flatten: false,
        schema: [
          {
            name: '',
            type: 'grid',
            flatten: true,
            schema: [
              {
                name: 'use_swiper',
                label: 'Use Swiper',
                type: 'boolean',
              },
              {
                name: 'transparent',
                label: 'Transparent Background',
                type: 'boolean',
                helper: 'Use this option to make the button background transparent.',
                default: false,
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
          {
            name: 'button_layout',
            label: 'Button layout',
            required: true,
            default: 'horizontal',
            selector: {
              select: {
                mode: 'box',
                options: ['horizontal', 'vertical'].map((value) => ({
                  label: value.charAt(0).toUpperCase() + value.slice(1),
                  value,
                  image: {
                    src: `/static/images/form/tile_content_layout_${value}.svg`,
                    src_dark: `/static/images/form/tile_content_layout_${value}_dark.svg`,
                    flip_rtl: true,
                  },
                })),
              },
            },
          },
        ],
      },
    ] as const
);
