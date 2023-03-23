import { css, html, LitElement, PropertyValueMap } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { setTransparencyColor } from './commands/palettes.commands.js';
import {
  addOrRemoveTileFromSelection,
  selectTilesInBox,
} from './commands/tiles.commands.js';
import {
  colorToHex,
  colorToRgb,
  invertColor,
  rgbToColor,
} from './common/color-utils.js';
import {
  COLOR_ALT_BG,
  COLOR_PRIMARY_BG,
  TILE_SIZE,
} from './common/constants.js';
import { tileIndexToCoords } from './common/utils.js';
import { editorState, execute } from './state/editor-state.js';
import { TilesetDocumentStateController } from './state/tileset-document-state-controller.js';

@customElement('tileset-viewer')
export class TilesetViewer extends LitElement {
  static styles = css`
    :host {
      display: flex;
      background: ${COLOR_PRIMARY_BG};
      overflow: auto;
      max-height: calc(100vh - 80px);
    }
    .tileset-viewer {
      display: flex;
      flex-grow: 1;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      position: relative;
    }
    /* #tileset-canvas {
      object-fit: contain;
      image-rendering: pixelated;

    } */
    .canvas-container {
      position: relative;
      background-image: linear-gradient(
          45deg,
          ${COLOR_ALT_BG} 25%,
          transparent 25%
        ),
        linear-gradient(-45deg, ${COLOR_ALT_BG} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, ${COLOR_ALT_BG} 75%),
        linear-gradient(-45deg, transparent 75%, ${COLOR_ALT_BG} 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    #tileset-canvas {
      image-rendering: pixelated;
    }
    #overlay {
      font-size: 20px;
      font-family: monospace;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      display: grid;
    }
    .overlay-tile {
      mix-blend-mode: difference;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .overlay-tile:hover {
      outline: 3px solid #ff0;
      outline-offset: -3px;
    }
    .overlay-tile.selected {
      background: rgba(255, 255, 0, 0.8);
    }
    #overlay.grid .overlay-tile {
      outline: 1px solid #999;
      outline-offset: -1px;
    }
    #overlay.merging {
      opacity: 0.5;
    }
    #overlay.merging .overlay-tile.selected {
      background: none;
    }
    #overlay.merging .overlay-tile .palette-index {
      display: none;
    }
    .palette-index {
      font-weight: bold;
      color: #fff;
      mix-blend-mode: difference;
      pointer-events: none;
    }

    .eye-dropper {
      position: fixed;
      pointer-events: none;
      top: 0;
      left: 0;
      padding: 5px;
      background: ${COLOR_PRIMARY_BG};
      border: 1px solid black;
      border-radius: 50%;
      display: flex;
    }
    .hide {
      display: none;
    }
    .eye-dropper-inner {
      border: 1px solid black;
      border-radius: 50%;
    }
    .marching-ants {
      background-size: 20px 2px, 20px 2px, 2px 20px, 2px 20px;
      background-position: 0 0, 0 100%, 0 0, 100% 0;
      background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;
      animation: marching-ants 1s;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
      animation-play-state: running;
      background-image: linear-gradient(to right, #fff 50%, transparent 50%),
        linear-gradient(to right, #fff 50%, transparent 50%),
        linear-gradient(to bottom, #fff 50%, transparent 50%),
        linear-gradient(to bottom, #fff 50%, transparent 50%);
      color: #fff;
    }
    .select-box {
      position: absolute;
      pointer-events: none;
      width: 150px;
      height: 75px;
      top: 10px;
      left: 10px;
    }
    @keyframes marching-ants {
      0% {
        background-position: 0 0, 0 100%, 0 0, 100% 0;
      }
      100% {
        background-position: 40px 0, -40px 100%, 0 -40px, 100% 40px;
      }
    }
  `;

  ctrl = new TilesetDocumentStateController(this);

  @property()
  backgroundColor = '#aaa';

  @query('#tileset-canvas')
  canvas!: HTMLCanvasElement;

  @query('#eyedropper-canvas')
  eyedropperCanvas!: HTMLCanvasElement;

  @query('.select-box')
  selectBox!: HTMLDivElement;

  @query('#overlay')
  overlay!: HTMLDivElement;

  @state()
  private _scale = 4;

  private _hoveredTile = { x: -1, y: -1 };

  private _lastSelectedTile = { x: -1, y: -1 };

  private _tool = 'hover';

  private _dirty = true;

  private tilesWide = 0;

  private _lastRenderTime = 0;

