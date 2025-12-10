import { repository } from '../../package.json';

interface RegisterCardParams {
  type: string;
  name: string;
  description: string;
}
export function registerCustomCard(params: RegisterCardParams) {
  console.log('Registering custom card:', params);
  const windowWithCards = window as unknown as Window & {
    customCards: unknown[];
  };
  windowWithCards.customCards = windowWithCards.customCards || [];
  windowWithCards.customCards.push({
    ...params,
    preview: true,
    documentationURL: `${repository.url}`,
  });
}
