import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { paletteCommands } from '../commands/palettes.commands.js';
import { tileCommands } from '../commands/tiles.commands.js';
import { baseCss, buttonStyles } from '../common/base-css.js';
import {
  colorToHex,
  sortIndexesByColorDistance,
} from '../common/color-utils.js';
import {
  COLOR_ALT_BG,
  COLOR_PRIMARY_BG,
  COLOR_PRIMARY_FG,
  COLOR_PRIMARY_HIGHLIGHT,
  COLOR_PRIMARY_HIGHLIGHT_BG,
} from '../common/constants.js';
import { ColorData, TilesetPalette } from '../common/tileset.interface.js';
import { editorState } from '../state/editor-state.js';
import { TilesetDocumentStateController } from '../state/tileset-document-state-controller.js';

@customElement('palette-editor')
export class PaletteEditor extends LitElement {
  static styles = [
    buttonStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        border: 2px solid ${COLOR_PRIMARY_FG};
        border-radius: 5px;
        padding: 5px;
        margin: 10px 0;
        box-shadow: 2px 3px 5px rgba(0, 0, 0, 0.7);
      }
      .title {
        font-size: 18px;
        padding-bottom: 10px;
        color: ${COLOR_PRIMARY_BG};
        background: ${COLOR_PRIMARY_FG};
        border-radius: 3px 3px 0px 0px;
        margin: -5px;
        margin-bottom: 6px;
        padding: 5px;
      }

      .selected .title {
        background: ${COLOR_PRIMARY_HIGHLIGHT};
        color: ${COLOR_PRIMARY_HIGHLIGHT_BG};
      }

      .colors {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        justify-items: center;
      }
      .color,
      .color-outer {
        width: 24px;
        height: 24px;
      }
      .color {
        pointer-events: none;
      }
      .color-outer {
        border: 1px solid #000;
        margin: 3px;
        transition: all 0.075s ease-in-out;
      }
      .color-outer.hover {
        border: 3px solid #fff;
        margin: 0px;
      }
      .color-outer.nearest {
        border: 2px solid #ddd;
        margin: 1px;
      }
      .color-outer.nearest-2 {
        border: 2px solid #bbb;
        margin: 1px;
      }
      .color-outer.transparent {
        background-image: linear-gradient(
            45deg,
            ${COLOR_ALT_BG} 25%,
            transparent 25%
          ),
          linear-gradient(-45deg, ${COLOR_ALT_BG} 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${COLOR_ALT_BG} 75%),
          linear-gradient(-45deg, transparent 75%, ${COLOR_ALT_BG} 75%);
        background-size: 10px 10px;
        background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
      }
      .transparent .color {
        width: 0px !important;
        height: 0px;
        border-style: solid;
        border-width: 0 0 24px 24px;
        border-color: transparent;
      }
      .selected .color-outer.selected {
        border: 3px solid ${COLOR_PRIMARY_HIGHLIGHT};
        margin: 0px;
      }

