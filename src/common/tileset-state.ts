import { property, State, storage } from '@lit-app/state';
import {
  ColorData,
  Tileset,
  TilesetPalette,
  TilesetTile,
} from './tileset.interface';

class TilesetState extends State implements Tileset {
  @property({ type: Array }) tiles: TilesetTile[] = [];

  @storage({ key: 'palettes' })
  @property({ type: Array })
  palettes!: TilesetPalette[];

  constructor() {
    super();
    this.palettes =
      this.palettes?.filter(
        p => p.colors.length > 0 || p.unassignedColors.length > 0
      ) || [];
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
    this.palettes = this.palettes.filter((_, i) => i !== index);
  }
}

export const tilesetState = new TilesetState();
