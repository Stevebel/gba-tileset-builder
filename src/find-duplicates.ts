import { TILE_SIZE } from './common/constants.js';
import { TilesetTile } from './common/tileset.interface';
import { editorState } from './state/editor-state.js';

export function watchForFindDuplicates() {
  return editorState.toolChange
    .filter(tool => tool === 'find-duplicates')
    .subscribe(() => {
      const doc = editorState.currentDocument;
      const { tiles } = doc;
      const uniqueTiles = new Map<string, TilesetTile>();

      if (doc.imageCanvas == null) {
        setTimeout(() => editorState.selectTool('find-duplicates'), 100);
        return;
      }

      function getHashForPixels(pixels: number[]) {
        return pixels.join(',');
      }
      function getIndexedTilePixels(tile: TilesetTile) {
        const tilePixels = doc.getPixelsForTile(tile.tileIndex);
        const palette = doc.palettes[tile.paletteIndex!].colors;
        return tilePixels.map(pixel => {
          const idx = palette.findIndex(c => c.color === pixel);
          return idx === -1 ? 0 : idx;
        });
      }
      function flipHorizontal(pixels: number[]) {
        const flipped = [];
        for (let i = 0; i < pixels.length; i += TILE_SIZE) {
          flipped.push(...pixels.slice(i, i + TILE_SIZE).reverse());
        }
        return flipped;
      }
      function flipVertical(pixels: number[]) {
        const flipped = [];
        for (let i = 0; i < pixels.length; i += TILE_SIZE) {
          flipped.unshift(...pixels.slice(i, i + TILE_SIZE));
        }
        return flipped;
      }

      tiles.forEach(tile => {
        if (tile.paletteIndex == null) {
          return;
        }
        const pixels = getIndexedTilePixels(tile);
        const hash = getHashForPixels(pixels);
        const existingTile = uniqueTiles.get(hash)!;
        if (existingTile) {
          tile.duplicateIndex = existingTile.tileIndex;
          return;
        }
        const flippedHorizontal = flipHorizontal(pixels);
        const flippedVertical = flipVertical(pixels);
        const flippedBoth = flipHorizontal(flippedVertical);

        uniqueTiles.set(getHashForPixels(pixels), tile);
        uniqueTiles.set(getHashForPixels(flippedHorizontal), tile);
        uniqueTiles.set(getHashForPixels(flippedVertical), tile);
        uniqueTiles.set(getHashForPixels(flippedBoth), tile);
      });
      doc.tiles = [...tiles];
    });
}