  private _selectBoxStart = { x: -1, y: -1 };

  render() {
    return html`
      <div class="tileset-viewer">
        <div class="canvas-container">
          <canvas id="tileset-canvas"></canvas>
          <div
            id="overlay"
            class="${editorState.currentTool === 'merge-colors'
              ? 'merging'
              : ''} ${editorState.viewOptions.showGrid ? 'grid' : ''}"
          >
            ${this.doc?.tiles.map(
              (tile, i) => html`
                <div
                  class="overlay-tile ${tile.selected ? 'selected' : ''}"
                  data-index="${i}"
                >
                  ${editorState.viewOptions.showPaletteNumbers &&
                  tile.paletteIndex != null
                    ? html`
                        <span class="palette-index">${tile.paletteIndex}</span>
                      `
                    : ''}
                </div>
              `
            )}
          </div>
          <div
            class="marching-ants select-box ${this._selectBoxStart.x >= 0
              ? 'show'
              : 'hide'}"
          ></div>
        </div>
        <div
          class="eye-dropper ${editorState.currentTool === 'eyedropper'
            ? 'show'
            : 'hide'}"
        >
          <canvas
            id="eyedropper-canvas"
            class="eye-dropper-inner"
            width="50px"
            height="50px"
          ></canvas>
        </div>
      </div>
    `;
  }

