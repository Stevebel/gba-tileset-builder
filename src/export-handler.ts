import * as png from '@stevebel/png';
import Metadata from '@stevebel/png/lib/helpers/metadata';
import { strToU8, Zippable, zipSync } from 'fflate';
import { colorToRgb, rgbToColor } from './common/color-utils.js';
import { TilesetPalette } from './common/tileset.interface.js';

export function getImageFile() {
  const palette = tilesetState.palettes[0].colors.map((c, i) => [
    ...colorToRgb(c.color),
    i === 0 ? 0 : 255,
  ]) as NonNullable<Metadata['palette']>;
  const data: number[] = [];
  const imageData = tilesetState.imageData.data;
  const imageWidth = tilesetState.imageData.width;
  const { tiles, palettes } = tilesetState;
  const paletteMap: Map<number, number[]> = new Map();
  palettes.forEach(pal => {
    paletteMap.set(
      pal.index,
      pal.colors.map(c => c.color)
    );
  });

  for (let i = 0; i < imageData.length; i += 4) {
    const pixelNum = i / 4;
    const tileIndex = tilesetState.getTileIndex(pixelNum, imageWidth);
    const tile = tiles[tileIndex];
    if (tile?.paletteIndex == null) {
      data.push(...palette[0]);
    } else {
      const tilePalette = paletteMap.get(tile.paletteIndex);

      const color = rgbToColor(
        imageData[i],
        imageData[i + 1],
        imageData[i + 2]
      );
      const paletteIndex = tilePalette?.findIndex(c => c === color) ?? -1;
      if (paletteIndex > 0) {
        data.push(...palette[paletteIndex]);
      } else {
        data.push(...palette[0]);
      }
    }
  }
  const metadata: Metadata = {
    width: tilesetState.imageData.width,
    height: tilesetState.imageData.height,
    colorType: 3,
    compression: 0,
    filter: 0,
    interlace: 0,
    depth: 8,
    palette,
    data,
  };
  const imageBuffer = png.encode(metadata);
  return imageBuffer;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.style.display = 'none';
  a.click();
  a.remove();
}

export function getPalFile(palette: TilesetPalette) {
  let pal = '';
  // Use CR LF for line endings
  pal += 'JASC-PAL\r\n0100\r\n16\r\n';
  palette.colors.forEach(c => {
    pal += `${colorToRgb(c.color).join(' ')}\r\n`;
  });
  return strToU8(pal, true);
}

export function downloadCompleteExportZip() {
  const files: Zippable = {
    'tileset.png': getImageFile(),
  };
  tilesetState.palettes.forEach(p => {
    files[`palette${p.index.toString(10).padStart(2, '0')}.pal`] =
      getPalFile(p);
  });
  const zipped = zipSync(files, {
    level: 9,
  });
  downloadBlob(new Blob([zipped]), 'tileset.zip');
}
