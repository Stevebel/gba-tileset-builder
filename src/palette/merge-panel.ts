import { StateController } from '@lit-app/state';
import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { baseCss, buttonStyles } from '../common/base-css.js';
import {
  colorToHex,
  getGradient,
  hexToColor,
  mixColors,
} from '../common/color-utils.js';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from '../common/constants.js';
import { tilesetState } from '../common/tileset-state.js';

@customElement('merge-panel')
export class MergePanel extends LitElement {
  static styles = [
    buttonStyles,
    css`
      :host {
        z-index: 9;
      }
      .panel {
        display: flex;
        flex-direction: column;
        background: ${COLOR_PRIMARY_BG};
        color: ${COLOR_PRIMARY_FG};

        box-shadow: 3px 0 10px rgba(0, 0, 0, 0.5);

        overflow: hidden;
        white-space: nowrap;
        height: 100%;
        max-height: calc(100vh - 100px);
        width: 0px;
        min-width: 0px;
        padding: 10px 0px;
        transition: min-width 0.25s ease-in-out, width 0.25s ease-in-out,
          padding 0.25s ease-in-out;
      }
      .panel.show {
        min-width: 180px;
        width: 180px;
        padding: 10px;
        overflow-y: auto;
        max-height: calc(100vh - 100px);
        padding-left: 20px;
      }
      .color-selector {
        display: flex;
        flex-grow: 1;
        padding-bottom: 20px;
      }
      .swatches {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 0 10px;
      }
      .swatch {
        aspect-ratio: 1;
        width: 50px;
        border: 1px solid black;
      }
      .slider {
        padding-right: 25px;
      }
      .gradient {
        width: 50px;
        position: relative;
        height: 100%;
        border: 1px solid black;
      }
      .gradient .indicator {
        pointer-events: none;
        position: absolute;
        left: 60px;
        padding: 5px;
        padding-left: 0;
        background: #aaa;
        border-radius: 2px 50% 50% 2px;
        transform: translateY(-50%);
        filter: drop-shadow(rgba(0, 0, 0, 0.5) 2px 4px 6px);
      }
      .gradient .indicator::before {
        content: '';
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        border-width: 18.5px;
        border-style: solid;
        border-color: transparent #aaa transparent transparent;
        border-image: initial;
        left: -36px;
      }
      .indicator-color {
        width: 25px;
        height: 25px;
        border: 1px solid black;
        border-radius: 50%;
      }
      .color-input {
        display: flex;
        align-items: center;
      }
      .input-color {
        width: 19px;
        height: 19px;
        border: 1px solid black;
        margin-left: 6px;
      }
      .color-input input {
        width: 100px;
      }

      .actions {
        padding: 10px;
        padding-bottom: 0;
        text-align: center;
      }
    `,
  ];

  ctrl = new StateController(this, tilesetState);

  @state()
  private _swatches: readonly [number | null, number | null] = [null, null];

  @state()
  private _selectingColor = false;

  @state()
  private _selectedColor: string | null = null;

  @state()
  private _selectedPosition: number | null = null;

  shouldShow() {
    return tilesetState.currentTool === 'merge-colors';
  }

  getGradient() {
    if (tilesetState.selectedColors?.length >= 2) {
      return `background: ${getGradient(
        tilesetState.selectedColors[0],
        tilesetState.selectedColors[1],
        'bottom'
      )}`;
    }
    return '';
  }

  startSelect() {
    this._selectingColor = true;
  }

  endSelect(e: MouseEvent) {
    this.selectColor(e);
    this._selectingColor = false;
  }

  selectColor(e: MouseEvent) {
    if (this._selectingColor && tilesetState.selectedColors?.length >= 2) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      this.setGradientPosition(y / rect.height);
    }
  }

  selectSwatch(e: MouseEvent) {
    const swatch = e.target as HTMLElement;
    const swatchIndex = Array.from(swatch.parentElement!.children).indexOf(
      swatch
    );
    tilesetState.replacementColor = tilesetState.selectedColors![swatchIndex];
    this._selectedColor = colorToHex(tilesetState.replacementColor);
    this._selectedPosition = swatchIndex;
  }

  private setGradientPosition(pct: number | null) {
    if (pct == null || tilesetState.selectedColors?.length < 2) {
      tilesetState.replacementColor = undefined;
      this._selectedColor = null;
      this._selectedPosition = null;
      return;
    }
    // Clamp to 0-1
    pct = Math.max(0, Math.min(1, pct));
    this._selectedPosition = pct;
    tilesetState.replacementColor = mixColors(
      tilesetState.selectedColors[0],
      tilesetState.selectedColors[1],
      this._selectedPosition
    );
    this._selectedColor = colorToHex(tilesetState.replacementColor);
  }

  updated(changes: Map<string, any>) {
    if (changes.size === 0) {
      // Check if swatches changed based on tileset state selected colors
      if (tilesetState.selectedColors?.length >= 2) {
        const swatches = [
          tilesetState.selectedColors[0],
          tilesetState.selectedColors[1],
        ] as const;
        if (
          swatches[0] !== this._swatches[0] ||
          swatches[1] !== this._swatches[1]
        ) {
          this._swatches = swatches;
          this.setGradientPosition(0.5);
        }
      } else if (this._swatches[0] || this._swatches[1]) {
        this._swatches = [null, null];
        this.setGradientPosition(null);
      }
    }
  }

  merge() {
    if (tilesetState.replacementColor) {
      tilesetState.mergeSelectedColors(tilesetState.replacementColor);
    }
  }

  pickColor(e: InputEvent) {
    const input = e.target as HTMLInputElement;
    const color = hexToColor(input.value);
    if (color) {
      tilesetState.replacementColor = color;
      this._selectedColor = input.value;
    }
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <div class="panel ${this.shouldShow() ? 'show' : 'hide'}">
        <h3 class="title">Merge Colors</h3>
        <div class="color-selector">
          <div class="swatches">
            ${tilesetState.selectedColors?.map(
              color => html`
                <div
                  class="swatch"
                  style="background-color: ${colorToHex(color)}"
                  @click=${this.selectSwatch}
                ></div>
              `
            )}
          </div>
          <div
            class="slider"
            @mousedown=${this.startSelect}
            @mousemove=${this.selectColor}
            @mouseup=${this.endSelect}
            @mouseleave=${this.endSelect}
          >
            <div class="gradient" style="${this.getGradient()}">
              ${
                this._selectedPosition !== null && this._selectedColor !== null
                  ? html`
                      <div
                        class="indicator"
                        style="top: ${this._selectedPosition * 100}%"
                      >
                        <div
                          class="indicator-color"
                          style="background-color: ${this._selectedColor}"
                        ></div>
                      </div>
                    `
                  : ''
              }
            </div>
          </div>
          </div>
          <lch-color-picker .color=${this._selectedColor} @color-change=${
      this.pickColor
    }></lch-color-picker>
          <div class="actions">
            <button @click=${this.merge} class="btn btn-primary">Merge</button>
          </div>
        </div>
      </div>
    `;
  }
}