  // Handle scroll wheel
  protected firstUpdated() {
    const eyedropper = this.shadowRoot?.querySelector(
      '.eye-dropper'
    ) as HTMLElement;
    this.addEventListener('wheel', e => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY > 0 && this._scale > 0.5) {
          this._scale -= 0.25;
        } else if (e.deltaY < 0 && this._scale < 8) {
          this._scale += 0.25;
        }
      }
    });
    // Hover over a tile
    this.overlay.addEventListener('mousemove', e => {
      // Get mouse position relative to the overlay
      const rect = this.overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this._tool === 'hover') {
        return;
      }
      const tile = e.target as HTMLElement;
      const tileIndex = parseInt(tile.dataset.index || '-1', 10);
      if (editorState.currentTool === 'eyedropper') {
        eyedropper.style.left = `${e.clientX - 60}px`;
        eyedropper.style.top = `${e.clientY - 60}px`;
      }

      if (
        editorState.currentTool === 'select-box' &&
        this._selectBoxStart.x >= 0
      ) {
        this.updateSelectBox(x, y);
      }

      this.applyTool(x, y, tileIndex, e.shiftKey ? 'shift' : '');
    });
    // Select a tile
    this.overlay.addEventListener('mousedown', e => {
      e.preventDefault();
      // Get mouse position relative to the overlay
      const rect = this.overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const tile = e.target as HTMLElement;
      const tileIndex = parseInt(tile.dataset.index || '-1', 10);
      if (this.doc.tiles[tileIndex].selected) {
        this._tool = 'deselect';
      } else {
        this._tool = 'select';
      }
      if (editorState.currentTool === 'select-box') {
        this._selectBoxStart = { x, y };
        this._tool = 'select-box';
        this.updateSelectBox(x, y);
      }
    });
    this.overlay.addEventListener('mouseup', e => {
      // Get mouse position relative to the overlay
      const rect = this.overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const tile = e.target as HTMLElement;
      const tileIndex = parseInt(tile.dataset.index || '-1', 10);
      this.applyTool(x, y, tileIndex, e.shiftKey ? 'shift' : '');
      if (this._tool === 'select-box') {
        this.selectBox.classList.add('hide');
        execute(
          selectTilesInBox(
            this.getTileAtRounded(
              this._selectBoxStart.x,
              this._selectBoxStart.y
            ),
            this.getTileAtRounded(x, y),
            e.altKey,
            e.shiftKey
          )
        );
      }
      if (
        this._tool === 'select' ||
        this._tool === 'deselect' ||
        this._tool === 'select-box'
      ) {
        this._tool = 'hover';
      }
      if (editorState.currentTool === 'eyedropper') {
        editorState.currentTool = editorState.lastTool || 'select';
      }
      this._lastSelectedTile = { x: -1, y: -1 };
      this._selectBoxStart = { x: -1, y: -1 };
    });

    setInterval(() => {
      // Refesh if last render time is more than .1 seconds ago
      if (
        editorState.currentTool === 'highlight-color' &&
        performance.now() - this._lastRenderTime > 250
      ) {
        this._dirty = true;
      }
    }, 50);

    requestAnimationFrame(() => this.renderTileset());
  }

  private setEyeDropper(x: number, y: number) {
    const wholeX = Math.round(x / this._scale);
    const wholeY = Math.round(y / this._scale);
    const { imageData } = this.doc;
    const pixelIndex = (wholeY * imageData.width + wholeX) * 4;
    const [r, g, b] = imageData.data.slice(pixelIndex, pixelIndex + 3);
    const color = rgbToColor(r, g, b);
    if (!editorState.hoverColor || color !== editorState.hoverColor) {
      editorState.hoverColor = color;
    }
    this.updateEyeDropper(
      editorState.hoverColor,
      x / this._scale,
      y / this._scale
    );
    if (this._tool === 'select' || this._tool === 'deselect') {
      execute(setTransparencyColor(colorToHex(editorState.hoverColor)));
    }
  }

  private updateSelection(tileIndex: number, modifier: string) {
    const { x: tileX, y: tileY } = this.getTileCoords(tileIndex);
    if (
      tileX !== this._lastSelectedTile.x ||
      tileY !== this._lastSelectedTile.y
    ) {
      this._lastSelectedTile = { x: tileX, y: tileY };
      this._hoveredTile = { x: -1, y: -1 };
      const selectMultiple = modifier === 'shift';
      const deselect = this._tool === 'deselect';
      execute(
        addOrRemoveTileFromSelection(tileIndex, selectMultiple, deselect)
      );
    }
  }

  private applyTool(x: number, y: number, tileIndex: number, modifier: string) {
    if (editorState.currentTool === 'eyedropper') {
      this.setEyeDropper(x, y);
    }
    if (
      editorState.currentTool !== 'select' &&
      editorState.currentTool !== 'select-box'
    ) {
      if (this._hoveredTile.x !== -1 && this._hoveredTile.y !== -1) {
        this._hoveredTile = { x: -1, y: -1 };
      }

      return;
    }
    const { x: tileX, y: tileY } = tileIndexToCoords(tileIndex, this.tilesWide);
    switch (this._tool) {
      case 'hover':
        if (tileX !== this._hoveredTile.x || tileY !== this._hoveredTile.y) {
          this._hoveredTile = { x: tileX, y: tileY };
        }
        break;
      case 'select':
      case 'deselect':
        this.updateSelection(tileIndex, modifier);
        break;
      case 'select-box':
        if (this._hoveredTile.x >= 0) {
          this._hoveredTile = { x: -1, y: -1 };
        }
        break;
      default:
        console.error('Unknown tool', this._tool);
        break;
    }
  }

  private getTileIndex(x: number, y: number): number {
    return y * this.tilesWide + x;
  }

  private getTileCoords(index: number): { x: number; y: number } {
    const tileX = index % this.tilesWide;
    const tileY = Math.floor(index / this.tilesWide);
    return { x: tileX, y: tileY };
  }

  private getTilePixelCoords(index: number): { x: number; y: number } {
    const scale = this.intScale;
    const { x: tileX, y: tileY } = this.getTileCoords(index);
    return { x: tileX * TILE_SIZE * scale, y: tileY * TILE_SIZE * scale };
  }

  private getTileAt(x: number, y: number): { x: number; y: number } {
    const scale = this.intScale;
    const tileX = Math.floor(x / (TILE_SIZE * scale));
    const tileY = Math.floor(y / (TILE_SIZE * scale));
    return { x: tileX, y: tileY };
  }

  private getTileAtRounded(x: number, y: number): { x: number; y: number } {
    const scale = this.intScale;
    const tileX = Math.round(x / (TILE_SIZE * scale));
    const tileY = Math.round(y / (TILE_SIZE * scale));
    return { x: tileX, y: tileY };
  }

  protected async update(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ) {
    super.update(changedProperties);
    await this.updateImage();
    this._dirty = true;
  }

  private async updateImage() {
    if (!this.doc.imageCanvas) {
      return;
    }
    this.tilesWide = Math.ceil(this.doc.imageCanvas.width / TILE_SIZE);
  }

  get intScale() {
    return Math.max(1, Math.floor(this._scale));
  }

  renderTileset() {
    requestAnimationFrame(() => this.renderTileset());
    if (!this._dirty) {
      return;
    }
    // console.log('renderTileset', performance.now() - this._lastRenderTime);
    this._dirty = false;
    this._lastRenderTime = performance.now();
    const scale = this.intScale;
    if (this.doc.imageCanvas) {
      this.canvas.width = this.doc.imageCanvas.width;
      this.canvas.height = this.doc.imageCanvas.height;
      this.canvas.style.width = `${this.canvas.width * scale}px`;
      this.canvas.style.height = `${this.canvas.height * scale}px`;
      this.overlay.style.gridTemplateColumns = `repeat(${this.tilesWide}, 1fr)`;
      const tilesHigh = Math.ceil(this.doc.imageCanvas.height / TILE_SIZE);
      this.overlay.style.gridTemplateRows = `repeat(${tilesHigh}, 1fr)`;
      this.overlay.style.width = `${this.tilesWide * scale * TILE_SIZE}px`;
      this.overlay.style.height = `${tilesHigh * scale * TILE_SIZE}px`;
      this.overlay.style.fontSize = `${scale * 6}px`;
      const ctx = this.canvas.getContext('2d')!;
      const blink = Math.floor(performance.now() / 500) % 2 === 0;
      const { currentTool } = editorState;
      let selectedColors: number[] = [];
      if (
        (currentTool === 'highlight-color' && blink) ||
        currentTool === 'merge-colors'
      ) {
        selectedColors = editorState.selectedColors;
      }
      let targetColors: number[] = [];
      if (currentTool === 'highlight-color') {
        targetColors = selectedColors.map(invertColor);
      } else if (currentTool === 'merge-colors') {
        targetColors = selectedColors.map(() => editorState.replacementColor!);
      }
      const imgWidth = this.doc.imageCanvas.width;
      const imgHeight = this.doc.imageCanvas.height;
      // Duplicate tilesetState.imageData so we don't modify the original
      const imageData = new ImageData(
        this.doc.imageData.data.slice(0),
        imgWidth,
        imgHeight
      );
      const { data } = imageData;
      for (let i = 0; i < data.length / 4; i++) {
        const x = Math.floor((i % imgWidth) / TILE_SIZE);
        const y = Math.floor(i / imgWidth / TILE_SIZE);
        const tileIndex = this.getTileIndex(x, y);
        const tile = this.doc.tiles[tileIndex];
        const color = rgbToColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
        const colorIndex =
          tile && tile.paletteIndex === editorState.selectedPaletteIndex
            ? selectedColors.indexOf(color)
            : -1;
        if (colorIndex >= 0) {
          const [r2, g2, b2] = colorToRgb(targetColors[colorIndex]);
          data[i * 4] = r2;
          data[i * 4 + 1] = g2;
          data[i * 4 + 2] = b2;
        } else if (
          this.doc.transparencyColor &&
          this.doc.transparencyColor === color
        ) {
          data[i * 4 + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  }

  private updateSelectBox(x: number, y: number) {
    const minX = Math.min(this._selectBoxStart.x, x);
    const minY = Math.min(this._selectBoxStart.y, y);
    const maxX = Math.max(this._selectBoxStart.x, x);
    const maxY = Math.max(this._selectBoxStart.y, y);

    this.selectBox.style.left = `${minX}px`;
    this.selectBox.style.top = `${minY}px`;
    this.selectBox.style.width = `${maxX - minX}px`;
    this.selectBox.style.height = `${maxY - minY}px`;
    this.selectBox.classList.remove('hide');
  }

  private updateEyeDropper(color: number, centerX = 0, centerY = 0) {
    if (!this.doc.imageCanvas) {
      return;
    }
    const scale = 8;
    const ctx = this.eyedropperCanvas.getContext('2d')!;
    const selectWidth = Math.ceil(this.eyedropperCanvas.width / scale);
    const selectHeight = Math.ceil(this.eyedropperCanvas.height / scale);
    const x = Math.max(
      0,
      Math.min(
        centerX - selectWidth / 2 + 0.5,
        this.doc.imageCanvas.width - selectWidth
      )
    );
    const y = Math.max(
      0,
      Math.min(
        centerY - selectHeight / 2 + 0.5,
        this.doc.imageCanvas.height - selectHeight
      )
    );
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(
      0,
      0,
      this.eyedropperCanvas.width,
      this.eyedropperCanvas.height
    );
    ctx.drawImage(
      this.doc.imageCanvas,
      x,
      y,
      selectWidth,
      selectHeight,
      0,
      0,
      selectWidth * scale,
      selectHeight * scale
    );
    ctx.fillStyle = colorToHex(color);
    ctx.arc(
      this.eyedropperCanvas.width / 2,
      this.eyedropperCanvas.height / 2,
      1.5 * scale,
      0,
      2 * Math.PI
    );
    ctx.fill();
  }

  private get doc() {
    return editorState.currentDocument;
  }
}
