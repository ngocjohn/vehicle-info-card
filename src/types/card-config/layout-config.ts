import { ServicesConfig } from './services-config';

export const SECTION_KEYS = ['header_info', 'images', 'mini_map', 'buttons'];
export type SectionOrder = (typeof SECTION_KEYS)[number];

export interface ExtraConfigs {
  section_order?: SectionOrder[];
  hide_card_name?: boolean;
  hide_background?: boolean;
  images_swipe?: ImagesSwipeConfig;
  theme_config?: ThemeConfig;
  button_grid?: ButtonGridLayoutConfig;
  tire_card_custom?: TireCardCustomConfig;
  services_config?: ServicesConfig;
  /**
   * @deprecated use `mini_map.map_height` instead
   */
  mini_map_height?: number;
  /**
   * @deprecated use `map_popup.maptiler_api_key` instead
   */
  maptiler_api_key?: string;
  /**
   * @deprecated use `mini_map.show_address` instead
   */
  show_address?: boolean;
}

type BUTTON_LAYOUT = 'horizontal' | 'vertical';

export type ButtonGridLayoutConfig = {
  use_swiper?: boolean;
  rows_size?: number;
  columns_size?: number;
  button_order?: string[];
  /**
   * @deprecated use 'layout' in button config instead
   */
  button_layout?: BUTTON_LAYOUT;
  /**
   * @deprecated use 'transparent' in button config instead
   */
  transparent?: boolean;
};

type SWIPE_EFFECT = 'slide' | 'fade' | 'coverflow';
export interface ImagesSwipeConfig {
  autoplay?: boolean;
  loop?: boolean;
  delay?: number;
  speed?: number;
  effect?: SWIPE_EFFECT;
  hide_pagination?: boolean;
  height?: number;
  width?: number;
  /**
   * @deprecated use `height`instead
   */
  max_height?: number;
  /**
   * @deprecated use`width` instead
   */
  max_width?: number;
}

type THEME_MODE = 'auto' | 'light' | 'dark';
type ThemeConfig = Partial<{
  mode: THEME_MODE;
  theme: string;
}>;

export interface TireCardCustomConfig {
  background?: string;
  horizontal?: boolean;
  image_size?: number;
  value_size?: number;
  top?: number;
  left?: number;
}

export const reorderSections = (hide: string[], currentOrder: string[]): SectionOrder[] => {
  if (!hide || hide.length === 0) {
    return currentOrder.length > 0
      ? (currentOrder.filter((s) => SECTION_KEYS.includes(s)) as SectionOrder[])
      : (SECTION_KEYS as SectionOrder[]);
  }

  const hiddenToRemove = new Set<string>(hide);
  const visibleToAdd = SECTION_KEYS.filter((s) => !hiddenToRemove.has(s));

  let sectionOrder: SectionOrder[] = currentOrder.filter((s) => !hiddenToRemove.has(s)) as SectionOrder[];

  visibleToAdd.forEach((section) => {
    if (!sectionOrder.includes(section)) {
      sectionOrder.push(section);
    }
  });

  sectionOrder = [...new Set(sectionOrder)].filter((s) => SECTION_KEYS.includes(s)) as SectionOrder[];

  return sectionOrder;
};
