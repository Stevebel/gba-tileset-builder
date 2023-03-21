import { colorToRgb, EMPTY_COLOR, rgbToColor } from '../common/color-utils.js';
import { ColorData, TilesetPalette } from '../common/tileset.interface';
import { pixelToTileIndex } from '../common/utils.js';
import { getWithoutExcessEmptyColors } from '../palette/palette-utils.js';
import { TilesetDocument } from '../state/tileset-document.js';
import { Command } from './command.interface';

export function mergeColors(
  color1: number,
  color2: number,
  targetColor: number,
  paletteIndex: number
): Command<TilesetDocument> {
  let oldImageDataURL: string;
  let oldPalette: TilesetPalette;

  return {
    getDescription: () => 'Merge Colors',
    execute: doc => {
      console.log('mergeColors', color1, color2, targetColor, paletteIndex);
      oldImageDataURL = doc.imageDataURL;
      const [r, g, b] = colorToRgb(targetColor);
      const imageCanvas = document.createElement('canvas');
      imageCanvas.width = doc.imageData.width;
      imageCanvas.height = doc.imageData.height;
      const ctx = imageCanvas.getContext('2d')!;
      const { data } = doc.imageData;
      const imgWidth = imageCanvas.width;
      for (let i = 0; i < data.length; i += 4) {
        const pixelNum = i / 4;
        const tileIndex = pixelToTileIndex(pixelNum, imgWidth);
        if (tileIndex < doc.tiles.length) {
          const tile = doc.tiles[tileIndex];
          if (tile.paletteIndex === paletteIndex) {
            const oldColor = rgbToColor(data[i], data[i + 1], data[i + 2]);
            if (oldColor === color1 || oldColor === color2) {
              console.log(
                'replacing',
                oldColor,
                'with',
                targetColor,
                'at',
                pixelNum
              );
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
            }
          }
        }
      }
      ctx.putImageData(doc.imageData, 0, 0);
      // Update the palette
      const idx = doc.palettes.findIndex(p => p.index === paletteIndex)!;
      oldPalette = doc.palettes[idx];
      const colors = [...oldPalette.colors, ...oldPalette.unassignedColors];
      const replaceIndexes = [color1, color2]
        .map(c => colors.findIndex(cd => cd.color === c))
        .sort();
      const oldColorData = colors.filter((_, i) => replaceIndexes.includes(i));
      const newColorData: ColorData = {
        color: targetColor,
        usageCount: oldColorData.reduce(
          (acc, c) => acc + (c.usageCount || 0),
          0
        ),
      };
      colors[replaceIndexes[0]] = newColorData;
      for (let i = 1; i < replaceIndexes.length; i++) {
        colors[replaceIndexes[i]] = EMPTY_COLOR;
      }
      doc.palettes[idx] = getWithoutExcessEmptyColors({
        ...oldPalette,
        colors: colors.slice(0, 16),
        unassignedColors: colors.slice(16),
      });
      doc.imageDataURL = imageCanvas.toDataURL();
      doc.updateImageFromDataURL();
    },
    undo: doc => {
      doc.imageDataURL = oldImageDataURL;
      doc.updateImageFromDataURL();
      doc.palettes = doc.palettes.map(p => {
        if (p.index === paletteIndex) {
          return oldPalette;
        }
        return p;
      });
    },
  };
}
