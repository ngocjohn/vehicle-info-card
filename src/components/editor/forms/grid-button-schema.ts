export const BUTTON_GRID_SCHEMA = [
  {
    name: '',
    type: 'expandable',
    title: 'Button Grid Configuration',
    schema: [
      {
        name: '',
        type: 'grid',
        schema: [
          {
            name: 'use_swiper',
            label: 'Use Swiper for Button Grid',
            default: true,
            selector: { boolean: {} },
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
    ] as const,
  },
];
