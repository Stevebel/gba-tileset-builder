import { css, html, LitElement, PropertyValueMap } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { colorToRgb } from '../common/color-utils.js';
import {
  COLOR_ALT_BG,
  COLOR_PRIMARY_BG,
  TILE_SIZE,
} from '../common/constants.js';
import { tileIndexToPixelCoords } from '../common/utils.js';
import { getTilesWithDuplicateInfo } from '../find-duplicates.js';
import { editorState } from '../state/editor-state.js';
import { TilesetDocumentStateController } from '../state/tileset-document-state-controller.js';

/* This view takes the tiles from the document's image and maps them
 * to positions in the standard 128x256 tileset. Tiles can only be moved
 * to positions that are empty on the output side. Tiles that are moved
 * leave behind an empty slot. Duplicate tiles on the input side are
 * highlighted and may not be moved. */

interface MappingTile {
  tileIndex: number;
  tileImageSrc: string | null;
  outputIndex?: number;
  isDuplicate: boolean;
  isDragging: boolean;
}

@customElement('tile-mapping-view')
export class TileMappingView extends LitElement {
  ctrl = new TilesetDocumentStateController(this);

  private tiles: MappingTile[] = [];

  private outputMapping: number[] = new Array(512);

  // Styles
  static styles = css`
    :host {
      display: block;
      flex-grow: 1;

      background-color: ${COLOR_PRIMARY_BG};
    }
    #tile-mapping-view {
      display: flex;
      width: calc(100vw - 320px);

      background-image: linear-gradient(
          45deg,
          ${COLOR_ALT_BG} 25%,
          rgba(0, 0, 0, 0) 25%
        ),
        linear-gradient(-45deg, ${COLOR_ALT_BG} 25%, rgba(0, 0, 0, 0) 25%),
        linear-gradient(45deg, rgba(0, 0, 0, 0) 75%, ${COLOR_ALT_BG} 75%),
        linear-gradient(-45deg, rgba(0, 0, 0, 0) 75%, ${COLOR_ALT_BG} 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    #input-tile-container,
    #output-tile-container {
      overflow: auto;
      max-height: calc(100vh - 80px);
    }
    #input-tiles {
      display: grid;
      grid-template-columns: repeat(var(--tiles-wide), 1fr);
    }
    #output-tile-container {
      flex-shrink: 0;
    }
    #output-tiles {
      display: grid;
      grid-template-columns: repeat(16, 1fr);
    }
    .tile {
      width: 24px;
      height: 24px;
      cursor: move;
      border: 1px solid black;
    }
    .tile img {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
    }
    .tile.mapped,
    .tile.duplicate {
      cursor: default;
      opacity: 0.25;
    }

    .empty.dragged-over {
      background-color: #ffff00;
    }
  `;

  constructor() {
    super();
    for (let i = 0; i < 512; i++) {
      this.outputMapping[i] = -1;
    }
  }

  willUpdate(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (
      !editorState.currentDocument?.imageData ||
      changedProperties.size > 0 ||
      this.tiles.length > 0
    ) {
      return;
    }
    // Set tiles wide CSS variable
    this.style.setProperty(
      '--tiles-wide',
      (editorState.currentDocument.tilesWide || 16).toString(10)
    );
    console.log('Loading tiles');
    const tileInfo = getTilesWithDuplicateInfo();
    const doc = editorState.currentDocument;
    const transparentColor = colorToRgb(doc.transparencyColor);
    const newTiles = tileInfo.map(tile => {
      let tileImageSrc: string | null = null;
      if (tile.paletteIndex != null) {
        // Get the tile's portion of the image as a data URL.
        const canvas = document.createElement('canvas');
        canvas.width = TILE_SIZE;
        canvas.height = TILE_SIZE;
        const ctx = canvas.getContext('2d')!;
        const { x, y } = tileIndexToPixelCoords(tile.tileIndex, doc.tilesWide);
        ctx.drawImage(
          doc.imageCanvas,
          x,
          y,
          TILE_SIZE,
          TILE_SIZE,
          0,
          0,
          TILE_SIZE,
          TILE_SIZE
        );
        // Set all pixels that match the transparent color to transparent.
        const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
        const { data } = imageData;
        let hasNonTransparentPixels = false;
        for (let i = 0; i < data.length; i += 4) {
          if (
            data[i] === transparentColor[0] &&
            data[i + 1] === transparentColor[1] &&
            data[i + 2] === transparentColor[2]
          ) {
            data[i + 3] = 0;
          } else {
            hasNonTransparentPixels = true;
          }
        }
        if (!hasNonTransparentPixels) {
          tile.duplicateIndex = -1;
        }
        ctx.putImageData(imageData, 0, 0);
        tileImageSrc = canvas.toDataURL();
      }

      return {
        tileIndex: tile.tileIndex,
        tileImageSrc,
        isDuplicate: tile.duplicateIndex != null,
        isDragging: false,
      } satisfies MappingTile;
    });
    newTiles.sort((a, b) => a.tileIndex - b.tileIndex);
    this.tiles.length = 0;
    this.tiles.push(...newTiles);
  }

