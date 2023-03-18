import { StateController } from '@lit-app/state';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../color-picker.js';
import { baseCss, buttonStyles } from '../common/base-css.js';
import { EMPTY_COLOR } from '../common/color-utils.js';
import {
  COLOR_PRIMARY_BG,
  COLOR_PRIMARY_FG,
  COLOR_PRIMARY_HIGHLIGHT,
} from '../common/constants.js';
import { tilesetState } from '../common/tileset-state.js';
import {
  ColorData,
  TilesetPalette,
  TilesetTile,
} from '../common/tileset.interface.js';
import './palette-editor.js';

@customElement('palette-panel')
export class MenuBar extends LitElement {
  static styles = [
    buttonStyles,
    css`
      :host {
        background: ${COLOR_PRIMARY_BG};
        color: ${COLOR_PRIMARY_FG};
        padding: 10px;
        box-shadow: 3px 0 10px rgba(0, 0, 0, 0.5);
        z-index: 10;
        min-width: 300px;
        width: 300px;
        overflow: auto;
        max-height: calc(100vh - 100px);
      }

      .transparency-color {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .eye-dropper {
        cursor: pointer;
      }
      .eye-dropper:hover {
        color: ${COLOR_PRIMARY_HIGHLIGHT};
      }
    `,
  ];

  ctrl = new StateController(this, tilesetState);

  tilesWithNoPaletteSelected() {
    return (
      tilesetState.tiles?.some(
        tile => tile.selected && tile.paletteIndex == null
      ) &&
      !tilesetState.tiles?.some(
        tile => tile.selected && tile.paletteIndex != null
      )
    );
  }

  paletteHasTilesToAdd(palette: TilesetPalette) {
    return tilesetState.tiles?.some(
      tile => tile.selected && tile.paletteIndex !== palette.index
    );
  }

  paletteHasTilesToRemove(palette: TilesetPalette) {
    return tilesetState.tiles?.some(
      tile => tile.selected && tile.paletteIndex === palette.index
    );
  }

  updatePaletteToMatchTiles(
    palette: TilesetPalette,
    tiles: TilesetTile[]
  ): TilesetPalette {
    const colorCounts = new Map<number, number>();
    const colors: number[] = [];

    tiles?.forEach(tile => {
      tilesetState.getPixelsForTile(tile.tileIndex).forEach(pixel => {
        const count = colorCounts.get(pixel) || 0;
        if (count === 0) {
          colors.push(pixel);
        }
        colorCounts.set(pixel, count + 1);
      });
    });
    const tileColorData: ColorData[] = colors
      .map(color => {
        const count = colorCounts.get(color) || 0;
        return {
          color,
          usageCount: count,
        };
      })
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    const colorData: (ColorData | null)[] = [];
    palette.colors?.forEach(color => {
      const tileColor = tileColorData.find(c => c.color === color.color);
      if (tileColor) {
        colorData.push(tileColor);
        tileColorData.splice(tileColorData.indexOf(tileColor), 1);
      } else {
        colorData.push(null);
      }
    });
    if (
      colorData.length === 0 ||
      colorData[0]?.color !== tilesetState.transparencyColor!
    ) {
      colorData.unshift({
        color: tilesetState.transparencyColor!,
        usageCount: 0,
      });
    }
    colorData.forEach((color, i) => {
      if (color == null) {
        colorData[i] = tileColorData.shift() || EMPTY_COLOR;
      }
    });
    while (colorData.length < 16) {
      colorData.push(tileColorData.shift() || EMPTY_COLOR);
    }

    return tilesetState.updatePalette({
      index: palette.index,
      colors: colorData as ColorData[],
      unassignedColors: tileColorData,
    });
  }

  addPalette() {
    const selectedTiles = tilesetState.tiles?.filter(tile => tile.selected);

    const palette = tilesetState.addPalette([]);
    tilesetState.palettes![palette.index] = this.updatePaletteToMatchTiles(
      palette,
      selectedTiles
    );
    tilesetState.changeSelectedTilesPalette(palette.index);
  }

  addTilesToPalette(e: CustomEvent) {
    const { paletteIndex } = e.detail;
    const affectedPaletteIndexes = new Set(
      tilesetState.tiles
        ?.filter(tile => tile.selected && tile.paletteIndex !== paletteIndex)
        .map(tile => tile.paletteIndex)
        .filter(index => index != null) as number[]
    );
    affectedPaletteIndexes.add(paletteIndex);
    tilesetState.changeSelectedTilesPalette(paletteIndex);
    affectedPaletteIndexes.forEach(index => {
      const paletteTiles = tilesetState.tiles?.filter(
        tile => tile.paletteIndex === index
      );
      tilesetState.palettes![index] = this.updatePaletteToMatchTiles(
        tilesetState.palettes![index],
        paletteTiles
      );
    });
  }

