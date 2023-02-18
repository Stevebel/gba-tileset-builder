import { StateController } from '@lit-app/state';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { baseCss, buttonStyles } from '../common/base-css.js';
import { sortIndexesByColorDistance } from '../common/color-utils.js';
import {
  COLOR_PRIMARY_BG,
  COLOR_PRIMARY_FG,
  COLOR_PRIMARY_HIGHLIGHT,
  COLOR_PRIMARY_HIGHLIGHT_BG,
} from '../common/constants.js';
import { tilesetState } from '../common/tileset-state.js';
import { ColorData, TilesetPalette } from '../common/tileset.interface.js';

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
      .color {
        width: 24px;
        height: 24px;
        border: 1px solid #000;
        margin: 3px;
        overflow: hidden;
        position: relative;
      }
      .color.hover {
        border: 3px solid #fff;
        margin: 0px;
      }
      .color.nearest {
        border: 2px solid #ddd;
        margin: 1px;
      }
      .color.nearest-2 {
        border: 2px solid #bbb;
        margin: 1px;
      }
      .color.nearest-3 {
        border: 2px solid #999;
        margin: 1px;
      }
      .transparent {
        border-color: #f00;
      }
      .transparent::after {
        content: '';
        position: absolute;
        inset: 0px;
        background: rgb(0, 0, 0);
        width: 2px;
        transform-origin: right top;
        transform: rotate(45deg);
        right: 0;
        left: auto;
        height: 100px;
      }
      .color.selected {
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
      .unassigned-colors .color {
        border-radius: 50%;
      }
      .btn {
        margin: 5px;
      }
    `,
  ];

  ctrl = new StateController(this, tilesetState);

  @property()
  palette: Partial<TilesetPalette> = {};

  @property({ type: Boolean })
  hasTilesToAdd = false;

  @property({ type: Boolean })
  hasTilesToRemove = false;

  mouseOverColor(event: MouseEvent) {
    const colorSwatch = event.target as HTMLElement;
    const i = parseInt(colorSwatch.dataset.index!, 10);

    const colorSwatches = this.shadowRoot!.querySelectorAll('.color');
    const colors = this.palette.colors!.concat(this.palette.unassignedColors!);

    if (colorSwatch.classList.contains('hover')) {
      return;
    }
    colorSwatches.forEach(c =>
      c.classList.remove('hover', 'nearest', 'nearest-2', 'nearest-3')
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
      // if (nearest.length > 3) {
      //   const thirdNearestSwatch = colorSwatches[nearest[3]];
      //   thirdNearestSwatch?.classList.add('nearest-3');
      // }
    }
    colorSwatch.classList.add('hover');
  }

  mouseOutColor() {
    const colorSwatches = this.shadowRoot!.querySelectorAll('.color');
    colorSwatches.forEach(c =>
      c.classList.remove('hover', 'nearest', 'nearest-2', 'nearest-3')
    );
  }

  clickColor(event: MouseEvent) {
    const colorSwatch = event.target as HTMLElement;
    const i = parseInt(colorSwatch.dataset.index!, 10);
    const colors = this.palette.colors!.concat(this.palette.unassignedColors!);
    tilesetState.selectColor(this.palette.index!, colors[i].color);
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
    return tilesetState.selectedColors?.some(
      c =>
        c[0] === color.color[0] &&
        c[1] === color.color[1] &&
        c[2] === color.color[2]
    ) || false
      ? 'selected'
      : '';
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss} .color::after {
          content: '';
        }
      </style>
      <div
        class="editor ${this.palette.index === tilesetState.selectedPaletteIndex
          ? 'selected'
          : ''}"
      >
        <div class="title">Palette #${this.palette.index}</div>
        <div class="colors">
          ${this.getPaletteSwatches().map(
            (color, i) =>
              html`<div
                class="color ${i === 0
                  ? 'transparent'
                  : ''} ${this.isColorSelected(color)}"
                style="background-color: rgb(${color.color.join(',')})"
                data-index="${i}"
                @mouseover=${this.mouseOverColor}
                @focus=${this.mouseOverColor}
                @mouseout=${this.mouseOutColor}
                @blur=${this.mouseOutColor}
                @click=${this.clickColor}
              ></div>`
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
                  class="color ${this.isColorSelected(color)}"
                  style="background-color: rgb(${color.color.join(',')})"
                  data-index="${i + 16}"
                  @mouseover=${this.mouseOverColor}
                  @focus=${this.mouseOverColor}
                  @mouseout=${this.mouseOutColor}
                  @blur=${this.mouseOutColor}
                  @click=${this.clickColor}
                ></div>`
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
          <button @click=${this.deletePalette} class="btn btn-danger">
            Delete Palette
          </button>
        </div>
      </div>
    `;
  }
}
