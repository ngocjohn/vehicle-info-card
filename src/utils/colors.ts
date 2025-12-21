import tinycolor from 'tinycolor2';

export const rgb2hsv = (rgb: [number, number, number]): [number, number, number] => {
  const hsv = tinycolor({ r: rgb[0], g: rgb[1], b: rgb[2] }).toHsv();
  return Object.values(hsv).slice(0, 3) as [number, number, number];
};

export const hsv2rgb = (hsv: [number, number, number]): [number, number, number] => {
  const rgb = tinycolor({ h: hsv[0], s: hsv[1], v: hsv[2] }).toRgb();
  return [rgb.r, rgb.g, rgb.b];
};

export const rgb2hex = (rgb: [number, number, number]): string => {
  return tinycolor({ r: rgb[0], g: rgb[1], b: rgb[2] }).toHexString();
};

export const hex2rgb = (hex: string): [number, number, number] => {
  const rgb = tinycolor(hex).toRgb();
  return [rgb.r, rgb.g, rgb.b];
};
