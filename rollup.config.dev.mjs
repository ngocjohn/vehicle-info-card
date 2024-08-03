import { description, repository } from './package.json';

export function logCardInfo(version) {
  const line1 = `   🏎️ 💨 VEHICLE-INFO-CARD 🚜 ${version} 🛺 💨`;
  const line2 = `   `;
  const length = Math.max(line1.length, line2.length) + 3;
  const pad = (text, length) => text + ' '.repeat(length - text.length);
  const repo = repository.url;
  const sponsor = 'https://github.com/sponsors/ngocjohn';

  return `
    console.groupCollapsed(
      "%c${pad(line1, length)}\\n%c${pad(line2, length)}",
      'color: orange; font-weight: bold; background: transparent',
      'font-weight: bold; background: dimgray'
    );
    console.info('${description}');
    console.info('Github: ${repo}');
    console.info('If you like the card, consider supporting the developer: ${sponsor}');
    console.groupEnd();
  `;
}
