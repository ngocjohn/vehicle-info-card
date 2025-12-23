import { ActionsSharedConfig } from 'types/actions-config';

import { MediaSelectorValue } from '../ha-frontend/data/media_source';

/**
 * Configuration interface for the Vehicle Card.
 */

export interface ImageConfig {
  /**
   * @deprecated use 'image || image_entity' instead
   */
  url?: string;
  title?: string;
}

export interface ImageItem {
  image?: string | MediaSelectorValue;
  image_entity?: string; // Entity ID to fetch the image from
  action?: ActionsSharedConfig; // Optional action configuration
}