  protected updated(): void {
    const inputTiles = this.shadowRoot!.querySelectorAll('#input-tiles .tile');
    inputTiles.forEach(tile => {
      tile.removeEventListener('dragstart', this.handleInputDragStart);
      tile.removeEventListener('dragend', this.handleInputDragEnd);

      tile.addEventListener('dragstart', this.handleInputDragStart);
      tile.addEventListener('dragend', this.handleInputDragEnd);
    });
    const outputTiles = this.shadowRoot!.querySelectorAll(
      '#output-tiles .tile'
    );
    outputTiles.forEach(tile => {
      tile.removeEventListener('dragover', this.handleDragOver);
      tile.removeEventListener('drop', this.handleDrop);

      tile.addEventListener('dragover', this.handleDragOver);
      tile.addEventListener('drop', this.handleDrop);
      tile.addEventListener('dragstart', this.handleInputDragStart);
      tile.addEventListener('dragend', this.handleInputDragEnd);
    });
  }

  private handleInputDragStart = (ev: Event) => {
    const e = ev as DragEvent;
    const tile = e.currentTarget as HTMLElement;
    const tileIndex = parseInt(tile.dataset.tileIndex!, 10);
    if (Number.isNaN(tileIndex) || tileIndex < 0) {
      e.preventDefault();
      return;
    }

    const mappingTile = this.tiles[tileIndex];
    mappingTile.isDragging = true;
    tile.classList.add('dragging');
    e.dataTransfer!.setData('text/plain', tileIndex.toString(10));
  };

  private handleInputDragEnd = (ev: Event) => {
    const e = ev as DragEvent;
    const tile = e.currentTarget as HTMLElement;
    const tileIndex = parseInt(tile.dataset.tileIndex!, 10);
    const mappingTile = this.tiles[tileIndex];
    mappingTile.isDragging = false;
    tile.classList.remove('dragging');
  };

  private handleDragOver = (ev: Event) => {
    const e = ev as DragEvent;
    e.preventDefault();
    const slot = e.currentTarget as HTMLElement;
    this.shadowRoot!.querySelectorAll('.dragged-over').forEach(tile => {
      tile.classList.remove('dragged-over');
    });
    if (slot.classList.contains('empty')) {
      slot.classList.add('dragged-over');
      return true;
    }
    return false;
  };

  private handleDrop = (ev: Event) => {
    const e = ev as DragEvent;
    e.preventDefault();
    this.shadowRoot!.querySelectorAll('.dragged-over').forEach(tile => {
      tile.classList.remove('dragged-over');
    });
    const slot = e.currentTarget as HTMLElement;
    if (slot.classList.contains('empty')) {
      const outputIndex = parseInt(slot.dataset.outputIndex!, 10);
      const tileIndex = parseInt(e.dataTransfer!.getData('text/plain'), 10);
      const mappingTile = this.tiles[tileIndex];
      mappingTile.outputIndex = outputIndex;
      this.outputMapping = this.outputMapping.map((currTileIndex, i) => {
        if (i === outputIndex) {
          return tileIndex;
        }
        if (currTileIndex === tileIndex) {
          return -1;
        }
        return currTileIndex;
      });
      this.requestUpdate();
    }
  };

  render() {
    return html`
      <div id="tile-mapping-view">
        <div id="input-tile-container">
          <div id="input-tiles">
            ${this.tiles.map(
              tile => html` <div
                class="tile ${tile.isDuplicate
                  ? 'duplicate'
                  : ''} ${tile.outputIndex != null ? 'mapped' : ''}"
                draggable="true"
                data-tile-index="${tile.tileIndex}"
              >
                ${tile.tileImageSrc
                  ? html`
                      <img
                        src="${tile.tileImageSrc}"
                        alt="Tile ${tile.tileIndex}"
                      />
                    `
                  : ''}
              </div>`
            )}
          </div>
        </div>
        <div id="output-tile-container">
          <div id="output-tiles">
            ${this.outputMapping.map(
              (tileIndex, i) => html` <div
                class="tile ${tileIndex === -1 ? 'empty' : ''}"
                data-output-index="${i}"
                data-tile-index="${tileIndex}"
                draggable="${tileIndex !== -1}"
                dropzone="${ifDefined(tileIndex === -1 ? 'move' : undefined)}"
              >
                ${tileIndex !== -1 && this.tiles[tileIndex].tileImageSrc
                  ? html`<img
                      src="${this.tiles[tileIndex].tileImageSrc!}"
                      alt="Tile ${tileIndex}"
                    />`
                  : ''}
              </div>`
            )}
          </div>
        </div>
      </div>
    `;
  }
}
