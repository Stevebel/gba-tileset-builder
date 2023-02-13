import { ColorSpace, sRGB, Jzazbz, deltaEJz } from 'colorjs.io/fn';
import { ColorObject } from 'colorjs.io/types/src/color';
import { ColorData, RGBColor } from './tileset.interface';

export const EMPTY_COLOR: ColorData = { color: [0, 0, 0], usageCount: 0 };

// Register color spaces for parsing and converting
ColorSpace.register(sRGB); // Can parse keywords and hex colors
ColorSpace.register(Jzazbz);

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

export function colorsAreEqual(color: RGBColor, color2: RGBColor) {
  return (
    color[0] === color2[0] && color[1] === color2[1] && color[2] === color2[2]
  );
}
