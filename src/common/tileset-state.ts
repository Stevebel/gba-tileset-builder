/* eslint-disable import/extensions */
import { property, State, storage } from '@lit-app/state';
import { TILE_SIZE, ToolType } from './constants';
import {
  ColorData,
  RGBColor,
  Tileset,
  TilesetPalette,
  TilesetTile,
} from './tileset.interface';
import { imageToCanvas } from './utils';

class TilesetState extends State implements Tileset {
  @storage({ key: 'tiles' })
  @property({ type: Array })
  tiles!: TilesetTile[];

  @storage({ key: 'palettes' })
  @property({ type: Array })
  palettes!: TilesetPalette[];

  @property()
  imageCanvas!: HTMLCanvasElement;

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

  constructor() {
    super();
    console.log(this.tiles);
    this.palettes =
      this.palettes?.filter(
        p => p.colors.length > 0 || p.unassignedColors.length > 0
      ) || [];
    if (!this.imageDataURL) {
      this.imageDataURL = '';
    } else {
      this.setImageDataURL(this.imageDataURL, false);
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
    console.log(this.tiles[index]);
  }

  deletePalette(index: number) {
    this.palettes = this.palettes.filter(p => p.index !== index);
  }

  selectColor(paletteIndex: number, color: RGBColor) {
    if (this.selectedPaletteIndex !== paletteIndex) {
      this.selectedPaletteIndex = paletteIndex;
      this.selectedColors = [color];
    } else if (this.selectedColors.includes(color)) {
      this.selectedColors = this.selectedColors.filter(c => c !== color);
    } else if (this.selectedColors.length > 0) {
      this.selectedColors = [
        this.selectedColors[this.selectedColors.length - 1],
        color,
      ];
    } else {
      this.selectedColors = [color];
    }
  }

  async setImageDataURL(url: string, populateTiles = true) {
    this.imageDataURL = url;
    this.imageCanvas = await imageToCanvas(url);
    if (populateTiles) {
      this.populateTileset(this.imageCanvas);
    }
  }

  private populateTileset(canvas: HTMLCanvasElement) {
    console.log('populateTileset');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.tiles = [];
    let idx = 0;
    for (let y = 0; y < canvas.height; y += TILE_SIZE) {
      for (let x = 0; x < canvas.width; x += TILE_SIZE) {
        const tile = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
        const pixels: RGBColor[] = [];
        for (let i = 0; i < tile.data.length; i += 4) {
          pixels.push([tile.data[i], tile.data[i + 1], tile.data[i + 2]]);
        }
        this.tiles.push({
          tileIndex: idx,
          pixels,
          selected: false,
        });
        idx += 1;
      }
    }
  }
}

export const tilesetState = new TilesetState();