      .unassigned-colors {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        justify-items: center;
      }
      .unassigned.empty {
        display: none;
      }
      .unassigned-colors .color-outer,
      .unassigned-colors .color {
        border-radius: 50%;
      }
      .btn {
        margin: 5px;
      }
    `,
  ];

  ctrl = new TilesetDocumentStateController(this);

  @property()
  palette: Partial<TilesetPalette> = {};

  @property({ type: Boolean })
  hasTilesToAdd = false;

  @property({ type: Boolean })
  hasTilesToRemove = false;

  mouseOverColor(event: MouseEvent) {
    const colorSwatch = event.target as HTMLElement;
    const i = parseInt(colorSwatch.dataset.index!, 10);

    const colorSwatches = this.shadowRoot!.querySelectorAll('.color-outer');
    const colors = this.palette.colors!.concat(this.palette.unassignedColors!);

    if (colorSwatch.classList.contains('hover')) {
      return;
    }
    colorSwatches.forEach(c =>
      c.classList.remove('hover', 'nearest', 'nearest-2')
    );
    const colorData = colors[i];
    if (colorData) {
      const nearest = sortIndexesByColorDistance(
        colorData.color,
        colors.map(c => c.color)
      );
      if (nearest.length > 1) {
        const nearestSwatch = colorSwatches[nearest[1]];
        nearestSwatch?.classList.add('nearest');
      }
      if (nearest.length > 2) {
        const secondNearestSwatch = colorSwatches[nearest[2]];
        secondNearestSwatch?.classList.add('nearest-2');
      }
    }
    colorSwatch.classList.add('hover');
  }

  mouseOutColor() {
    const colorSwatches = this.shadowRoot!.querySelectorAll('.color-outer');
    colorSwatches.forEach(c =>
      c.classList.remove('hover', 'nearest', 'nearest-2')
    );
  }

  clickColor(event: MouseEvent) {
    const colorSwatch = event.target as HTMLElement;
    const i = parseInt(colorSwatch.dataset.index!, 10);
    const colors = this.palette.colors!.concat(this.palette.unassignedColors!);
    editorState.selectColor(this.palette.index!, colors[i].color);
  }

  addSelectedTiles() {
    this.dispatchEvent(
      new CustomEvent('add-tiles', {
        detail: {
          paletteIndex: this.palette.index,
        },
      })
    );
  }

  removeSelectedTiles() {
    this.dispatchEvent(
      new CustomEvent('remove-tiles', {
        detail: {
          paletteIndex: this.palette.index,
        },
      })
    );
  }

  sortPalette() {
    paletteCommands.sortPalette(this.palette.index!);
  }

  selectByPalette() {
    tileCommands.selectTilesByPaletteColors(
      this.palette.index!,
      Math.max(
        0,
        15 -
          this.palette.colors!.filter(c => c.usageCount && c.usageCount > 0)
            .length
      )
    );
  }

  deletePalette() {
    this.dispatchEvent(
      new CustomEvent('delete-palette', {
        detail: {
          paletteIndex: this.palette.index,
        },
      })
    );
  }

  getPaletteSwatches() {
    return this.palette.colors!;
  }

  isColorSelected(color: ColorData) {
    return (color.usageCount &&
      editorState.selectedColors?.includes(color.color)) ||
      false
      ? 'selected'
      : '';
  }

  isTransparent(color: ColorData) {
    return !color.usageCount || color === this.palette.colors![0];
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <div
        class="editor ${this.palette.index === editorState.selectedPaletteIndex
          ? 'selected'
          : ''}"
      >
        <div class="title">Palette #${this.palette.index}</div>
        <div class="colors">
          ${this.getPaletteSwatches().map(
            (color, i) =>
              html`<div
                class="color-outer ${this.isTransparent(color)
                  ? 'transparent'
                  : ''} ${this.isColorSelected(color)}"
                data-index="${i}"
                title="Used in ${color.usageCount} pixels"
                @mouseover=${this.mouseOverColor}
                @focus=${this.mouseOverColor}
                @mouseout=${this.mouseOutColor}
                @blur=${this.mouseOutColor}
                @click=${this.clickColor}
              >
                <div
                  class="color"
                  style="${this.isTransparent(color)
                    ? (i === 0 &&
                        `border-left-color: ${colorToHex(color.color)}`) ||
                      ''
                    : `background-color: ${colorToHex(color.color)}`}"
                ></div>
              </div>`
          )}
        </div>
        <div
          class="unassigned ${this.palette.unassignedColors?.length
            ? ''
            : 'empty'}"
        >
          <div class="label">Missing from palette:</div>
          <div class="unassigned-colors">
            ${this.palette.unassignedColors?.map(
              (color, i) =>
                html`<div
                  class="color-outer ${this.isTransparent(color)
                    ? 'transparent'
                    : ''} ${this.isColorSelected(color)}"
                  data-index="${i + 16}"
                  @mouseover=${this.mouseOverColor}
                  @focus=${this.mouseOverColor}
                  @mouseout=${this.mouseOutColor}
                  @blur=${this.mouseOutColor}
                  @click=${this.clickColor}
                >
                  <div
                    class="color ${this.isColorSelected(color)}"
                    style="${this.isTransparent(color)
                      ? ''
                      : `background-color: ${colorToHex(color.color)}`}"
                  ></div>
                </div>`
            )}
          </div>
        </div>
        <div class="actions">
          <button
            @click=${this.addSelectedTiles}
            class="btn"
            ?disabled="${!this.hasTilesToAdd}"
          >
            Add Tiles
          </button>
          <button
            @click=${this.removeSelectedTiles}
            class="btn"
            ?disabled="${!this.hasTilesToRemove}"
          >
            Remove Tiles
          </button>
          <button @click=${this.sortPalette} class="btn">Sort</button>
          <button @click=${this.selectByPalette} class="btn">
            Select by Palette
          </button>
          <button @click=${this.deletePalette} class="btn btn-danger">
            Delete Palette
          </button>
        </div>
      </div>
    `;
  }
}
