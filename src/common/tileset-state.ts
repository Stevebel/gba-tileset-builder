/* eslint-disable import/extensions */
import { property, State, storage } from '@lit-app/state';
import {
  colorsAreEqual,
  EMPTY_COLOR,
  hexToRGBColor,
  rgbColorToHex,
} from './color-utils';
import { TILE_SIZE, ToolType } from './constants';
import {
  ColorData,
  RGBColor,
  Tileset,
  TilesetPalette,
  TilesetTile,
} from './tileset.interface';
import { imageToCanvas } from './utils';

const DefaultViewOptions = {
  showGrid: true,
  showPaletteNumbers: true,
};

class TilesetState extends State implements Tileset {
  @storage({ key: 'tiles' })
  @property({ type: Array })
  tiles!: TilesetTile[];

  @storage({ key: 'palettes' })
  @property({ type: Array })
  palettes!: TilesetPalette[];

  @property()
  imageCanvas!: HTMLCanvasElement;

  @property()
  imageData!: ImageData;

  @property()
  tilesWide!: number;

  @storage({ key: 'imageDataURL' })
  @property()
  imageDataURL!: string;

  @storage({ key: 'selectedPaletteIndex' })
  @property({ type: Number })
  selectedPaletteIndex?: number;

  @storage({ key: 'selectedColors' })
  @property({ type: Array })
  selectedColors!: RGBColor[];

  @storage({ key: 'currentTool' })
  @property()
  currentTool!: ToolType;

  @storage({ key: 'lastTool' })
  @property()
  lastTool?: ToolType;

  @property({ type: String })
  replacementColor?: RGBColor;

  @storage({ key: 'viewOptions' })
  @property({ type: Object })
  viewOptions!: typeof DefaultViewOptions;

  @storage({ key: 'transparencyColor' })
  @property({ type: Object })
  transparencyColor?: RGBColor;

  @property()
  hoverColor?: RGBColor;

  constructor() {
    super();
    this.palettes =
      this.palettes?.filter(
        p => p.colors.length > 0 || p.unassignedColors.length > 0
      ) || [];
    if (!this.imageDataURL) {
      this.imageDataURL = '';
    } else {
      this.setImageDataURL(this.imageDataURL);
    }
    if (!this.tiles) {
      this.tiles = [];
    }
    if (!this.selectedColors) {
      this.selectedColors = [];
    }
    if (!this.currentTool) {
      this.currentTool = 'select';
    }
    if (!this.viewOptions) {
      this.viewOptions = DefaultViewOptions;
    }
    if (!this.transparencyColor) {
      this.transparencyColor = [255, 0, 255];
    }
  }

  addPalette(colors: ColorData[] = []) {
    const sortedColors = colors.sort(
      (a, b) => (b.usageCount || 0) - (a.usageCount || 0)
    );
    const palette: TilesetPalette = {
      index: this.palettes.length,
      colors: sortedColors.slice(0, 16),
      unassignedColors: sortedColors.slice(16),
    };
    this.palettes = [...this.palettes, palette];
    return palette;
  }

  updatePalette(palette: Partial<TilesetPalette> & { index: number }) {
    this.palettes = this.palettes.map(p =>
      p.index === palette.index ? { ...p, ...palette } : p
    );
    this.removeExcessEmptyColors(this.selectedPaletteIndex!);
    return this.palettes.find(p => p.index === palette.index)!;
  }

  changeSelectedTilesPalette(paletteIndex: number | undefined) {
    this.tiles = this.tiles.map(tile =>
      tile.selected ? { ...tile, paletteIndex } : tile
    );
  }

  selectTile(index: number, selectMultiple = false, deselect = false) {
    this.tiles = this.tiles.map((tile, i) => ({
      ...tile,
      selected:
        (i === index && !deselect) ||
        (selectMultiple && tile.selected && i !== index),
    }));
  }

  deletePalette(index: number) {
    this.palettes = this.palettes.filter(p => p.index !== index);
  }

  selectColor(paletteIndex: number, color: RGBColor) {
    if (this.selectedPaletteIndex !== paletteIndex) {
      this.selectedPaletteIndex = paletteIndex;
      this.selectedColors = [color];
    } else if (this.selectedColors.some(c => colorsAreEqual(c, color))) {
      this.selectedColors = this.selectedColors.filter(
        c => !colorsAreEqual(c, color)
      );
    } else if (this.selectedColors.length > 0) {
      this.selectedColors = [
        this.selectedColors[this.selectedColors.length - 1],
        color,
      ];
    } else {
      this.selectedColors = [color];
    }
  }

  async setImageDataURL(url: string) {
    this.imageDataURL = url;
    this.imageCanvas = await imageToCanvas(url);
    this.populateTileset(this.imageCanvas);
  }

