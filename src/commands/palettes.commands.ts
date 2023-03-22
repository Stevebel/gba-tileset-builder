import { hexToColor } from '../common/color-utils.js';
import {
  TilesetDiff,
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
import { Command } from './command.interface.js';

export function addPalette(): Command<TilesetDocument> {
  let tileDiff: TilesetDiff;
  return {
    getDescription: undoing => (!undoing ? 'Added Palette' : 'Removed Palette'),
    execute: doc => {
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

      tileDiff = tilesWithSelectedSetToPaletteIndex(doc, palette.index);
      doc.tiles = withTileDiffApplied(doc.tiles, tileDiff);
    },
    undo: doc => {
      doc.palettes = doc.palettes.slice(0, doc.palettes.length - 1);
      doc.tiles = withTileDiffUndone(doc.tiles, tileDiff);
    },
  };
}

function addOrRemoveTilesFromPalette(
  paletteIndex: number,
  add = true
): Command<TilesetDocument> {
  let oldPalettes: TilesetPalette[];
  let tileDiff: TilesetDiff;
  return {
    getDescription: undoing =>
      (undoing ? !add : add)
        ? 'Added Tiles to Palette'
        : 'Removed Tiles from Palette',
    execute: doc => {
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
      oldPalettes = doc.palettes.filter(palette =>
        affectedPaletteIndexes.has(palette.index)
      );
      tileDiff = add
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
    },
    undo: doc => {
      doc.tiles = withTileDiffUndone(doc.tiles, tileDiff);
      doc.palettes = doc.palettes.map(p => {
        const oldPalette = oldPalettes.find(op => op.index === p.index);
        return oldPalette ?? p;
      });
    },
  };
}

export function addTilesToPalette(index: number): Command<TilesetDocument> {
  return addOrRemoveTilesFromPalette(index, true);
}

export function removeTilesFromPalette(
  index: number
): Command<TilesetDocument> {
  return addOrRemoveTilesFromPalette(index, false);
}

export function deletePalette(paletteIndex: number): Command<TilesetDocument> {
  let oldPalette: TilesetPalette;
  let tileDiff: TilesetDiff;
  return {
    getDescription: () => 'Deleted Palette',
    execute: doc => {
      oldPalette = doc.palettes[paletteIndex - doc.paletteIndexOffset];

      tileDiff = tilesWithPaletteIndexRemoved(doc, paletteIndex);
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
      console.log(doc.palettes);
    },
    undo: doc => {
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
    },
  };
}

export function setTransparencyColor(hex: string): Command<TilesetDocument> {
  let oldPalettes: TilesetPalette[];
  return {
    getDescription: () => 'Set Transparency Color',
    execute: doc => {
      oldPalettes = doc.palettes;
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
    },
    undo: doc => {
      doc.palettes = oldPalettes;
    },
  };
}
