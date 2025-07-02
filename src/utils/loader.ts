import { loadModule } from './load_resource';

const HELPERS = (window as any).loadCardHelpers ? (window as any).loadCardHelpers() : undefined;
// Hack to load ha-components needed for editor
export const loadHaComponents = () => {
  if (!customElements.get('ha-form')) {
    (customElements.get('hui-button-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-entity-picker')) {
    (customElements.get('hui-entities-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-card-conditions-editor')) {
    (customElements.get('hui-conditional-card') as any)?.getConfigElement();
  }
  if (!customElements.get('ha-form-multi_select')) {
    // Load the component by invoking a related component's method
    (customElements.get('hui-entities-card') as any)?.getConfigElement();
  }
  if (!customElements.get('hui-entity-editor')) {
    // Load the component by invoking a related component's method
    (customElements.get('hui-glance-card') as any)?.getConfigElement();
  }
};

export const stickyPreview = () => {
  // Get the root and required elements
  const root = document.querySelector('body > home-assistant')?.shadowRoot;
  const dialog = root?.querySelector('hui-dialog-edit-card')?.shadowRoot;
  const content = dialog?.querySelector('ha-dialog')?.shadowRoot?.getElementById('content');
  const previewElement = dialog?.querySelector('div.element-preview') as HTMLElement;
  const editorElement = dialog?.querySelector('div.element-editor') as HTMLElement;

  // Exit early if any required element is missing
  if (!content || !editorElement || !previewElement) return;

  // Apply styles
  Object.assign(content.style, { padding: '8px' });
  Object.assign(editorElement.style, { margin: '0 4px' });
  Object.assign(previewElement.style, {
    position: 'sticky',
    top: '0',
    padding: '0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  });
};

export function isEditorMode(card: HTMLElement) {
  return card.offsetParent?.classList.contains('element-preview');
}

export const loadCardPicker = async () => {
  if (!customElements.get('hui-card-picker')) {
    console.warn('Card picker not loaded');
    // Load the component by invoking a related component's method

    let helpers;
    if ((window as any).loadCardHelpers) {
      helpers = await (window as any).loadCardHelpers();
    } else if (HELPERS) {
      helpers = HELPERS;
    }

    // Check if helpers were loaded and if createCardElement exists
    if (!helpers || !helpers.createCardElement) {
      console.error('Card helpers or createCardElement not available.');
      return;
    }
    // Create a card element to trigger the loading of hui-card-picker
    let cls = customElements.get('hui-vertical-stack-card');
    if (!cls) {
      helpers.createCardElement({ type: 'vertical-stack', cards: [] });
      await customElements.whenDefined('hui-vertical-stack-card');
      cls = customElements.get('hui-vertical-stack-card');
    }
    const configElement = await (cls as any).getConfigElement();
    return configElement;
  }
};

// Load a resource and get a promise when loading done.
// From: https://davidwalsh.name/javascript-loader

// export const loadExtraMapCard = async () => {
//   (window as any).customCards = (window as any).customCards || [];

//   if (!(window as any).customCards.find((card: any) => card.type === 'extra-map-card')) {
//     await loadModule(EXTRA_MAP_CARD_URL);
//     console.log('extra-map-card loaded');
//   }
// };

const EXTRA_MAP_CARD_BASE = 'https://cdn.jsdelivr.net/npm/extra-map-card@';
const EXTRA_MAP_NAME = 'extra-map-card';
const EXTRA_MAP_PATH = '/dist/extra-map-card-bundle.min.js';

const EXTRA_MAP_LATEST_URL = (version: string) => `${EXTRA_MAP_CARD_BASE}${version}${EXTRA_MAP_PATH}`;
export const loadExtraMapCard = async () => {
  const latestVersion = await getLatestNpmVersion();
  if (!latestVersion) return;

  const cardList = (window as any).customCards || [];
  const existingCard = cardList.find((card: any) => card.type === `${EXTRA_MAP_NAME}`);

  // Check if already loaded with latest version
  if (existingCard?.version === latestVersion) {
    // console.log(`extra-map-card is already at the latest version: ${latestVersion}`);
    return;
  }

  const latestUrl = EXTRA_MAP_LATEST_URL(latestVersion);

  // Remove old <script> tags
  document.querySelectorAll(`script[src*="${EXTRA_MAP_NAME}"]`).forEach((el) => el.remove());

  // Remove outdated entry from customCards
  (window as any).customCards = cardList.filter((card: any) => card.type !== `${EXTRA_MAP_NAME}`);

  try {
    await loadModule(latestUrl);
    // console.log(`extra-map-card reloaded to version ${latestVersion}`);
  } catch (err) {
    console.error('Failed to load extra-map-card:', err);
  }
};

async function getLatestNpmVersion(): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${EXTRA_MAP_NAME}`);
    if (!res.ok) throw new Error('Package not found');
    const data = await res.json();
    return data['dist-tags']?.latest || null;
  } catch (error) {
    console.error('Failed to fetch version:', error);
    return null;
  }
}
