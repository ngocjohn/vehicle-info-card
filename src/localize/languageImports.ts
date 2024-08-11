import * as cs from '../languages/cs.json';
import * as de from '../languages/de.json';
import * as en from '../languages/en.json';
import * as en from '../languages/fr.json';
import * as lt from '../languages/lt.json';
import * as pl from '../languages/pl.json';
import * as sk from '../languages/sk.json';
import * as vi from '../languages/vi.json';

const languages: any = {
  cs: cs,
  de: de,
  en: en,
  fr: fr,
  lt: lt,
  pl: pl,
  sk: sk,
  vi: vi,
};

export const languageOptions = [
  { key: 'cs', name: cs.name },
  { key: 'de', name: de.name },
  { key: 'en', name: en.name },
  { key: 'fr', name: fr.name },
  { key: 'lt', name: lt.name },
  { key: 'pl', name: pl.name },
  { key: 'sk', name: sk.name },
  { key: 'vi', name: vi.name },
];

export { languages };
