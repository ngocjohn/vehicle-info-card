import * as en from './languages/en.json';
import * as cs from './languages/cs.json';
import * as vi from './languages/vi.json';
import * as pl from './languages/pl.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const languages: any = {
  en: en,
  cs: cs,
  vi: vi,
  pl: pl,
};

export const languageOptions = [
  { key: 'en', name: 'English' },
  { key: 'cs', name: 'Czech' },
  { key: 'vi', name: 'Vietnamese' },
  { key: 'pl', name: 'Polish' },
];

export function localize(string: string, lang: string, search = '', replace = ''): string {
  const language = lang.replace(/['"]+/g, '').replace('-', '_');

  let translated: string;

  try {
    translated = string.split('.').reduce((o, i) => o[i], languages[language]);
  } catch (e) {
    translated = string.split('.').reduce((o, i) => o[i], languages['en']);
  }

  if (translated === undefined) translated = string.split('.').reduce((o, i) => o[i], languages['en']);

  if (search !== '' && replace !== '') {
    translated = translated.replace(search, replace);
  }
  return translated;
}
