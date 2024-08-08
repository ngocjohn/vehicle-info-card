import * as cs from '../languages/cs.json';
import * as de from '../languages/de.json';
import * as en from '../languages/en.json';
import * as pl from '../languages/pl.json';
import * as sk from '../languages/sk.json';
import * as vi from '../languages/vi.json';
import * as lt from '../languages/lt.json';

const languages: any = {
  cs: cs,
  de: de,
  en: en,
  pl: pl,
  sk: sk,
  vi: vi,
  lt: lt,
};

export const languageOptions = [
  { key: 'cs', name: cs.name },
  { key: 'de', name: de.name },
  { key: 'en', name: en.name },
  { key: 'pl', name: pl.name },
  { key: 'sk', name: sk.name },
  { key: 'vi', name: vi.name },
  { key: 'lt', name: lt.name },
];

export { languages };
