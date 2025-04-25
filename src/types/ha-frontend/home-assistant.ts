import type {
  Auth,
  Connection,
  HassConfig,
  HassEntities,
  HassEntity,
  HassServices,
  HassServiceTarget,
  MessageBase,
} from 'home-assistant-js-websocket';

import type { FrontendLocaleData, TranslationCategory } from './data/frontend-local-data';
import type { LocalizeFunc } from './data/localize';
import type { Themes, ThemeSettings } from './data/ws-themes';

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  device_id?: string;
  area_id?: string;
  hidden?: boolean;
  entity_category?: 'config' | 'diagnostic';
  translation_key?: string;
  platform?: string;
  display_precision?: number;
}

export interface DeviceRegistryEntry {
  id: string;
  config_entries: string[];
  connections: Array<[string, string]>;
  identifiers: Array<[string, string]>;
  manufacturer: string | null;
  model: string | null;
  name: string | null;
  sw_version: string | null;
  hw_version: string | null;
  via_device_id: string | null;
  area_id: string | null;
  name_by_user: string | null;
  entry_type: 'service' | null;
  disabled_by: 'user' | 'integration' | 'config_entry' | null;
  configuration_url: string | null;
}

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  picture: string | null;
}

export interface Resources {
  [language: string]: Record<string, string>;
}

export interface Context {
  id: string;
  parent_id?: string;
  user_id?: string | null;
}

export interface ServiceCallResponse {
  context: Context;
  response?: any;
}

export interface ServiceCallRequest {
  domain: string;
  service: string;
  serviceData?: Record<string, any>;
  target?: HassServiceTarget;
}

export interface Translation {
  nativeName: string;
  isRTL: boolean;
  hash: string;
}

export interface TranslationMetadata {
  fragments: string[];
  translations: {
    [lang: string]: Translation;
  };
}

export interface Credential {
  auth_provider_type: string;
  auth_provider_id: string;
}

export interface MFAModule {
  id: string;
  name: string;
  enabled: boolean;
}

export interface CurrentUser {
  id: string;
  is_owner: boolean;
  is_admin: boolean;
  name: string;
  credentials: Credential[];
  mfa_modules: MFAModule[];
}

export interface HomeAssistant {
  auth: Auth & { external?: any };
  connection: Connection;
  connected: boolean;
  states: HassEntities;
  entities: { [id: string]: EntityRegistryDisplayEntry };
  devices: { [id: string]: DeviceRegistryEntry };
  areas: { [id: string]: AreaRegistryEntry };
  services: HassServices;
  config: HassConfig;
  themes: Themes;
  selectedTheme: ThemeSettings | null;
  panels: any; // Panels;
  panelUrl: string;
  // i18n
  // current effective language in that order:
  //   - backend saved user selected language
  //   - language in local app storage
  //   - browser language
  //   - english (en)
  language: string;
  // local stored language, keep that name for backward compatibility
  selectedLanguage: string | null;
  locale: FrontendLocaleData;
  resources: Resources;
  localize: LocalizeFunc;
  translationMetadata: TranslationMetadata;
  suspendWhenHidden: boolean;
  enableShortcuts: boolean;
  vibrate: boolean;
  debugConnection: boolean;
  dockedSidebar: 'docked' | 'always_hidden' | 'auto';
  defaultPanel: string;
  moreInfoEntityId: string | null;
  user?: CurrentUser;
  userData?: any; // CoreFrontendUserData | null;
  hassUrl(path?): string;
  callService(
    domain: ServiceCallRequest['domain'],
    service: ServiceCallRequest['service'],
    serviceData?: ServiceCallRequest['serviceData'],
    target?: ServiceCallRequest['target'],
    notifyOnError?: boolean,
    returnResponse?: boolean
  ): Promise<ServiceCallResponse>;
  callApi<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T>;
  fetchWithAuth(path: string, init?: Record<string, any>): Promise<Response>;
  sendWS(msg: MessageBase): void;
  callWS<T>(msg: MessageBase): Promise<T>;
  // loadBackendTranslation(
  //   category: Parameters<typeof getHassTranslations>[2],
  //   integrations?: Parameters<typeof getHassTranslations>[3],
  //   configFlow?: Parameters<typeof getHassTranslations>[4]
  // ): Promise<LocalizeFunc>;
  // loadFragmentTranslation(fragment: string): Promise<LocalizeFunc | undefined>;
  loadBackendTranslation(
    category: TranslationCategory,
    integration?: string | string[],
    configFlow?: boolean
  ): Promise<LocalizeFunc>;
  formatEntityState(stateObj: HassEntity, state?: string): string;
  formatEntityAttributeValue(stateObj: HassEntity, attribute: string, value?: any): string;
  formatEntityAttributeName(stateObj: HassEntity, attribute: string): string;
}

/** Return if a component is loaded. */
export const isComponentLoaded = (hass: HomeAssistant, component: string): boolean =>
  hass && hass.config.components.includes(component);
