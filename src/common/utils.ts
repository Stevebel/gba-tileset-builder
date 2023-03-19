import { TILE_SIZE } from './constants.js';

export async function imageToCanvas(dataUrl: string) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = img.width;
  imageCanvas.height = img.height;
  const ctx = imageCanvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return imageCanvas;
}

export function tileIndexToCoords(tileIndex: number, tilesWide: number) {
  return {
    x: tileIndex % tilesWide,
    y: Math.floor(tileIndex / tilesWide),
  };
}

export function tileIndexToPixelCoords(tileIndex: number, tilesWide: number) {
  const { x, y } = tileIndexToCoords(tileIndex, tilesWide);
  return {
    x: x * TILE_SIZE,
    y: y * TILE_SIZE,
  };
}

export function coordsToTileIndex(x: number, y: number, tilesWide: number) {
  return y * tilesWide + x;
}

export function pixelCoordsToTileIndex(
  x: number,
  y: number,
  tilesWide: number
) {
  return coordsToTileIndex(
    Math.floor(x / TILE_SIZE),
    Math.floor(y / TILE_SIZE),
    tilesWide
  );
}

export function withItemFirst<T>(arr: T[], predicate: (item: T) => boolean) {
  const index = arr.findIndex(predicate);
  if (index === -1) {
    return arr;
  }
  return [arr[index], ...arr.slice(0, index), ...arr.slice(index + 1)];
}
