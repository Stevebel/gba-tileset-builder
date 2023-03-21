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
  const tileColorData: ColorData[] = colors
    .map(color => {
      const count = colorCounts.get(color) || 0;
      return {
        color,
        usageCount: count,
      };
    })
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  const colorData: (ColorData | null)[] = [];
  palette.colors?.forEach(color => {
    const tileColor = tileColorData.find(c => c.color === color.color);
    if (tileColor) {
      colorData.push(tileColor);
      tileColorData.splice(tileColorData.indexOf(tileColor), 1);
    } else {
      colorData.push(null);
    }
  });
  if (
    colorData.length === 0 ||
    colorData[0]?.color !== editorState.currentDocument.transparencyColor!
  ) {
    colorData.unshift({
      color: editorState.currentDocument.transparencyColor!,
      usageCount: 0,
    });
  }
  colorData.forEach((color, i) => {
    if (color == null) {
      colorData[i] = tileColorData.shift() || EMPTY_COLOR;
    }
  });
  while (colorData.length < 16) {
    colorData.push(tileColorData.shift() || EMPTY_COLOR);
  }

  return {
    index: palette.index,
    colors: colorData as ColorData[],
    unassignedColors: tileColorData,
  };
}
