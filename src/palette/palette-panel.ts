import { StateController } from '@lit-app/state';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../color-picker.js';
import { baseCss, buttonStyles } from '../common/base-css.js';
import { colorsAreEqual, EMPTY_COLOR } from '../common/color-utils.js';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from '../common/constants.js';
import { tilesetState } from '../common/tileset-state.js';
import {
  ColorData,
  RGBColor,
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
    const colorCounts = new Map<string, number>();
    const colors: RGBColor[] = [];

    tiles?.forEach(tile => {
      tile.pixels?.forEach(pixel => {
        const color = pixel.join(',');
        const count = colorCounts.get(color) || 0;
        if (count === 0) {
          colors.push(pixel);
        }
        colorCounts.set(color, count + 1);
      });
    });
    const tileColorData: ColorData[] = colors
      .map(color => {
        const colorStr = color.join(',');
        const count = colorCounts.get(colorStr) || 0;
        return {
          color,
          usageCount: count,
        };
      })
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    const colorData: (ColorData | null)[] = [];
    palette.colors?.forEach(color => {
      const tileColor = tileColorData.find(c =>
        colorsAreEqual(c.color, color.color)
      );
      if (tileColor) {
        colorData.push(tileColor);
        tileColorData.splice(tileColorData.indexOf(tileColor), 1);
      } else {
        colorData.push(null);
      }
    });
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

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <div class="overall-actions">
        <lch-color-picker
          .color=${tilesetState.getTransparencyColorHex()}
          @color-change=${this.changeTransparencyColor}
        ></lch-color-picker>
        <!-- TODO: Eye dropper -->
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
