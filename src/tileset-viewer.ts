import { StateController } from '@lit-app/state';
import { css, html, LitElement, PropertyValueMap } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { colorsAreEqual } from './common/color-utils.js';
import {
  COLOR_ALT_BG,
  COLOR_PRIMARY_BG,
  TILE_SIZE,
} from './common/constants.js';
import { tilesetState } from './common/tileset-state.js';
import { RGBColor } from './common/tileset.interface.js';

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
    #tileset-canvas {
      object-fit: contain;
      image-rendering: pixelated;
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
    .eye-dropper.hide {
      display: none;
    }
    .eye-dropper-inner {
      border: 1px solid black;
      border-radius: 50%;
    }
  `;

  ctrl = new StateController(this, tilesetState);

  @property()
  backgroundColor = '#aaa';

  @query('#tileset-canvas')
  canvas!: HTMLCanvasElement;

  @query('#eyedropper-canvas')
  eyedropperCanvas!: HTMLCanvasElement;

  @state()
  private _scale = 4;

  @state()
  private _hoveredTile = { x: -1, y: -1 };

  @state()
  private _lastSelectedTile = { x: -1, y: -1 };

  @state()
  private _tool = 'hover';

  private tilesWide = 0;

  private _lastRenderTime = 0;

  render() {
    return html`
      <div class="tileset-viewer">
        <canvas id="tileset-canvas"></canvas>
        <div
          class="eye-dropper ${tilesetState.currentTool === 'eyedropper'
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
        this.renderTileset();
      }
    });
    // Hover over a tile
    this.canvas.addEventListener('mousemove', e => {
      eyedropper.style.left = `${e.clientX - 60}px`;
      eyedropper.style.top = `${e.clientY - 60}px`;
      this.applyTool(e.offsetX, e.offsetY, e.shiftKey ? 'shift' : '');
    });
    // Select a tile
    this.canvas.addEventListener('mousedown', e => {
      const { x, y } = this.getTileAt(e.offsetX, e.offsetY);
      const tileIndex = this.getTileIndex(x, y);
      if (tilesetState.tiles[tileIndex].selected) {
        this._tool = 'deselect';
      } else {
        this._tool = 'select';
      }
    });
    this.canvas.addEventListener('mouseup', e => {
      this.applyTool(e.offsetX, e.offsetY, e.shiftKey ? 'shift' : '');
      if (this._tool === 'select' || this._tool === 'deselect') {
        this._tool = 'hover';
      }
      if (tilesetState.currentTool === 'eyedropper') {
        tilesetState.currentTool = tilesetState.lastTool || 'select';
      }
      this._lastSelectedTile = { x: -1, y: -1 };
    });

    setInterval(() => {
      // Refesh if last render time is more than .1 seconds ago
      if (
        tilesetState.currentTool === 'highlight-color' &&
        performance.now() - this._lastRenderTime > 250
      ) {
        this.renderTileset();
      }
    }, 50);
  }

  private applyTool(x: number, y: number, modifier: string) {
    if (tilesetState.currentTool === 'eyedropper') {
      const wholeX = Math.round(x / this._scale);
      const wholeY = Math.round(y / this._scale);
      const pixelIndex = (wholeY * tilesetState.imageData.width + wholeX) * 4;
      const pixel = tilesetState.imageData?.data.slice(
        pixelIndex,
        pixelIndex + 3
      );
      const color = [...pixel] as RGBColor;
      if (
        !tilesetState.hoverColor ||
        !colorsAreEqual(color, tilesetState.hoverColor)
      ) {
        tilesetState.hoverColor = color;
      }
      this.updateEyeDropper(
        tilesetState.hoverColor,
        x / this._scale,
        y / this._scale
      );
      if (this._tool === 'select' || this._tool === 'deselect') {
        tilesetState.transparencyColor = tilesetState.hoverColor;
      }
    }
    if (tilesetState.currentTool !== 'select') {
      if (this._hoveredTile.x !== -1 && this._hoveredTile.y !== -1) {
        this._hoveredTile = { x: -1, y: -1 };
      }

      return;
    }
    const { x: tileX, y: tileY } = this.getTileAt(x, y);
    const tileIndex = this.getTileIndex(tileX, tileY);
    switch (this._tool) {
      case 'hover':
        if (tileX !== this._hoveredTile.x || tileY !== this._hoveredTile.y) {
          this._hoveredTile = { x: tileX, y: tileY };
          this.renderTileset();
        }
        break;
      case 'select':
      case 'deselect':
        if (
          tileX !== this._lastSelectedTile.x ||
          y !== this._lastSelectedTile.y
        ) {
          this._lastSelectedTile = { x: tileX, y: tileY };
          this._hoveredTile = { x: -1, y: -1 };
          const selectMultiple = modifier === 'shift';
          const deselect = this._tool === 'deselect';
          tilesetState.selectTile(tileIndex, selectMultiple, deselect);
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
    const scale = this.intScale;
    const tileX = index % this.tilesWide;
    const tileY = Math.floor(index / this.tilesWide);
    return { x: tileX * TILE_SIZE * scale, y: tileY * TILE_SIZE * scale };
  }

  private getTileAt(x: number, y: number): { x: number; y: number } {
    const scale = this.intScale;
    const tileX = Math.floor(x / (TILE_SIZE * scale));
    const tileY = Math.floor(y / (TILE_SIZE * scale));
    return { x: tileX, y: tileY };
  }

  protected async update(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ) {
    super.update(changedProperties);

    await this.updateImage();
    this.renderTileset();
  }

  private async updateImage() {
    if (!tilesetState.imageCanvas) {
      return;
    }
    this.tilesWide = Math.ceil(tilesetState.imageCanvas.width / TILE_SIZE);
  }

  get intScale() {
    return Math.max(1, Math.floor(this._scale));
  }

  renderTileset() {
    this._lastRenderTime = performance.now();
    const scale = this.intScale;
    if (tilesetState.imageCanvas) {
      const img = this.getProcessedImage();
      // Set canvas size to match the image size
      this.canvas.width = img.width * scale;
      this.canvas.height = img.height * scale;
      const ctx = this.canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
      if (tilesetState.viewOptions.showGrid) {
        // Draw a grid every 8x8 of pixels in the image using the inverse of the pixel color under
        ctx.fillStyle = '#aaa';
        ctx.globalCompositeOperation = 'difference';
        for (let x = 0; x < img.width; x += TILE_SIZE) {
          for (let y = 0; y < img.height; y += TILE_SIZE) {
            ctx.fillRect(x * scale, y * scale, TILE_SIZE * scale, 1);
            ctx.fillRect(x * scale, y * scale, 1, TILE_SIZE * scale);
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // Draw a border around the hovered tile
      if (this._hoveredTile.x >= 0 && this._hoveredTile.y >= 0) {
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = Math.max(1, Math.floor(scale / 2));
        ctx.strokeRect(
          this._hoveredTile.x * TILE_SIZE * scale,
          this._hoveredTile.y * TILE_SIZE * scale,
          TILE_SIZE * scale,
          TILE_SIZE * scale
        );
      }
      // Highlight the selected tiles
      tilesetState.tiles
        .filter(t => t.selected)
        .forEach(t => {
          const { x, y } = this.getTileCoords(t.tileIndex);
          ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
          ctx.strokeStyle = '#fff';
          ctx.fillRect(x, y, TILE_SIZE * scale, TILE_SIZE * scale);
          ctx.strokeRect(x, y, TILE_SIZE * scale, TILE_SIZE * scale);
        });
      // Display the palette indexes of the tiles
      if (tilesetState.viewOptions.showPaletteNumbers) {
        tilesetState.tiles
          .filter(t => t.paletteIndex != null)
          .forEach(t => {
            const { x, y } = this.getTileCoords(t.tileIndex);
            ctx.fillStyle = '#fff';
            ctx.globalCompositeOperation = 'difference';
            ctx.font = `${6 * scale}px monospace`;
            ctx.textAlign = 'center';
            const text = t.paletteIndex!.toString();
            const textMetrics = ctx.measureText(text);
            ctx.fillText(
              text,
              x + (TILE_SIZE * scale) / 2,
              y +
                (TILE_SIZE * scale) / 2 +
                textMetrics.actualBoundingBoxAscent / 2
            );
            ctx.globalCompositeOperation = 'source-over';
          });
      }
    }
  }

  private updateEyeDropper(color: RGBColor, centerX = 0, centerY = 0) {
    if (!tilesetState.imageCanvas) {
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
        tilesetState.imageCanvas.width - selectWidth
      )
    );
    const y = Math.max(
      0,
      Math.min(
        centerY - selectHeight / 2 + 0.5,
        tilesetState.imageCanvas.height - selectHeight
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
      tilesetState.imageCanvas,
      x,
      y,
      selectWidth,
      selectHeight,
      0,
      0,
      selectWidth * scale,
      selectHeight * scale
    );
    ctx.fillStyle = `rgb(${color.join(',')})`;
    ctx.arc(
      this.eyedropperCanvas.width / 2,
      this.eyedropperCanvas.height / 2,
      1.5 * scale,
      0,
      2 * Math.PI
    );
    ctx.fill();
  }

  private _processedCanvasCtx?: CanvasRenderingContext2D;

  private getProcessedImage() {
    if (!this._processedCanvasCtx) {
      const canvas = document.createElement('canvas');
      canvas.width = tilesetState.imageCanvas.width;
      canvas.height = tilesetState.imageCanvas.height;
      this._processedCanvasCtx = canvas.getContext('2d')!;
    }
    const blink = Math.floor(performance.now() / 500) % 2 === 0;
    const { currentTool } = tilesetState;
    let selectedColors: RGBColor[] = [];
    if (
      (currentTool === 'highlight-color' && blink) ||
      currentTool === 'merge-colors'
    ) {
      selectedColors = tilesetState.selectedColors;
    }
    let targetColors: RGBColor[] = [];
    if (currentTool === 'highlight-color') {
      targetColors = selectedColors.map(c => [
        255 - c[0],
        255 - c[1],
        255 - c[2],
      ]);
    } else if (currentTool === 'merge-colors') {
      targetColors = selectedColors.map(() => tilesetState.replacementColor!);
    }
    const imgWidth = tilesetState.imageCanvas.width;
    const imgHeight = tilesetState.imageCanvas.height;
    // Duplicate tilesetState.imageData so we don't modify the original
    const imageData = new ImageData(
      tilesetState.imageData.data.slice(0),
      imgWidth,
      imgHeight
    );
    const { data } = imageData;
    for (let i = 0; i < data.length / 4; i++) {
      const x = Math.floor((i % imgWidth) / TILE_SIZE);
      const y = Math.floor(i / imgWidth / TILE_SIZE);
      const tileIndex = this.getTileIndex(x, y);
      const tile = tilesetState.tiles[tileIndex];
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const colorIndex =
        tile && tile.paletteIndex === tilesetState.selectedPaletteIndex
          ? selectedColors.findIndex(
              c => c[0] === r && c[1] === g && c[2] === b
            )
          : -1;
      if (colorIndex >= 0) {
        const [r2, g2, b2] = targetColors[colorIndex];
        data[i * 4] = r2;
        data[i * 4 + 1] = g2;
        data[i * 4 + 2] = b2;
      } else if (
        tilesetState.transparencyColor &&
        colorsAreEqual([r, g, b], tilesetState.transparencyColor)
      ) {
        data[i * 4 + 3] = 0;
      }
    }
    this._processedCanvasCtx.putImageData(imageData, 0, 0);
    return this._processedCanvasCtx.canvas;
  }
}
