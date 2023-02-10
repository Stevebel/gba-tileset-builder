import { css, html, LitElement, PropertyValueMap } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { COLOR_ALT_BG, COLOR_PRIMARY_BG } from './common/constants.js';
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
      this.dispatchEvent(
        new CustomEvent('tile-selected', {
          detail: { x, y, imageData },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  private getTileAt(x: number, y: number): { x: number; y: number } {
    const scale = this.intScale;
    const tileX = Math.floor(x / (8 * scale));
    const tileY = Math.floor(y / (8 * scale));
    return { x: tileX, y: tileY };
  }

  private getTileImageData(x: number, y: number): ImageData {
    // Render the tile to a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 8;
    tempCanvas.height = 8;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(this._imageCanvas!, x * 8, y * 8, 8, 8, 0, 0, 8, 8);
    return ctx.getImageData(0, 0, 8, 8);
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
      ctx.fillStyle = '#7f7f7f';
      ctx.globalCompositeOperation = 'difference';
      for (let x = 0; x < img.width; x += 8) {
        for (let y = 0; y < img.height; y += 8) {
          ctx.fillRect(x * scale, y * scale, 8 * scale, 1);
          ctx.fillRect(x * scale, y * scale, 1, 8 * scale);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      // Draw a border around the hovered tile
      if (this._hoveredTile.x >= 0 && this._hoveredTile.y >= 0) {
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = Math.max(1, Math.floor(scale / 2));
        ctx.strokeRect(
          this._hoveredTile.x * 8 * scale,
          this._hoveredTile.y * 8 * scale,
          8 * scale,
          8 * scale
        );
      }
      // Highlight the selected tile
      if (this._selectedTile.x >= 0 && this._selectedTile.y >= 0) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.strokeStyle = '#fff';
        ctx.fillRect(
          this._selectedTile.x * 8 * scale,
          this._selectedTile.y * 8 * scale,
          8 * scale,
          8 * scale
        );
        ctx.strokeRect(
          this._selectedTile.x * 8 * scale,
          this._selectedTile.y * 8 * scale,
          8 * scale,
          8 * scale
        );
      }
    }
  }
}
