import { StateController } from '@lit-app/state';
import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { imageCommands } from '../commands/image.commands.js';
import { baseCss, buttonStyles } from '../common/base-css.js';
import {
  colorToHex,
  getGradient,
  hexToColor,
  mixColors,
} from '../common/color-utils.js';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from '../common/constants.js';
import { checkIfColorsAdjecent } from '../common/image-utils.js';
import { editorState } from '../state/editor-state.js';

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

      .adjacent-warning {
        color: #f99292;
        font-weight: bold;
        font-style: italic;
        text-align: center;
        white-space: normal;
        margin-bottom: 10px;
      }
    `,
  ];

  ctrl = new StateController(this, editorState);

  @state()
  private _swatches: readonly [number | null, number | null] = [null, null];

  @state()
  private _selectingColor = false;

  @state()
  private _selectedColor: string | null = null;

  @state()
  private _selectedPosition: number | null = null;

  private _colorsAreAdjacent = false;

  shouldShow() {
    return editorState.currentTool === 'merge-colors';
  }

  getGradient() {
    if (editorState.selectedColors?.length >= 2) {
      return `background: ${getGradient(
        editorState.selectedColors[0],
        editorState.selectedColors[1],
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
    if (this._selectingColor && editorState.selectedColors?.length >= 2) {
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
    editorState.replacementColor = editorState.selectedColors![swatchIndex];
    this._selectedColor = colorToHex(editorState.replacementColor);
    this._selectedPosition = swatchIndex;
  }

  private setGradientPosition(pct: number | null) {
    if (pct == null || editorState.selectedColors?.length < 2) {
      editorState.replacementColor = undefined;
      this._selectedColor = null;
      this._selectedPosition = null;
      return;
    }
    // Clamp to 0-1
    pct = Math.max(0, Math.min(1, pct));
    this._selectedPosition = pct;
    editorState.replacementColor = mixColors(
      editorState.selectedColors[0],
      editorState.selectedColors[1],
      this._selectedPosition
    );
    this._selectedColor = colorToHex(editorState.replacementColor);
  }

  updated(changes: Map<string, any>) {
    if (changes.size === 0) {
      // Check if swatches changed based on editor selected colors
      if (editorState.selectedColors?.length >= 2) {
        const swatches = [
          editorState.selectedColors[0],
          editorState.selectedColors[1],
        ] as const;
        if (
          swatches[0] !== this._swatches[0] ||
          swatches[1] !== this._swatches[1]
        ) {
          this._swatches = swatches;
          this.setGradientPosition(0.5);
          this._colorsAreAdjacent = checkIfColorsAdjecent(
            editorState.currentDocument.imageData,
            swatches[0],
            swatches[1]
          );
        }
      } else if (this._swatches[0] || this._swatches[1]) {
        this._swatches = [null, null];
        this.setGradientPosition(null);
      }
    }
  }

  merge() {
    if (
      editorState.replacementColor &&
      editorState.selectedPaletteIndex != null &&
      editorState.selectedColors?.length >= 2
    ) {
      imageCommands.mergeColors(
        editorState.selectedColors[0],
        editorState.selectedColors[1],
        editorState.replacementColor,
        editorState.selectedPaletteIndex
      );
      editorState.selectedColors = [];
    }
  }

  pickColor(e: InputEvent) {
    const input = e.target as HTMLInputElement;
    const color = hexToColor(input.value);
    if (color) {
      editorState.replacementColor = color;
      this._selectedColor = input.value;
    }
  }

  render() {
    return html` <style type="text/css">
        ${baseCss}
      </style>
      <div class="panel ${this.shouldShow() ? 'show' : 'hide'}">
        <h3 class="title">Merge Colors</h3>
        ${editorState.selectedColors?.length >= 2
          ? html`
          ${
            this._colorsAreAdjacent
              ? html`<div class="adjacent-warning">
                  Colors being merged are adjacent in some tiles
                </div>`
              : ''
          }
        <div class="color-selector">
          <div class="swatches">
            ${editorState.selectedColors?.map(
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
    `
          : html` <p class="message">Select two colors to merge</p> `}
      </div>`;
  }
}
