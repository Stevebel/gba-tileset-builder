import {
  createDiff,
  TilesetDiff,
  withTileDiffApplied,
  withTileDiffUndone,
} from '../common/tile-diff.js';
import { getTilesSelectedByPaletteColors } from '../common/tile-select.js';
import { tileIndexToCoords } from '../common/utils.js';
import { editorState } from '../state/editor-state.js';
import { TilesetDocument } from '../state/tileset-document.js';
import { createHandler } from './command.interface';

function getTileDiffHandler<P extends any[]>(
  description: string,
  getDiff: (doc: TilesetDocument, ...p: P) => TilesetDiff
) {
  return (
    createHandler<TilesetDocument>()
      .withExecute((doc, ...p: P) => {
        const tileDiff = getDiff(doc, ...p);
        doc.tiles = withTileDiffApplied(doc.tiles, tileDiff);
        return tileDiff;
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .withUndo((doc, tileDiff, ...p: P) => {
        doc.tiles = withTileDiffUndone(doc.tiles, tileDiff);
      })
      .withDescription(() => description)
  );
}

export const tileCommands = editorState.commands({
  namespace: 'tiles',
  handlers: {
    selectTilesByPaletteColors: getTileDiffHandler(
      'Select Tiles by Palette Colors',
      (doc, paletteIndex: number, numExtra = 0) =>
        getTilesSelectedByPaletteColors(doc, paletteIndex, numExtra)
    ),
    addOrRemoveTilesFromSelection: getTileDiffHandler(
      'Add or Remove Tiles from Selection',
      (doc, tileIndex: number, selectMultiple = false, deselect = false) => {
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
      }
    ),
    selectTilesInBox: getTileDiffHandler(
      'Select Tiles in Box',
      (
        doc,
        startTile: { x: number; y: number },
        endTile: { x: number; y: number },
        remove = false,
        add = false
      ) => {
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
      }
    ),
  },
});
