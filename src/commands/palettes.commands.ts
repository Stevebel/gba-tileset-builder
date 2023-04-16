import { hexToColor } from '../common/color-utils.js';
import {
  tilesWithPaletteIndexRemoved,
  tilesWithSelectedRemovedFromPaletteIndex,
  tilesWithSelectedSetToPaletteIndex,
  withTileDiffApplied,
  withTileDiffUndone,
} from '../common/tile-diff.js';
import { getTilesByPaletteIndex } from '../common/tile-select.js';
import { TilesetPalette } from '../common/tileset.interface';
import { withItemFirst } from '../common/utils.js';
import {
  getUpdatedPaletteBasedOnTiles,
  getWithoutExcessEmptyColors,
} from '../palette/palette-utils.js';
import { editorState } from '../state/editor-state.js';
import { TilesetDocument } from '../state/tileset-document.js';
import { createHandler } from './command.interface.js';
import { getSortedPalette } from './sort-palette.js';

const addPalette = createHandler<TilesetDocument>()
  .withExecute(doc => {
    const selectedTiles = doc.tiles?.filter(tile => tile.selected);

    const paletteIndex = doc.palettes.length;
    const palette = {
      index: paletteIndex + doc.paletteIndexOffset,
      colors: [],
      unassignedColors: [],
    };
    doc.palettes = [
      ...doc.palettes,
      getUpdatedPaletteBasedOnTiles(palette, selectedTiles),
    ];

    const tileDiff = tilesWithSelectedSetToPaletteIndex(doc, palette.index);
    doc.tiles = withTileDiffApplied(doc.tiles, tileDiff);
    return tileDiff;
  })
  .withUndo((doc, tileDiff) => {
    doc.palettes = doc.palettes.slice(0, doc.palettes.length - 1);
    doc.tiles = withTileDiffUndone(doc.tiles, tileDiff);
  })
  .withDescription(() => 'Add Palette');

const addOrRemoveTilesFromPalette = createHandler<TilesetDocument>()
  .withExecute((doc, paletteIndex: number, add: boolean) => {
    const affectedPaletteIndexes = add
      ? new Set(
          editorState.currentDocument.tiles
            ?.filter(
              tile => tile.selected && tile.paletteIndex !== paletteIndex
            )
            .map(tile => tile.paletteIndex)
            .filter(index => index != null) as number[]
        )
      : new Set();
    affectedPaletteIndexes.add(paletteIndex);
    const oldPalettes = doc.palettes.filter(palette =>
      affectedPaletteIndexes.has(palette.index)
    );
    const tileDiff = add
      ? tilesWithSelectedSetToPaletteIndex(doc, paletteIndex)
      : tilesWithSelectedRemovedFromPaletteIndex(doc, paletteIndex);
    doc.tiles = withTileDiffApplied(doc.tiles, tileDiff);

    doc.palettes = doc.palettes.map(palette => {
      if (affectedPaletteIndexes.has(palette.index)) {
        return getUpdatedPaletteBasedOnTiles(
          palette,
          getTilesByPaletteIndex(doc, palette.index)
        );
      }
      return palette;
    });
    return { oldPalettes, tileDiff };
  })
  .withUndo((doc, { oldPalettes, tileDiff }) => {
    doc.tiles = withTileDiffUndone(doc.tiles, tileDiff);
    doc.palettes = doc.palettes.map(p => {
      const oldPalette = (oldPalettes as TilesetPalette[]).find(
        op => op.index === p.index
      );
      return oldPalette ?? p;
    });
  })
  .withDescription((_, add) =>
    add ? 'Add Tiles to Palette' : 'Remove Tiles from Palette'
  );

const deletePalette = createHandler<TilesetDocument>()
  .withExecute((doc, paletteIndex: number) => {
    const oldPalette = doc.palettes[paletteIndex - doc.paletteIndexOffset];

    const tileDiff = tilesWithPaletteIndexRemoved(doc, paletteIndex);
    doc.tiles = withTileDiffApplied(doc.tiles, tileDiff);

    doc.palettes = doc.palettes
      .filter(p => p.index !== paletteIndex)
      .map(p => {
        if (p.index > paletteIndex) {
          return {
            ...p,
            index: p.index - 1,
          };
        }
        return p;
      });
    return { oldPalette, tileDiff };
  })
  .withUndo((doc, { oldPalette, tileDiff }, paletteIndex) => {
    const idx = paletteIndex - doc.paletteIndexOffset;
    doc.palettes = [
      ...doc.palettes.slice(0, idx),
      oldPalette,
      ...doc.palettes.slice(idx).map(p => ({
        ...p,
        index: p.index + 1,
      })),
    ];
    doc.tiles = withTileDiffUndone(doc.tiles, tileDiff);
  })
  .withDescription(() => 'Delete Palette');

export const paletteCommands = editorState.commands({
  namespace: 'palette',
  handlers: {
    addPalette,
    addOrRemoveTilesFromPalette,
    deletePalette,
    setTransparencyColor: createHandler<TilesetDocument>()
      .withExecute((doc, hex: string) => {
        const oldPalettes = doc.palettes;
        doc.transparencyColor = hexToColor(hex);
        doc.palettes = doc.palettes.map(p =>
          getWithoutExcessEmptyColors({
            ...p,
            colors: withItemFirst(
              p.colors,
              c => c.color === doc.transparencyColor
            ).map(c => ({
              ...c,
              color: c.usageCount ? c.color : doc.transparencyColor!,
            })),
          })
        );
        return oldPalettes;
      })
      .withUndo((doc, oldPalettes) => {
        doc.palettes = oldPalettes;
      })
      .withDescription(() => 'Set Transparency Color'),
    sortPalette: createHandler<TilesetDocument>()
      .withExecute((doc, paletteIndex: number) => {
        const idx = paletteIndex - doc.paletteIndexOffset;
        const oldPalette = doc.palettes[idx];
        doc.palettes = doc.palettes.map(p => {
          if (p.index === paletteIndex) {
            return getSortedPalette(p);
          }
          return p;
        });
        return oldPalette;
      })
      .withUndo((doc, oldPalette) => {
        const idx = oldPalette.index - doc.paletteIndexOffset;
        doc.palettes = [
          ...doc.palettes.slice(0, idx),
          oldPalette,
          ...doc.palettes.slice(idx + 1),
        ];
      })
      .withDescription(index => `Sort Palette ${index}`),
  },
});
