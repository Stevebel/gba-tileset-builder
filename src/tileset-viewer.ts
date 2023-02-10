import { css, html, LitElement, PropertyValueMap } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  COLOR_ALT_BG,
  COLOR_PRIMARY_BG,
  TILE_SIZE,
} from './common/constants.js';
import { TilesetTile } from './common/tileset.interface.js';
import { imageToCanvas } from './common/utils.js';

@customElement('tileset-viewer')
export class TilesetViewer extends LitElement {
  static styles = css`
    :host {
      display: flex;
      background: ${COLOR_PRIMARY_BG};
    }
    .tileset-viewer {
      display: flex;
      flex-grow: 1;
      flex-direction: column;
      align-items: center;
      padding: 20px;

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
      object-fit: contain;
      image-rendering: pixelated;
    }
  `;

  @property()
  imageData: string | undefined;

  @property()
  tiles: TilesetTile[] = [];

  @property()
  backgroundColor = '#aaa';

  @query('#tileset-canvas')
  canvas!: HTMLCanvasElement;

  @state()
  private _scale = 4;

  @state()
  private _hoveredTile = { x: -1, y: -1 };

  @state()
  private _selectedTile = { x: -1, y: -1 };

  private _imageCanvas: HTMLCanvasElement | undefined;

  private tilesWide = 0;

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
      if (x !== this._hoveredTile.x || y !== this._hoveredTile.y) {
        this._hoveredTile = { x, y };
        this.renderTileset();
      }
    });
    // Select a tile
    this.canvas.addEventListener('click', e => {
      const { x, y } = this.getTileAt(e.offsetX, e.offsetY);
      this._selectedTile = { x, y };
      this.renderTileset();
      // Get image data for the selected tile
      const imageData = this.getTileImageData(x, y);
      const tileIndex = this.getTileIndex(x, y);
      this.dispatchEvent(
        new CustomEvent('tile-selected', {
          detail: { tileIndex, imageData, selectMultiple: e.shiftKey },
          bubbles: true,
          composed: true,
        })
      );
    });
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

  private getTileImageData(x: number, y: number): ImageData {
    // Render the tile to a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = TILE_SIZE;
    tempCanvas.height = TILE_SIZE;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      this._imageCanvas!,
      x * TILE_SIZE,
      y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
      TILE_SIZE,
      TILE_SIZE
    );
    return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  }

  protected async update(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ) {
    super.update(changedProperties);

    if (changedProperties.has('imageData')) {
      await this.updateImage();
      this.renderTileset();
    }
  }

  private async updateImage() {
    if (!this.imageData) {
      return;
    }
    this._imageCanvas = await imageToCanvas(this.imageData);
    this.tilesWide = Math.ceil(this._imageCanvas.width / TILE_SIZE);
  }

  get intScale() {
    return Math.max(1, Math.floor(this._scale));
  }

  renderTileset() {
    const scale = this.intScale;
    if (this._imageCanvas) {
      const img = this._imageCanvas;
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
      this.tiles
        .filter(t => t.selected)
        .forEach(t => {
          const { x, y } = this.getTileCoords(t.tileIndex);
          ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
          ctx.strokeStyle = '#fff';
          ctx.fillRect(x, y, TILE_SIZE * scale, TILE_SIZE * scale);
          ctx.strokeRect(x, y, TILE_SIZE * scale, TILE_SIZE * scale);
        });
      // Display the palette indexes of the tiles
      this.tiles
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
