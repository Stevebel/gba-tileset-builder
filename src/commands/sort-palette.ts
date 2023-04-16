import { colorToCoords } from '../common/color-utils.js';
import { TilesetPalette } from '../common/tileset.interface';

type Coords = [number, number, number];

type ColorNode = {
  coords: Coords;
  color?: number;
  children?: ColorNode[];
};

function getDistanceSquared(coords1: Coords, coords2: Coords): number {
  return (
    (coords1[0] - coords2[0]) ** 2 +
    (coords1[1] - coords2[1]) ** 2 +
    (coords1[2] - coords2[2]) ** 2
  );
}

function flipNodesIfNeededToImproveOrder(
  node1: ColorNode,
  node2: ColorNode
): [ColorNode, ColorNode] {
  const leftMost = node1.children ? node1.children[0] : node1;
  const rightMost = node2.children
    ? node2.children[node2.children.length - 1]
    : node2;
  const middleLeft = node1.children
    ? node1.children[node1.children.length - 1]
    : node1;
  const middleRight = node2.children ? node2.children[0] : node2;

  const distance = getDistanceSquared(middleLeft.coords, middleRight.coords);
  const flippedDistance = getDistanceSquared(leftMost.coords, rightMost.coords);

  if (flippedDistance < distance) {
    return [node2, node1];
  }
  return [node1, node2];
}

function getClosestPair(colorNodes: ColorNode[]): [ColorNode, ColorNode] {
  let minDistance = Infinity;
  let closestPair: [ColorNode, ColorNode] = [colorNodes[0], colorNodes[1]];
  for (let i = 0; i < colorNodes.length; i++) {
    const node1 = colorNodes[i];
    for (let j = i + 1; j < colorNodes.length; j++) {
      const node2 = colorNodes[j];
      const distance = getDistanceSquared(node1.coords, node2.coords);
      if (distance < minDistance) {
        minDistance = distance;
        closestPair = [node1, node2];
      }
    }
  }
  return flipNodesIfNeededToImproveOrder(closestPair[0], closestPair[1]);
}

function getAverageCoords(node1: ColorNode, node2: ColorNode): Coords {
  let sum = [0, 0, 0];
  let count = 0;
  if (node1.children) {
    sum = sum.map(
      (s, i) => s + node1.children!.reduce((a, b) => a + b.coords[i], 0)
    );
    count += node1.children.length;
  } else {
    sum = sum.map((s, i) => s + node1.coords[i]);
    count++;
  }
  if (node2.children) {
    sum = sum.map(
      (s, i) => s + node2.children!.reduce((a, b) => a + b.coords[i], 0)
    );
    count += node2.children.length;
  } else {
    sum = sum.map((s, i) => s + node2.coords[i]);
    count++;
  }
  return sum.map(s => s / count) as Coords;
}

function flattenChildren(nodes: ColorNode[]): ColorNode[] {
  return nodes.reduce((acc, node) => {
    if (node.children) {
      return [...acc, ...flattenChildren(node.children)];
    }
    return [...acc, node];
  }, [] as ColorNode[]);
}

export function getSortedPalette(palette: TilesetPalette): TilesetPalette {
  if (palette.colors.length < 2) {
    return palette;
  }
  // Map colors to coordinates, skipping the first color which is the transparent color
  let colorNodes: ColorNode[] = palette.colors
    .slice(1)
    .concat(palette.unassignedColors)
    .map(color => ({
      coords: colorToCoords(color.color),
      color: color.color,
    }));
  // Shuffle the colors using the Fisher-Yates algorithm
  for (let i = colorNodes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colorNodes[i], colorNodes[j]] = [colorNodes[j], colorNodes[i]];
  }
  // Iteratively combine the two closest colors until there is only one node left
  while (colorNodes.length > 1) {
    const [node1, node2] = getClosestPair(colorNodes);
    const newNode: ColorNode = {
      coords: getAverageCoords(node1, node2),
      children: flattenChildren([node1, node2]),
    };
    // Remove the two closest nodes and add the new node at the index of the first node
    const indexNode1 = colorNodes.findIndex(n => n === node1);
    const indexNode2 = colorNodes.findIndex(n => n === node2);
    const [firstIndex, secondIndex] =
      indexNode1 < indexNode2
        ? [indexNode1, indexNode2]
        : [indexNode2, indexNode1];
    colorNodes = [
      ...colorNodes.slice(0, firstIndex),
      ...(firstIndex === indexNode1 ? [newNode] : []),
      ...colorNodes.slice(firstIndex + 1, secondIndex),
      ...(secondIndex === indexNode1 ? [newNode] : []),
      ...colorNodes.slice(secondIndex + 1),
    ];
  }
  const sortedColors = colorNodes[0].children!.map(node => node.color!);
  const allColors = [
    palette.colors[0],
    ...sortedColors.map(color => {
      let colorIndex = palette.colors.findIndex(c => c.color === color);
      if (colorIndex === -1) {
        colorIndex = palette.unassignedColors.findIndex(c => c.color === color);
        return palette.unassignedColors[colorIndex];
      }
      return palette.colors[colorIndex];
    }),
  ];

  return {
    ...palette,
    colors: allColors.slice(0, 16),
    unassignedColors: allColors.slice(16),
  };
}
