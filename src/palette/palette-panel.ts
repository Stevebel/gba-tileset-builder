import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { baseCss } from '../common/base-css.js';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from '../common/constants.js';
import { TilesetTile, RGBColor } from '../common/tileset.interface.js';

@customElement('palette-panel')
export class MenuBar extends LitElement {
  static styles = css`
    :host {
      background: ${COLOR_PRIMARY_BG};
      color: ${COLOR_PRIMARY_FG};
      padding: 10px;
      box-shadow: 3px 0 10px rgba(0, 0, 0, 0.5);
      z-index: 10;
      min-width: 300px;
    }
  `;

  @property()
  tiles: TilesetTile[] = [];

  tilesWithNoPaletteSelected() {
    return this.tiles?.some(tile => tile.selected && tile.paletteIndex == null);
  }

  addPalette() {
    const selectedTiles = this.tiles?.filter(tile => tile.selected);
    console.log('addPalette', selectedTiles);
    const colorSet = new Set<string>();
    const colors: RGBColor[] = [];

    selectedTiles?.forEach(tile => {
      tile.pixels?.forEach(pixel => {
        const color = pixel.join(',');
        if (!colorSet.has(color)) {
          colorSet.add(color);
          colors.push(pixel);
        }
      });
    });

    this.dispatchEvent(
      new CustomEvent('add-palette', {
        detail: {
          colors,
          tiles: selectedTiles,
        },
        bubbles: true,
      })
    );
  }

  protected firstUpdated() {
    this.addEventListener('tileset-updated', () => {
      console.log('tileset-updated');
      this.requestUpdate();
    });
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <h3>Palette Panel</h3>
      <div class="overall-actions">
        <button class="btn btn-primary" @click="${this.addPalette}">
          Add
          Palette${this.tilesWithNoPaletteSelected() ? ' From Selected' : ''}
        </button>
      </div>
    `;
  }
}
