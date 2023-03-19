import {
  TilesetDiff,
  withTileDiffApplied,
  withTileDiffUndone,
} from '../common/tile-diff.js';
import { getTilesSelectedByPaletteColors } from '../common/tile-select.js';
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
