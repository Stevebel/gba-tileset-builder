import * as png from '@stevebel/png';
import { COLOR_TYPES } from '@stevebel/png/lib/helpers/color-types.js';
import Metadata from '@stevebel/png/lib/helpers/metadata';
import { strFromU8, strToU8, unzipSync, Zippable, zipSync } from 'fflate';
import { colorToRgb, rgbToColor } from './common/color-utils.js';
import { TilesetPalette } from './common/tileset.interface.js';
import { pixelToTileIndex, tileIndexToPixelCoords } from './common/utils.js';
import { editorState } from './state/editor-state.js';
import { TilesetDocument } from './state/tileset-document.js';

export function getMappedPixel(
  pixelNum: number,
  mapping: number,
  doc: TilesetDocument
): [number, number, number] {
  if (mapping >= 0) {
    const tile = doc.tiles[mapping];
    if (tile?.paletteIndex != null) {
      const offsetX = pixelNum % 8;
      const offsetY = Math.floor(pixelNum / 128) % 8;
      const { x: inputTileX, y: inputTileY } = tileIndexToPixelCoords(
        mapping,
        doc.tilesWide
      );
      const inputPixelIndex =
        ((inputTileY + offsetY) * doc.imageData.width +
          (inputTileX + offsetX)) *
        4;
      return [
        ...doc.imageData.data.slice(inputPixelIndex, inputPixelIndex + 3),
      ] as [number, number, number];
    }
  }
  return [0, 0, 0];
}

export function getImageFile(
  options = {
    wholeImage: false,
  }
) {
  const doc = editorState.currentDocument;
  const palette = doc.palettes[0].colors.map((c, i) => [
    ...colorToRgb(c.color),
    i === 0 ? 0 : 255,
  ]) as NonNullable<Metadata['palette']>;
  const data: number[] = [];
  // Clone the image data so we don't modify the original
  const imageData = doc.imageData.data;
  const imageWidth = options.wholeImage ? doc.imageData.width : 128;
  const imageHeight = options.wholeImage ? doc.imageData.height : 256;
  const { tiles, tileMapping, palettes } = doc;
  const paletteMap: Map<number, number[]> = new Map();
  palettes.forEach(pal => {
    paletteMap.set(
      pal.index,
      pal.colors.map(c => c.color)
    );
  });

  if (!options.wholeImage) {
    for (let i = 0; i < imageData.length; i += 4) {
      const pixelNum = i / 4;
      const outputIndex = pixelToTileIndex(pixelNum, imageWidth);
      const tileIndex = tileMapping[outputIndex];

      if ((tileIndex ?? -1) < 0) {
        data.push(...palette[0]);
      } else {
        const tile = tiles[tileIndex];
        const tilePalette = paletteMap.get(tile.paletteIndex!);

        const color = rgbToColor(...getMappedPixel(pixelNum, tileIndex, doc));
        const paletteIndex = tilePalette?.findIndex(c => c === color) ?? -1;
        if (paletteIndex > 0) {
          data.push(...palette[paletteIndex]);
        } else {
          data.push(...palette[0]);
        }
      }
    }
    const metadata: Metadata = {
      width: imageWidth,
      height: imageHeight,
      colorType: COLOR_TYPES.PALETTE,
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

  const metadata: Metadata = {
    width: imageWidth,
    height: imageHeight,
    colorType: COLOR_TYPES.TRUE_COLOR,
    compression: 0,
    filter: 0,
    interlace: 0,
    depth: 8,
    data: [...imageData],
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
    'tilesheet.png': getImageFile({ wholeImage: true }),
  };
  editorState.currentDocument.palettes.forEach(p => {
    files[`palette${p.index.toString(10).padStart(2, '0')}.pal`] =
      getPalFile(p);
  });
  const zipped = zipSync(files, {
    level: 9,
  });
  downloadBlob(new Blob([zipped]), 'tileset.zip');
}

export function saveCurrentDocument() {
  const doc = editorState.currentDocument;
  const serializableDoc = {
    tiles: doc.tiles,
    palettes: doc.palettes,
    paletteIndexOffset: doc.paletteIndexOffset,
    imageDataURL: doc.imageDataURL,
    transparencyColor: doc.transparencyColor,
    // historyState: doc.historyState,
    tileMapping: doc.tileMapping,
  };
  const zipped = zipSync({
    'document.json': strToU8(JSON.stringify(serializableDoc)),
  });
  downloadBlob(new Blob([zipped]), 'tileset.gts');
}

export function loadDocument(file: File) {
  if (editorState.currentDocument?.imageData) {
    if (
      // eslint-disable-next-line no-alert
      !window.confirm(
        'Are you sure you want to load a new document? Unsaved changes will be lost.'
      )
    ) {
      return;
    }
  }

  // File to UInt8Array
  const reader = new FileReader();
  reader.onload = () => {
    console.log('Loaded', reader.result);
    const data = new Uint8Array(reader.result as ArrayBuffer);
    const unzipped = unzipSync(data);
    console.log(unzipped);
    if (unzipped['document.json']) {
      const doc = JSON.parse(strFromU8(unzipped['document.json']));
      console.log(doc);
      editorState.open(doc.imageDataURL);
      editorState.currentDocument.tiles = doc.tiles;
      editorState.currentDocument.palettes = doc.palettes;
      editorState.currentDocument.paletteIndexOffset = doc.paletteIndexOffset;
      editorState.currentDocument.transparencyColor = doc.transparencyColor;
      editorState.currentDocument.tileMapping = doc.tileMapping;
    }
  };
  reader.readAsArrayBuffer(file);
}
