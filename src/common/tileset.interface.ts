export type RGBColor = [number, number, number];
export interface ColorData {
  color: RGBColor;
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
  pixels?: RGBColor[];
  paletteIndex?: number;
  selected?: boolean;
}

export interface Tileset {
  palettes: TilesetPalette[];
  tiles: TilesetTile[];
}
