// This file is generated automatically by the generate-lang-imports script. Do not modify it manually.

import * as cs from '../languages/cs.json';
import * as de from '../languages/de.json';
import * as en_GB from '../languages/en-GB.json';
import * as en from '../languages/en.json';
import * as es from '../languages/es.json';
import * as fr from '../languages/fr.json';
import * as it from '../languages/it.json';
import * as lt from '../languages/lt.json';
import * as nl from '../languages/nl.json';
import * as pl from '../languages/pl.json';
import * as sk from '../languages/sk.json';
import * as vi from '../languages/vi.json';
import * as zh_Hans from '../languages/zh-Hans.json';
import * as zh_Hant from '../languages/zh-Hant.json';

const languages: any = {
  cs: cs,
  de: de,
  'en-GB': en_GB,
  en: en,
  es: es,
  fr: fr,
  it: it,
  lt: lt,
  nl: nl,
  pl: pl,
  sk: sk,
  vi: vi,
  'zh-Hans': zh_Hans,
  'zh-Hant': zh_Hant,
};

export const languageOptions = [
  { key: 'cs', name: cs.name, nativeName: cs.nativeName },
  { key: 'de', name: de.name, nativeName: de.nativeName },
  { key: 'en-GB', name: en_GB.name, nativeName: en_GB.nativeName },
  { key: 'en', name: en.name, nativeName: en.nativeName },
  { key: 'es', name: es.name, nativeName: es.nativeName },
  { key: 'fr', name: fr.name, nativeName: fr.nativeName },
  { key: 'it', name: it.name, nativeName: it.nativeName },
  { key: 'lt', name: lt.name, nativeName: lt.nativeName },
  { key: 'nl', name: nl.name, nativeName: nl.nativeName },
  { key: 'pl', name: pl.name, nativeName: pl.nativeName },
  { key: 'sk', name: sk.name, nativeName: sk.nativeName },
  { key: 'vi', name: vi.name, nativeName: vi.nativeName },
  { key: 'zh-Hans', name: zh_Hans.name, nativeName: zh_Hans.nativeName },
  { key: 'zh-Hant', name: zh_Hant.name, nativeName: zh_Hant.nativeName },
];

export const langFiles: Record<string, unknown> = {
  cs,
  de,
  'en-GB': en_GB,
  en,
  es,
  fr,
  it,
  lt,
  nl,
  pl,
  sk,
  vi,
  'zh-Hans': zh_Hans,
  'zh-Hant': zh_Hant,
};

export const langKeys = ['cs', 'de', 'en-GB', 'en', 'es', 'fr', 'it', 'lt', 'nl', 'pl', 'sk', 'vi', 'zh-Hans', 'zh-Hant'] as const;

export { languages };
