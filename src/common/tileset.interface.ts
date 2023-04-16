export interface ColorData {
  color: number;
  index?: number;
  usageCount?: number;
}

export interface TilesetPalette {
  index: number;
  colors: ColorData[];
  unassignedColors: ColorData[];
}

export interface TilesetTile {
  tileIndex: number;
  paletteIndex?: number;
  selected?: boolean;
  duplicateIndex?: number;
  outputIndex?: number;
}

export interface Tileset {
  palettes: TilesetPalette[];
  tiles: TilesetTile[];
}