  private populateTileset(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newTiles = [];
    this.tilesWide = Math.ceil(canvas.width / TILE_SIZE);
    const tilesHigh = Math.ceil(canvas.height / TILE_SIZE);
    const tileCount = this.tilesWide * tilesHigh;
    for (let i = 0; i < tileCount; i++) {
      newTiles.push({
        tileIndex: i,
        selected: this.tiles[i]?.selected || false,
        paletteIndex: this.tiles[i]?.paletteIndex,
      });
    }
    this.tiles = newTiles;
  }

  getTileIndex(pixelNum: number, imageWidth: number) {
    return (
      Math.floor(pixelNum / (TILE_SIZE * imageWidth)) * this.tilesWide +
      Math.floor((pixelNum % imageWidth) / TILE_SIZE)
    );
  }

  getPixelsForTile(tileIndex: number): RGBColor[] {
    const pixels: RGBColor[] = [];
    const tileRow = Math.floor(tileIndex / this.tilesWide);
    const tileCol = tileIndex % this.tilesWide;
    const tileX = tileCol * TILE_SIZE;
    const tileY = tileRow * TILE_SIZE;
    for (let i = 0; i < TILE_SIZE; i++) {
      for (let j = 0; j < TILE_SIZE; j++) {
        const pixelNum = (tileY + i) * this.imageCanvas.width + tileX + j;
        const pixel = this.imageData.data.slice(pixelNum * 4, pixelNum * 4 + 3);
        pixels.push([...pixel] as RGBColor);
      }
    }
    return pixels;
  }

  mergeSelectedColors([r, g, b]: RGBColor) {
    const oldImageData = this.imageCanvas
      .getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, this.imageCanvas.width, this.imageCanvas.height);
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = this.imageCanvas.width;
    imageCanvas.height = this.imageCanvas.height;
    const ctx = imageCanvas.getContext('2d')!;
    const oldData = oldImageData.data;
    const imageData = new ImageData(
      oldData,
      oldImageData.width,
      oldImageData.height
    );
    const { data } = imageData;
    const { selectedColors } = this;
    const imgWidth = imageCanvas.width;
    for (let i = 0; i < data.length; i += 4) {
      const pixelNum = i / 4;
      const tileIndex = this.getTileIndex(pixelNum, imgWidth);
      if (tileIndex < this.tiles.length) {
        const tile = this.tiles[tileIndex];
        if (tile.paletteIndex === this.selectedPaletteIndex) {
          const color = [
            oldData[i],
            oldData[i + 1],
            oldData[i + 2],
          ] as RGBColor;
          if (selectedColors.some(c => colorsAreEqual(c, color))) {
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    // Update the palette
    const paletteIndex = this.palettes.findIndex(
      p => p.index === this.selectedPaletteIndex
    )!;
    const palette = this.palettes[paletteIndex];
    const colors = [...palette.colors, ...palette.unassignedColors];
    const replaceIndexes = selectedColors
      .map(c => colors.findIndex(cd => colorsAreEqual(c, cd.color)))
      .sort();
    const oldColorData = colors.filter((_, i) => replaceIndexes.includes(i));
    const newColorData: ColorData = {
      color: [r, g, b],
      usageCount: oldColorData.reduce((acc, c) => acc + (c.usageCount || 0), 0),
    };
    colors[replaceIndexes[0]] = newColorData;
    for (let i = 1; i < replaceIndexes.length; i++) {
      colors[replaceIndexes[i]] = EMPTY_COLOR;
    }
    this.palettes[paletteIndex] = {
      ...palette,
      colors: colors.slice(0, 16),
      unassignedColors: colors.slice(16),
    };
    this.removeExcessEmptyColors(this.selectedPaletteIndex!);
    this.selectedColors = [];

    // Update image
    this.setImageDataURL(imageCanvas.toDataURL());
  }

  removeExcessEmptyColors(paletteIndex: number) {
    const palette = this.palettes.find(p => p.index === paletteIndex)!;
    // Skipping the first color because it's the transparent color
    // remove empty colors and shift the rest down, moving unassigned colors up
    // to the main palette
    const colors = palette.colors.concat(palette.unassignedColors);
    const newColors = colors.filter((c, i) => i === 0 || c.usageCount);
    this.palettes = this.palettes.map(p => {
      if (p.index === paletteIndex) {
        return {
          ...p,
          colors: newColors.slice(0, 16),
          unassignedColors: newColors.slice(16),
        };
      }
      return p;
    });
  }

  setTransparencyColorHex(hex: string) {
    this.transparencyColor = hexToRGBColor(hex);
  }

  getTransparencyColorHex() {
    return this.transparencyColor
      ? rgbColorToHex(this.transparencyColor)
      : undefined;
  }
}

export const tilesetState = new TilesetState();
