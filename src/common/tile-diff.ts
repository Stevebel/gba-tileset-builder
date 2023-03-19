import { applyPatch, compare } from 'fast-json-patch';
import { Operation } from 'fast-json-patch/module/core.js';
import { TilesetDocument } from '../state/tileset-document.js';
import { TilesetPalette, TilesetTile } from './tileset.interface';

// TODO: More intelligent diffing
export type TilesetDiff = {
  operations: Operation[];
  applied: boolean;
};

function createDiff(
  oldTiles: TilesetTile[],
  newTiles: TilesetTile[]
): TilesetDiff {
  return {
    operations: compare(oldTiles, newTiles),
    applied: false,
  };
}

export function withTileDiffApplied(
  tiles: TilesetTile[],
  tileDiff: TilesetDiff
): TilesetTile[] {
  const newTiles = applyPatch(
    tiles,
    tileDiff.operations,
    false,
    false
  ).newDocument;
  tileDiff.applied = true;
  tileDiff.operations = createDiff(newTiles, tiles).operations;
  return newTiles;
}

export function withTileDiffUndone(
  tiles: TilesetTile[],
  diff: TilesetDiff
): TilesetTile[] {
  if (!diff.applied) {
    throw new Error('Cannot undo a diff that has not been applied');
  }
  const newTiles = applyPatch(tiles, diff.operations, false, false).newDocument;
  return newTiles;
}

export function tilesWithSelectedSetToPaletteIndex(
  doc: TilesetDocument,
  paletteIndex: number
): TilesetDiff {
  return createDiff(
    doc.tiles,
    doc.tiles.map(tile =>
      tile.selected
        ? {
            ...tile,
            paletteIndex,
          }
        : tile
    )
  );
}

export function tilesWithSelectedRemovedFromPaletteIndex(
  doc: TilesetDocument,
  paletteIndex: number
): TilesetDiff {
  return createDiff(
    doc.tiles,
    doc.tiles.map(tile =>
      tile.selected && tile.paletteIndex === paletteIndex
        ? {
            ...tile,
            paletteIndex: undefined,
          }
        : tile
    )
  );
}

/**
 * Returns a new array of tiles with the given palette index removed.
 * Any tiles that have the given palette index will have their paletteIndex set to undefined.
 * Any tiles that have a palette index greater than the given palette index will have their paletteIndex decremented by 1.
 */
export function tilesWithPaletteIndexRemoved(
  doc: TilesetDocument,
  paletteIndex: number
): TilesetDiff {
  return createDiff(
    doc.tiles,
    doc.tiles.map(tile => {
      if (tile.paletteIndex === paletteIndex) {
        return {
          ...tile,
          paletteIndex: undefined,
        };
      }
      if (tile.paletteIndex && tile.paletteIndex > paletteIndex) {
        return {
          ...tile,
          paletteIndex: tile.paletteIndex - 1,
        };
      }
      return tile;
    })
  );
}

export function selectTilesByPaletteColorsSimple(
  doc: TilesetDocument,
  palette: TilesetPalette
): TilesetDiff {
  const colors = palette.colors.concat(palette.unassignedColors);
  return createDiff(
    doc.tiles,
    doc.tiles.map(tile => {
      const pixels = doc.getPixelsForTile(tile.tileIndex);
      return {
        ...tile,
        selected:
          pixels.some(c => c !== doc.transparencyColor!) &&
          pixels.every(pixel => colors.some(color => color.color === pixel)),
      };
    })
  );
}
