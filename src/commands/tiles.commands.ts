import {
  createDiff,
  TilesetDiff,
  withTileDiffApplied,
  withTileDiffUndone,
} from '../common/tile-diff.js';
import { getTilesSelectedByPaletteColors } from '../common/tile-select.js';
import { tileIndexToCoords } from '../common/utils.js';
import { TilesetDocument } from '../state/tileset-document.js';
import { Command } from './command.interface';

function getTileDiffCommand(
  description: string,
  getDiff: (doc: TilesetDocument) => TilesetDiff
): Command<TilesetDocument> {
  let tileDiff: TilesetDiff;
  return {
    getDescription: () => description,
    execute: doc => {
      tileDiff = getDiff(doc);
      doc.tiles = withTileDiffApplied(doc.tiles, tileDiff);
    },
    undo: doc => {
      doc.tiles = withTileDiffUndone(doc.tiles, tileDiff);
    },
  };
}

export function selectTilesByPaletteColors(
  paletteIndex: number,
  numExtra = 0
): Command<TilesetDocument> {
  return getTileDiffCommand('Selected Tiles by Palette Colors', doc =>
    getTilesSelectedByPaletteColors(doc, paletteIndex, numExtra)
  );
}

export function addOrRemoveTileFromSelection(
  tileIndex: number,
  selectMultiple = false,
  deselect = false
): Command<TilesetDocument> {
  return getTileDiffCommand('Add or Remove Tile from Selection', doc => {
    const newTiles = doc.tiles.map((tile, i) => {
      if (selectMultiple) {
        if (i === tileIndex) {
          return { ...tile, selected: !deselect };
        }
        return tile;
      }
      return { ...tile, selected: i === tileIndex ? !deselect : false };
    });
    return createDiff(doc.tiles, newTiles);
  });
}

export function selectTilesInBox(
  startTile: { x: number; y: number },
  endTile: { x: number; y: number },
  remove = false,
  add = false
): Command<TilesetDocument> {
  return getTileDiffCommand('Select Tiles in Box', doc => {
    const minX = Math.min(startTile.x, endTile.x);
    const maxX = Math.max(startTile.x, endTile.x) - 1;
    const minY = Math.min(startTile.y, endTile.y);
    const maxY = Math.max(startTile.y, endTile.y) - 1;
    const newTiles = doc.tiles.map(tile => {
      const { x, y } = tileIndexToCoords(tile.tileIndex, doc.tilesWide);
      const inBox = x >= minX && x <= maxX && y >= minY && y <= maxY;
      return {
        ...tile,
        selected:
          (!remove && add && tile.selected) ||
          (!remove && inBox) ||
          (remove && !inBox && tile.selected),
      };
    });
    return createDiff(doc.tiles, newTiles);
  });
}
