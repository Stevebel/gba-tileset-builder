import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { baseCss, buttonStyles } from '../common/base-css.js';
import { sortIndexesByColorDistance } from '../common/color-utils.js';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from '../common/constants.js';
import { TilesetPalette } from '../common/tileset.interface.js';

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

  @property()
  palette: Partial<TilesetPalette> = {};

  @property({ type: Boolean })
  hasTilesToAdd = false;

  @property({ type: Boolean })
  hasTilesToRemove = false;

  updated() {
    // Check for hover over .color elements
    const colorSwatches = this.shadowRoot?.querySelectorAll('.color');
    const colors = this.palette.colors!.concat(this.palette.unassignedColors!);
    colorSwatches?.forEach((colorSwatch, i) => {
      colorSwatch.addEventListener('mouseover', () => {
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
          if (nearest.length > 3) {
            const thirdNearestSwatch = colorSwatches[nearest[3]];
            thirdNearestSwatch?.classList.add('nearest-3');
          }
        }
        colorSwatch.classList.add('hover');
      });

      colorSwatch.addEventListener('mouseout', () => {
        colorSwatches.forEach(c =>
          c.classList.remove('hover', 'nearest', 'nearest-2', 'nearest-3')
        );
      });
    });
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

  render() {
    return html`
      <style type="text/css">
        ${baseCss} .color::after {
          content: '';
        }
      </style>
      <div class="editor">
        <div class="title">Palette #${this.palette.index}</div>
        <div class="colors">
          ${this.getPaletteSwatches().map(
            (color, i) =>
              html`<div
                class="color ${i === 0 ? 'transparent' : ''}"
                style="background-color: rgb(${color.color.join(',')})"
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
              color =>
                html`<div
                  class="color"
                  style="background-color: rgb(${color.color.join(',')})"
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
