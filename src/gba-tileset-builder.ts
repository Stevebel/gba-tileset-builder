import { LitElement, html, css } from 'lit';
import { property, customElement, state, queryAll } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';

import './tileset-viewer.js';
import './menu-bar.js';
import './palette/palette-panel.js';
import { StateController } from '@lit-app/state';
import {
  COLOR_PRIMARY_BG,
  COLOR_PRIMARY_FG,
  COLOR_PRIMARY_HIGHLIGHT,
  TILE_SIZE,
} from './common/constants.js';
import { RGBColor } from './common/tileset.interface.js';
import { imageToCanvas } from './common/utils.js';
import { tilesetState } from './common/tileset-state.js';

@customElement('gba-tileset-builder')
export class GbaTilesetBuilder extends LitElement {
  @property({ type: String }) header = 'Tileset Builder';

  @property() data = { value: 'Hello World' };

  @state() imageData: string | undefined;

  ctrl = new StateController(this, tilesetState);

  @queryAll('main > *') mainChildren!: HTMLElement[];

  static styles = css`
    :host {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      font-size: 14px;
      color: ${COLOR_PRIMARY_BG};
      margin: 0 auto;
    }

    main {
      display: flex;
      flex-grow: 1;
    }

    tileset-viewer {
      flex-grow: 1;
    }

    .app-footer {
      background: ${COLOR_PRIMARY_BG};
      color: ${COLOR_PRIMARY_FG};
      font-size: 12px;
      align-items: center;
      margin: 0;
      padding: 10px;
      border-top: 1px solid #000;
    }

    .app-footer a {
      margin-left: 5px;
    }

    a {
      color: ${COLOR_PRIMARY_FG};
    }
    a:hover {
      color: ${COLOR_PRIMARY_HIGHLIGHT};
    }
  `;

  render() {
    return html`
      <menu-bar></menu-bar>
      <main>
        <palette-panel></palette-panel>
        <tileset-viewer
          .tiles="${tilesetState.tiles}"
          imageData="${ifDefined(this.imageData)}"
        ></tileset-viewer>
      </main>

      <p class="app-footer">
        Made by
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/Stevebel"
          >Steven Beller</a
        >.
      </p>
    `;
  }

  firstUpdated() {
    this.addEventListener('menu-item-clicked', (e: Event) => {
      const event = e as CustomEvent;
      switch (event?.detail?.action) {
        case 'open':
          // Open file input dialog
          // eslint-disable-next-line no-case-declarations
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = changeEvent => {
            if (!changeEvent.target) return;
            const file = (changeEvent.target as HTMLInputElement).files![0];
            const reader = new FileReader();
            reader.onload = loadEvent => {
              const data = loadEvent.target?.result;
              if (data) {
                this.imageData = data as string;
                this.populateTileset();
              }
            };
            reader.readAsDataURL(file);
          };
          input.click();
          break;
        case 'save':
          console.log('save');
          break;
        default:
          console.warn('Unknown action', event?.detail?.action);
          break;
      }
    });
  }

  async populateTileset() {
    const canvas = await imageToCanvas(this.imageData!);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    tilesetState.tiles = [];
    let idx = 0;
    for (let y = 0; y < canvas.height; y += TILE_SIZE) {
      for (let x = 0; x < canvas.width; x += TILE_SIZE) {
        const tile = ctx.getImageData(x, y, TILE_SIZE, TILE_SIZE);
        const pixels: RGBColor[] = [];
        for (let i = 0; i < tile.data.length; i += 4) {
          pixels.push([tile.data[i], tile.data[i + 1], tile.data[i + 2]]);
        }
        tilesetState.tiles.push({
          tileIndex: idx,
          pixels,
          selected: false,
        });
        idx += 1;
      }
    }
  }
}
