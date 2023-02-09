import { css, html, LitElement, PropertyValueMap } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

@customElement('tileset-viewer')
export class TilesetViewer extends LitElement {
  static styles = css`
    :host {
      display: flex;
      min-width: 300px;
      background: #aaa;
      flex-direction: column;
      align-items: center;
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
  private _scale = 0.5;

  @state()
  private _hoveredTile = { x: -1, y: -1 };

  @state()
  private _selectedTile = { x: -1, y: -1 };

  render() {
    return html`
      <div>Tileset Viewer</div>
      <canvas id="tileset-canvas"></canvas>
    `;
  }

  // Handle scroll wheel
  protected firstUpdated() {
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.deltaY > 0 && this._scale > 0.5) {
        this._scale -= 0.25;
      } else if (e.deltaY < 0 && this._scale < 8) {
        this._scale += 0.25;
      }
      console.log(this._scale);
      this.renderTileset();
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
      this.getTileImageData(x, y).then(imageData => {
        console.log(imageData);
        this.dispatchEvent(
          new CustomEvent('tile-selected', {
            detail: { x, y, imageData },
            bubbles: true,
            composed: true,
          })
        );
      });
    });
  }

  private getTileAt(x: number, y: number): { x: number; y: number } {
    const scale = this.intScale;
    const tileX = Math.floor(x / (8 * scale));
    const tileY = Math.floor(y / (8 * scale));
    return { x: tileX, y: tileY };
  }

  private getTileImageData(x: number, y: number): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      // Render the tile to a temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 8;
      tempCanvas.height = 8;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, x * 8, y * 8, 8, 8, 0, 0, 8, 8);
        resolve(ctx.getImageData(0, 0, 8, 8));
      };
      img.onerror = reject;
      img.src = this.imageData!;
    });
  }

  protected update(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.update(changedProperties);

    if (changedProperties.has('imageData')) {
      this.renderTileset();
    }
  }

  get intScale() {
    return Math.max(1, Math.floor(this._scale));
  }

  renderTileset() {
    const scale = this.intScale;
    if (this.imageData) {
      const img = new Image();
      img.onload = () => {
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
      };
      img.src = this.imageData;
    }
  }
}
