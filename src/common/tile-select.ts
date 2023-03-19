import { TilesetTile } from '../common/tileset.interface';
import { TilesetDocument } from '../state/tileset-document.js';
import { selectTilesByPaletteColorsSimple as getTilesSelectedByPaletteColorsSimple } from './tile-diff.js';

export function getTilesByPaletteIndex(
  doc: TilesetDocument,
  paletteIndex: number | undefined
): TilesetTile[] {
  return doc.tiles.filter(tile => tile.paletteIndex === paletteIndex);
}

interface ColorNode {
  color: number;
  tileCount: number;
  children: ColorNode[];
}

function createColorTree(
  doc: TilesetDocument,
  includedColors: Set<number>,
  numExtra = 1
) {
  // Create a tree of colors missing from the palette for each tile
  // Each node in the tree is a color, and each node has a count of how many tiles
  // would be selected if that color were added to the palette. The children of each
  // node are other colors that could further increase the number of selected tiles.
  const colorTree: ColorNode[] = [];
  function addTileToTree(colors: number[], nodes = colorTree) {
    if (colors.length === 0) {
      return;
    }
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const node = nodes.find(n => n.color === color);
      const otherColors = colors.filter((_, j) => j !== i);
      if (node) {
        if (otherColors.length > 0) {
          addTileToTree(otherColors, node.children);
        } else {
          node.tileCount++;
        }
      } else {
        const newNode: ColorNode = {
          color,
          tileCount: otherColors.length > 0 ? 0 : 1,
          children: [],
        };
        nodes.push(newNode);
        addTileToTree(otherColors, newNode.children);
      }
    }
  }
  const transparent = doc.transparencyColor!;
  doc.tiles
    .filter(t => t.tileIndex == null)
    .forEach(tile => {
      const pixels = doc.getPixelsForTile(tile.tileIndex);
      const colors = new Set(pixels);
      const missingColors = [...colors].filter(
        c => c != null && !includedColors.has(c) && c !== transparent
      );
      if (missingColors.length > 0 && missingColors.length <= numExtra) {
        addTileToTree(missingColors);
      }
    });
  return colorTree;
}

function searchTree(
  nodes: ColorNode[],
  path: number[] = [],
  tileCount = 0,
  maxTileCount = 0,
  maxTileCountPath: number[] = []
) {
  if (nodes.length === 0) {
    if (tileCount > maxTileCount) {
      maxTileCount = tileCount;
      maxTileCountPath = path;
    }
    return { maxTileCount, maxTileCountPath };
  }
  for (const node of nodes) {
    const result = searchTree(
      node.children,
      path.concat(node.color),
      tileCount + node.tileCount
    );
    maxTileCount = result.maxTileCount;
    maxTileCountPath = result.maxTileCountPath;
  }
  return { maxTileCount, maxTileCountPath };
}

export function getTilesSelectedByPaletteColors(
  doc: TilesetDocument,
  paletteIndex: number,
  numExtra = 0
) {
  if (numExtra <= 0) {
    return getTilesSelectedByPaletteColorsSimple(
      doc,
      doc.palettes[paletteIndex]
    );
  }
  const palette = doc.palettes[paletteIndex!];
  const includedColors = new Set(
    palette.colors.concat(palette.unassignedColors).map(c => c.color)
  );
  const colorTree = createColorTree(doc, includedColors, numExtra);
  const { maxTileCountPath } = searchTree(colorTree);

  // Add the colors in the path to the palette
  const newColors = maxTileCountPath.map(color => ({
    color,
  }));
  const newPalette = {
    ...palette,
    colors: palette.colors.concat(palette.unassignedColors).concat(newColors),
  };
  return getTilesSelectedByPaletteColorsSimple(doc, newPalette);
}
