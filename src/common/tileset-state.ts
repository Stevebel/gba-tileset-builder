/* eslint-disable import/extensions */
import { property, State, storage } from '@lit-app/state';
import {
  colorToHex,
  colorToRgb,
  EMPTY_COLOR,
  hexToColor,
  rgbToColor,
} from './color-utils';
import { TILE_SIZE, ToolType } from './constants';
import {
  ColorData,
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
  selectedColors!: number[];

  @storage({ key: 'currentTool' })
  @property()
  currentTool!: ToolType;

  @storage({ key: 'lastTool' })
  @property()
  lastTool?: ToolType;

  @property({ type: String })
  replacementColor?: number;

  @storage({ key: 'viewOptions' })
  @property({ type: Object })
  viewOptions!: typeof DefaultViewOptions;

  @storage({ key: 'transparencyColor' })
  @property({ type: Object })
  transparencyColor?: number;

  @property()
  hoverColor?: number;

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
    if (this.transparencyColor == null) {
      this.transparencyColor = 0xff00ff;
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
    this.removeExcessEmptyColors(palette.index);
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
    this.tiles.map(tile => {
      if (tile.paletteIndex === index) {
        return { ...tile, paletteIndex: undefined };
      }
      return tile;
    });
  }

  selectColor(paletteIndex: number, color: number) {
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

  selectTilesByPalette(palette: TilesetPalette) {
    const colors = palette.colors.concat(palette.unassignedColors);
    this.tiles = this.tiles.map(tile => {
      const pixels = this.getPixelsForTile(tile.tileIndex);
      return {
        ...tile,
        selected:
          pixels.some(c => c !== this.transparencyColor!) &&
          pixels.every(pixel => colors.some(color => color.color === pixel)),
      };
    });
  }

  selectTilesByPaletteWithExtraColors(palette: TilesetPalette, numExtra = 1) {
    if (numExtra < 1) {
      this.selectTilesByPalette(palette);
      return;
    }
    // Create a tree of colors missing from the palette for each tile
    // Each node in the tree is a color, and each node has a count of how many tiles
    // would be selected if that color were added to the palette. The children of each
    // node are other colors that could further increase the number of selected tiles.
    interface ColorNode {
      color: number;
      tileCount: number;
      children: ColorNode[];
    }
    const includedColors = new Set(
      palette.colors.concat(palette.unassignedColors).map(c => c.color)
    );
    const colorTree: ColorNode[] = [];
    function addTileToTree(colors: number[], nodes = colorTree) {
      if (colors.length === 0) {
        return;
      }
      for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        const node = nodes.find(n => n.color === color);
        const otherColors = colors.filter((_, j) => j !== i);
        if (node) {
          if (otherColors.length > 0) {
            addTileToTree(otherColors, node.children);
          } else {
            node.tileCount++;
          }
        } else {
          const newNode: ColorNode = {
            color,
            tileCount: otherColors.length > 0 ? 0 : 1,
            children: [],
          };
          nodes.push(newNode);
          addTileToTree(otherColors, newNode.children);
        }
      }
    }
    const transparent = this.transparencyColor!;
    this.tiles
      .filter(t => t.tileIndex == null)
      .forEach(tile => {
        const pixels = this.getPixelsForTile(tile.tileIndex);
        const colors = new Set(pixels);
        const missingColors = [...colors].filter(
          c => c != null && !includedColors.has(c) && c !== transparent
        );
        if (missingColors.length > 0 && missingColors.length <= numExtra) {
          addTileToTree(missingColors);
        }
      });
    // Search the tree for the path that results in the most tiles
    // being selected.
    let maxTileCount = 0;
    let maxTileCountPath: number[] = [];
    function searchTree(
      nodes: ColorNode[],
      path: number[] = [],
      tileCount = 0
    ) {
      if (nodes.length === 0) {
        if (tileCount > maxTileCount) {
          maxTileCount = tileCount;
          maxTileCountPath = path;
        }
        return;
      }
      for (const node of nodes) {
        searchTree(
          node.children,
          path.concat(node.color),
          tileCount + node.tileCount
        );
      }
    }
    searchTree(colorTree);
    // Add the colors in the path to the palette
    const newColors = maxTileCountPath.map(color => ({
      color,
    }));
    const newPalette = {
      ...palette,
      colors: palette.colors.concat(palette.unassignedColors).concat(newColors),
    };
    this.selectTilesByPalette(newPalette);
  }

  mergeSelectedColors(color: number) {
    const [r, g, b] = colorToRgb(color);
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
          const oldColor = rgbToColor(
            oldData[i],
            oldData[i + 1],
            oldData[i + 2]
          );
          if (selectedColors.includes(oldColor)) {
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
      .map(c => colors.findIndex(cd => cd.color === c))
      .sort();
    const oldColorData = colors.filter((_, i) => replaceIndexes.includes(i));
    const newColorData: ColorData = {
      color,
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
    this.palettes = this.palettes.map(p => {
      if (p.index === paletteIndex) {
        return this.getWithoutExcessEmptyColors(p);
      }
      return p;
    });
  }

  getWithoutExcessEmptyColors(palette: TilesetPalette) {
    // Skipping the first color because it's the transparent color
    // remove empty colors and shift the rest down, moving unassigned colors up
    // to the main palette
    const colors = palette.colors.concat(palette.unassignedColors);
    const newColors = colors.filter((c, i) => i === 0 || c.usageCount);
    while (newColors.length < 16) {
      newColors.push(EMPTY_COLOR);
    }
    return {
      ...palette,
      colors: newColors.slice(0, 16),
      unassignedColors: newColors.slice(16),
    };
  }

  setTransparencyColorHex(hex: string) {
    console.log(hex);
    this.transparencyColor = hexToColor(hex);
    // Iterate through the palettes and set the first color to the transparency color and any 0 usage colors to transparency color
    this.palettes = this.palettes.map(p =>
      this.getWithoutExcessEmptyColors({
        ...p,
        colors: this.withItemFirst(
          p.colors,
          c => c.color === this.transparencyColor
        ).map(c => ({
          ...c,
          color: c.usageCount ? c.color : this.transparencyColor!,
        })),
      })
    );
  }

  withItemFirst<T>(arr: T[], predicate: (item: T) => boolean) {
    const index = arr.findIndex(predicate);
    if (index === -1) {
      return arr;
    }
    return [arr[index], ...arr.slice(0, index), ...arr.slice(index + 1)];
  }

  getTransparencyColorHex() {
    return this.transparencyColor != null
      ? colorToHex(this.transparencyColor)
      : undefined;
  }
}

export const tilesetState = new TilesetState();
