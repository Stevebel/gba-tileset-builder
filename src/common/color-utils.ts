import {
  ColorSpace,
  deltaEJz,
  display,
  getColor,
  Jzazbz,
  Lab,
  LCH,
  mix,
  range,
  sRGB,
  steps,
  to,
} from 'colorjs.io/fn';
import { ColorObject } from 'colorjs.io/types/src/color';
import { ColorData, RGBColor } from './tileset.interface';

export const EMPTY_COLOR: ColorData = { color: [0, 0, 0], usageCount: 0 };

// Register color spaces for parsing and converting
ColorSpace.register(sRGB); // Can parse keywords and hex colors
ColorSpace.register(Jzazbz);
ColorSpace.register(Lab);
ColorSpace.register(LCH);

function rgbColorToColorObject(color: RGBColor): ColorObject {
  return {
    space: 'sRGB',
    coords: color.map(c => c / 255.0) as [number, number, number],
  };
}

export function colorDistance(color: RGBColor, color2: RGBColor) {
  const a = rgbColorToColorObject(color);
  const b = rgbColorToColorObject(color2);
  return deltaEJz(a, b);
}

export function findNearestColor(color: RGBColor, colors: RGBColor[]) {
  let minDistance = Infinity;
  let nearestColor: RGBColor | undefined;
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

export function findNearestColorIndex(color: RGBColor, colors: RGBColor[]) {
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

export function sortByColorDistance(color: RGBColor, colors: RGBColor[]) {
  return colors.sort(
    (a, b) => colorDistance(color, a) - colorDistance(color, b)
  );
}

export function sortIndexesByColorDistance(
  color: RGBColor,
  colors: RGBColor[]
) {
  return colors
    .map((_, i) => i)
    .sort(
      (a, b) =>
        colorDistance(color, colors[a]) - colorDistance(color, colors[b])
    );
}

export function colorsAreEqual(
  color: RGBColor | null,
  color2: RGBColor | null
) {
  return (
    color === color2 ||
    (color != null &&
      color2 != null &&
      color[0] === color2[0] &&
      color[1] === color2[1] &&
      color[2] === color2[2])
  );
}

export function getGradient(
  color: RGBColor,
  color2: RGBColor,
  direction = 'right'
) {
  const r = range(rgbColorToColorObject(color), rgbColorToColorObject(color2), {
    space: 'Jzazbz',
  });
  const stops = steps(r, { steps: 5, maxDeltaE: 3, space: 'Jzazbz' });
  return `linear-gradient(to ${direction}, ${stops
    .map(s => display(s))
    .join(', ')})`;
}

export function mixColors(color: RGBColor, color2: RGBColor, amount = 0.5) {
  const c1 = rgbColorToColorObject(color);
  const c2 = rgbColorToColorObject(color2);
  const m = mix(c1, c2, amount, {
    space: 'Jzazbz',
    outputSpace: 'sRGB',
  }) as unknown as ColorObject;
  const [r, g, b] = m.coords.map(c => Math.round(c * 255));
  return [r, g, b] as RGBColor;
}

export function rgbColorToHex(color: RGBColor) {
  return `#${color.map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRGBColor(hex: string) {
  const color = getColor(hex);
  return to(color, 'sRGB').coords.map(c => Math.round(c * 255)) as RGBColor;
}
