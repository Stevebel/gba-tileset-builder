/* eslint-disable no-bitwise */
import {
  ColorSpace,
  deltaEJz,
  display,
  Jzazbz,
  Lab,
  LCH,
  mix,
  range,
  sRGB,
  steps,
} from 'colorjs.io/fn';
import { ColorObject } from 'colorjs.io/types/src/color';
import { ColorData } from './tileset.interface';

export const EMPTY_COLOR: ColorData = { color: 0, usageCount: 0 };

// Register color spaces for parsing and converting
ColorSpace.register(sRGB); // Can parse keywords and hex colors
ColorSpace.register(Jzazbz);
ColorSpace.register(Lab);
ColorSpace.register(LCH);

export function rgbToColor(red: number, green: number, blue: number) {
  return blue | (green << 8) | (red << 16);
}
export function colorToRgb(color: number) {
  return [(color & 0xff0000) >> 16, (color & 0x00ff00) >> 8, color & 0x0000ff];
}
export function invertColor(color: number) {
  const [r, g, b] = colorToRgb(color);
  return rgbToColor(255 - r, 255 - g, 255 - b);
}

function colorToColorObject(color: number): ColorObject {
  return {
    space: 'sRGB',
    coords: colorToRgb(color).map(c => c / 255.0) as [number, number, number],
  };
}

export function colorDistance(color: number, color2: number) {
  const a = colorToColorObject(color);
  const b = colorToColorObject(color2);
  return deltaEJz(a, b);
}

export function findNearestColor(color: number, colors: number[]) {
  let minDistance = Infinity;
  let nearestColor: number | undefined;
  colors.forEach(c => {
    if (c === color) return; // Skip the same color
    const distance = colorDistance(color, c);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = c;
    }
  });
  return nearestColor;
}

export function findNearestColorIndex(color: number, colors: number[]) {
  let minDistance = Infinity;
  let nearestColorIndex = -1;
  colors.forEach((c, i) => {
    if (c === color) return; // Skip the same color
    const distance = colorDistance(color, c);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColorIndex = i;
    }
  });
  return nearestColorIndex;
}

export function sortByColorDistance(color: number, colors: number[]) {
  return colors.sort(
    (a, b) => colorDistance(color, a) - colorDistance(color, b)
  );
}

export function sortIndexesByColorDistance(color: number, colors: number[]) {
  return colors
    .map((_, i) => i)
    .sort(
      (a, b) =>
        colorDistance(color, colors[a]) - colorDistance(color, colors[b])
    );
}

export function getGradient(
  color: number,
  color2: number,
  direction = 'right'
) {
  const r = range(colorToColorObject(color), colorToColorObject(color2), {
    space: 'Jzazbz',
  });
  const stops = steps(r, { steps: 5, maxDeltaE: 3, space: 'Jzazbz' });
  return `linear-gradient(to ${direction}, ${stops
    .map(s => display(s))
    .join(', ')})`;
}

export function mixColors(color: number, color2: number, amount = 0.5) {
  const c1 = colorToColorObject(color);
  const c2 = colorToColorObject(color2);
  const m = mix(c1, c2, amount, {
    space: 'Jzazbz',
    outputSpace: 'sRGB',
  }) as unknown as ColorObject;
  const [r, g, b] = m.coords.map(c => Math.round(c * 255));
  return rgbToColor(r, g, b);
}

export function colorToHex(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function hexToColor(hex: string) {
  return parseInt(hex.slice(1), 16);
}