  removeTilesFromPalette(e: CustomEvent) {
    const { paletteIndex } = e.detail;
    tilesetState.tiles = tilesetState.tiles?.map(tile =>
      tile.selected && tile.paletteIndex === paletteIndex
        ? { ...tile, paletteIndex: undefined }
        : tile
    );
    const paletteTiles = tilesetState.tiles?.filter(
      tile => tile.paletteIndex === paletteIndex
    );
    tilesetState.palettes![paletteIndex] = this.updatePaletteToMatchTiles(
      tilesetState.palettes![paletteIndex],
      paletteTiles
    );
  }

  protected firstUpdated() {}

  deletePalette(e: CustomEvent) {
    const { paletteIndex } = e.detail;
    tilesetState.deletePalette(paletteIndex);
  }

  changeTransparencyColor(e: CustomEvent) {
    tilesetState.setTransparencyColorHex(e.detail);
  }

  selectEyedropper() {
    tilesetState.lastTool = tilesetState.currentTool;
    tilesetState.currentTool = 'eyedropper';
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <div class="overall-actions">
        <div class="transparency-color">
          <lch-color-picker
            .color=${tilesetState.getTransparencyColorHex()}
            @color-change=${this.changeTransparencyColor}
          ></lch-color-picker>
          <!-- Eye dropper -->
          <div class="eye-dropper" @click=${this.selectEyedropper}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 60 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <path
                  xmlns="http://www.w3.org/2000/svg"
                  d="M8.212,49.758c-0.391-0.391-1.023-0.391-1.414,0l-2.5,2.5c-0.856,0.855-1.328,1.995-1.328,3.207   c0,1.211,0.472,2.351,1.328,3.207S6.293,60,7.505,60c1.211,0,2.351-0.472,3.207-1.328c1.768-1.77,1.768-4.646,0-6.414L8.212,49.758   z"
                  fill="currentColor"
                />
                <path
                  xmlns="http://www.w3.org/2000/svg"
                  d="M55.164,10.403c2.243-2.245,2.498-5.845,0.578-8.196C54.598,0.805,52.901,0,51.087,0c-1.606,0-3.112,0.622-4.242,1.751   l-3.526,3.527c-1.119,1.119-3.069,1.119-4.187,0l-0.583-0.583c-0.839-0.837-2.299-0.837-3.134,0.001L31.48,8.632   c-0.419,0.419-0.649,0.976-0.649,1.567c0,0.593,0.23,1.149,0.649,1.568l1.968,1.968L18.183,29l-0.999,0.999   c-1.562,1.562-2.727,3.501-3.395,5.688c-0.258,0.845-0.623,1.655-1.066,2.418c-0.028,0.048-0.048,0.099-0.076,0.146   c-0.022,0.036-0.05,0.069-0.072,0.105c-0.224,0.363-0.462,0.718-0.724,1.055c-0.289,0.37-0.6,0.723-0.932,1.055l-4.413,4.413   l5.656,5.656l4.375-4.374c1.354-1.353,3.037-2.355,4.87-2.898c1.289-0.383,2.501-0.979,3.618-1.721   c0.748-0.496,1.46-1.046,2.097-1.683L37.982,29h0l5.366-5.365l1.967,1.967c0.419,0.42,0.976,0.65,1.568,0.65   c0.592,0,1.148-0.23,1.567-0.649l3.936-3.936c0.864-0.864,0.864-2.271,0-3.136l-0.581-0.581c-0.56-0.56-0.867-1.303-0.867-2.094   s0.308-1.534,0.867-2.093L55.164,10.403z M35.153,29H21.011l13.851-13.851l7.071,7.071L35.153,29z"
                  fill="currentColor"
                />
              </g>
            </svg>
          </div>
        </div>
        <button class="btn btn-primary" @click="${this.addPalette}">
          Add
          Palette${this.tilesWithNoPaletteSelected() ? ' From Selected' : ''}
        </button>
      </div>
      <div class="palettes">
        ${tilesetState.palettes?.map(
          palette => html`
            <palette-editor
              .palette="${palette}"
              ?hasTilesToAdd="${this.paletteHasTilesToAdd(palette)}"
              ?hasTilesToRemove="${this.paletteHasTilesToRemove(palette)}"
              @add-tiles="${this.addTilesToPalette}"
              @remove-tiles="${this.removeTilesFromPalette}"
              @delete-palette="${this.deletePalette}"
            >
            </palette-editor>
          `
        )}
      </div>
    `;
  }
}
