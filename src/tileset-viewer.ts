import { StateController } from '@lit-app/state';
import { css, html, LitElement, PropertyValueMap } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  COLOR_ALT_BG,
  COLOR_PRIMARY_BG,
  TILE_SIZE,
} from './common/constants.js';
import { tilesetState } from './common/tileset-state.js';

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
  `;

  ctrl = new StateController(this, tilesetState);

  @property()
  backgroundColor = '#aaa';

  @query('#tileset-canvas')
  canvas!: HTMLCanvasElement;

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
      </div>
    `;
  }

  // Handle scroll wheel
  protected firstUpdated() {
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
      const { x, y } = this.getTileAt(e.offsetX, e.offsetY);
      this.applyTool(x, y, e.shiftKey ? 'shift' : '');
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
      const { x, y } = this.getTileAt(e.offsetX, e.offsetY);
      this.applyTool(x, y, e.shiftKey ? 'shift' : '');
      if (this._tool === 'select' || this._tool === 'deselect') {
        this._tool = 'hover';
      }
      this._lastSelectedTile = { x: -1, y: -1 };
    });

    setInterval(() => {
      // Refesh if last render time is more than .1 seconds ago
      if (performance.now() - this._lastRenderTime > 100) {
        this.renderTileset();
      }
    }, 100);
  }

  private applyTool(x: number, y: number, modifier: string) {
    const tileIndex = this.getTileIndex(x, y);
    switch (this._tool) {
      case 'hover':
        if (x !== this._hoveredTile.x || y !== this._hoveredTile.y) {
          this._hoveredTile = { x, y };
          this.renderTileset();
        }
        break;
      case 'select':
      case 'deselect':
        if (x !== this._lastSelectedTile.x || y !== this._lastSelectedTile.y) {
          this._lastSelectedTile = { x, y };
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

  // private getTileImageData(x: number, y: number): ImageData {
  //   // Render the tile to a temporary canvas
  //   const tempCanvas = document.createElement('canvas');
  //   tempCanvas.width = TILE_SIZE;
  //   tempCanvas.height = TILE_SIZE;
  //   const ctx = tempCanvas.getContext('2d')!;
  //   ctx.imageSmoothingEnabled = false;

  //   ctx.drawImage(
  //     tilesetState.imageCanvas!,
  //     x * TILE_SIZE,
  //     y * TILE_SIZE,
  //     TILE_SIZE,
  //     TILE_SIZE,
  //     0,
  //     0,
  //     TILE_SIZE,
  //     TILE_SIZE
  //   );
  //   return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  // }

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

  private getProcessedImage() {
    const img = tilesetState.imageCanvas;
    const blink = Math.floor(performance.now() / 500) % 2 === 0;
    const { selectedColors, currentTool } = tilesetState;
    if (
      currentTool === 'highlight-color' &&
      selectedColors?.length > 0 &&
      blink
    ) {
      // Copy to a new canvas so we don't modify the original
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      // Replace pixels that match the selected colors with inverted colors
      const invertedColors = selectedColors.map(c => [
        255 - c[0],
        255 - c[1],
        255 - c[2],
      ]);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const { data } = imageData;
      for (let i = 0; i < data.length / 4; i++) {
        const x = Math.floor((i % img.width) / TILE_SIZE);
        const y = Math.floor(i / img.width / TILE_SIZE);
        const tileIndex = this.getTileIndex(x, y);
        const tile = tilesetState.tiles[tileIndex];
        if (tile && tile.paletteIndex === tilesetState.selectedPaletteIndex) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          const colorIndex = selectedColors.findIndex(
            c => c[0] === r && c[1] === g && c[2] === b
          );
          if (colorIndex >= 0) {
            const [r2, g2, b2] = invertedColors[colorIndex];
            data[i * 4] = r2;
            data[i * 4 + 1] = g2;
            data[i * 4 + 2] = b2;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      return canvas;
    }
    return img;
  }
}
