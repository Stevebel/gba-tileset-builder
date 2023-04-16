import { rgbToColor } from './color-utils.js';

export function checkIfColorsAdjecent(
  imageData: ImageData,
  color1: number,
  color2: number
) {
  const { data } = imageData;

  function getCoordsForIndex(index: number) {
    const pixelIdx = index / 4;
    return {
      x: pixelIdx % imageData.width,
      y: Math.floor(pixelIdx / imageData.width),
    };
  }
  function getPixelIndex(x: number, y: number) {
    return (y * imageData.width + x) * 4;
  }

  for (let i = 0; i < data.length; i += 4) {
    const { x, y } = getCoordsForIndex(i);
    const color = rgbToColor(data[i], data[i + 1], data[i + 2]);
    if (color === color1) {
      const left = getPixelIndex(x - 1, y);
      const right = getPixelIndex(x + 1, y);
      const top = getPixelIndex(x, y - 1);
      const bottom = getPixelIndex(x, y + 1);
      const neighbors = [left, right, top, bottom];
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && neighbor + 3 < data.length) {
          const neighborColor = rgbToColor(
            data[neighbor],
            data[neighbor + 1],
            data[neighbor + 2]
          );
          if (neighborColor === color2) {
            return true;
          }
        }
      }
    }
  }
  return false;
}
