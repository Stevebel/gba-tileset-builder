import { css } from 'lit';

export const COLOR_PRIMARY_BG = css`#434242`;
export const COLOR_PRIMARY_FG = css`#ccc5b9`;
export const COLOR_PRIMARY_HIGHLIGHT = css`#eb5e28`;
export const COLOR_PRIMARY_HIGHLIGHT_BG = css`#443a34`;
export const COLOR_ALT_BG = css`#74706a`;
export const COLOR_ALT_FG = css`#252422`;

export const TILE_SIZE = 8;

export type ToolInfo = {
  name: string;
  description: string;
  hideOverlay?: boolean;
};

export const TOOL_INFO = {
  select: {
    name: 'Select Tile',
    description:
      'Click to select or deselect a tile. Hold shift to select multiple tiles.',
    hideOverlay: false,
  },
  deselect: {
    name: 'Deselect Tile',
    description: 'Click to deselect a tile.',
    hideOverlay: false,
  },
  'select-box': {
    name: 'Select Rectangular Area',
    description:
      'Click and drag to select a rectangular area of tiles. Hold shift to add to the selection. Hold alt to remove from the selection.',
    hideOverlay: false,
  },
  'highlight-color': {
    name: 'Highlight Color',
    description:
      'Blinks pixels that match the colors selected in the palette for better visibility.',
    hideOverlay: false,
  },
  'merge-colors': {
    name: 'Merge Colors',
    description:
      'Opens a panel to merge colors in the palette. Select two colors in the same palette, then pick a new color to replace them with.',
    hideOverlay: true,
  },
  eyedropper: {
    name: 'Eyedropper',
    description: 'Click to select a color from the image.',
    hideOverlay: false,
  },
  'find-duplicates': {
    name: 'Find Duplicates',
    description:
      'Finds duplicate tiles in the image and highlights them. Hover over a tile to see the first copy of it highlighted.',
    hideOverlay: false,
  },
} satisfies { [key: string]: ToolInfo };

export type ToolType = keyof typeof TOOL_INFO;
