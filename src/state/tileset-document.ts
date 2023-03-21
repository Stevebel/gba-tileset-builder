import { property, State, storage } from '@lit-app/state';
import { CommandHistory } from '../commands/history.js';
import { rgbToColor } from '../common/color-utils.js';
import { TILE_SIZE } from '../common/constants.js';
import {
  Tileset,
  TilesetPalette,
  TilesetTile,
} from '../common/tileset.interface';
import { imageToCanvas } from '../common/utils.js';

export class TilesetDocument extends State implements Tileset {
  @storage({ key: 'tiles' })
  @property({ type: Array })
  tiles!: TilesetTile[];

  @storage({ key: 'palettes' })
  @property({ type: Array })
  palettes!: TilesetPalette[];

  @storage({ key: 'paletteIndexOffset' })
  @property({ type: Number })
  paletteIndexOffset!: number;

  @property()
  imageCanvas!: HTMLCanvasElement;

  @property()
  imageData!: ImageData;

  @property()
  tilesWide!: number;

  @storage({ key: 'imageDataURL' })
  @property()
  imageDataURL!: string;

  @storage({ key: 'transparencyColor' })
  @property({ type: Object })
  transparencyColor!: number;

  @property({ type: Array })
  history: CommandHistory<this>;

  private loadingPromise?: Promise<HTMLCanvasElement>;

  private loading = false;

  constructor(imageDataURL?: string) {
    super();
    this.palettes =
      this.palettes?.filter(
        p => p?.colors.length > 0 || p?.unassignedColors.length > 0
      ) || [];
    if (imageDataURL) {
      this.imageDataURL = imageDataURL;
    }
    if (!this.imageDataURL) {
      this.imageDataURL = '';
    } else {
      this.updateImageFromDataURL();
    }
    if (!this.tiles) {
      this.tiles = [];
    }
    if (this.transparencyColor == null) {
      this.transparencyColor = 0xff00ff;
    }
    if (this.paletteIndexOffset == null) {
      this.paletteIndexOffset = 0;
    }
    this.history = new CommandHistory(this);
  }

  async updateImageFromDataURL() {
    console.log('updateImageFromDataURL');
    this.loading = true;
    this.loadingPromise = imageToCanvas(this.imageDataURL);
    this.imageCanvas = await this.loadingPromise;
    this.loading = false;
    console.log('updateImageFromDataURL done');
    const ctx = this.imageCanvas.getContext('2d')!;
    this.imageData = ctx.getImageData(
      0,
      0,
      this.imageCanvas.width,
      this.imageCanvas.height
    );
    const tilesHigh = Math.ceil(this.imageCanvas.height / TILE_SIZE);
    if (!this.tiles || this.tiles.length !== this.tilesWide * tilesHigh) {
      this.populateTiles();
    }
  }

  private populateTiles() {
    const canvas = this.imageCanvas;
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

  // Convenience methods
  getPixelsForTile(tileIndex: number): number[] {
    const pixels: number[] = [];
    const tileRow = Math.floor(tileIndex / this.tilesWide);
    const tileCol = tileIndex % this.tilesWide;
    const tileX = tileCol * TILE_SIZE;
    const tileY = tileRow * TILE_SIZE;
    for (let i = 0; i < TILE_SIZE; i++) {
      for (let j = 0; j < TILE_SIZE; j++) {
        const pixelNum = (tileY + i) * this.imageCanvas.width + tileX + j;
        const [r, g, b] = this.imageData.data.slice(
          pixelNum * 4,
          pixelNum * 4 + 3
        );
        pixels.push(rgbToColor(r, g, b));
      }
    }
    return pixels;
  }
}
