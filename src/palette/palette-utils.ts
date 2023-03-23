import { EMPTY_COLOR } from '../common/color-utils.js';
import {
  ColorData,
  TilesetPalette,
  TilesetTile,
} from '../common/tileset.interface';
import { editorState } from '../state/editor-state.js';

export function getWithoutExcessEmptyColors(
  palette: TilesetPalette,
  transparencyColor = 0
) {
  // Skipping the first color because it's the transparent color
  // remove empty colors and shift the rest down, moving unassigned colors up
  // to the main palette
  const colors = palette.colors.concat(palette.unassignedColors);
  const newColors = colors.filter((c, i) => i === 0 || c.usageCount);
  while (newColors.length < 16) {
    newColors.push({
      color: transparencyColor,
      usageCount: 0,
    });
  }
  return {
    ...palette,
    colors: newColors.slice(0, 16),
    unassignedColors: newColors.slice(16),
  };
}

export function getUpdatedPaletteBasedOnTiles(
  palette: TilesetPalette,
  tiles: TilesetTile[]
): TilesetPalette {
  const colorCounts = new Map<number, number>();
  const colors: number[] = [];

  tiles?.forEach(tile => {
    editorState.currentDocument
      .getPixelsForTile(tile.tileIndex)
      .forEach(pixel => {
        const count = colorCounts.get(pixel) || 0;
        if (count === 0) {
          colors.push(pixel);
        }
        colorCounts.set(pixel, count + 1);
      });
  });
  const transparent = editorState.currentDocument.transparencyColor!;
  const tileColorData: ColorData[] = colors
    .map(color => {
      const count = colorCounts.get(color) || 0;
      return {
        color,
        usageCount: count,
      };
    })
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .filter(c => c.color !== transparent);
  // Move transparent color to the first slot
  tileColorData.unshift({
    color: transparent,
    usageCount: colorCounts.get(transparent) || 0,
  });
  // Add empty colors if palette is too small
  while (tileColorData.length < 16) {
    tileColorData.push(EMPTY_COLOR);
  }
  const newColors = tileColorData.slice(0, 16) as ColorData[];
  const unassignedColors = tileColorData.slice(16) as ColorData[];

  return {
    index: palette.index,
    colors: newColors,
    unassignedColors,
  };
}
