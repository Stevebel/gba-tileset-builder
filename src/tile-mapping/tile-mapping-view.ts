import { css, html, LitElement, PropertyValueMap } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { colorToRgb } from '../common/color-utils.js';
import { COLOR_ALT_BG, COLOR_PRIMARY_BG } from '../common/constants.js';
import {
  coordsToTileIndex,
  pixelToTileIndex,
  tileIndexToCoords,
  tileIndexToPixelCoords,
} from '../common/utils.js';
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
  paletteIndex?: number;
  outputIndex?: number;
  isDuplicate: boolean;
  isDragging: boolean;
  selected: boolean;
  blank: boolean;
}

@customElement('tile-mapping-view')
export class TileMappingView extends LitElement {
  ctrl = new TilesetDocumentStateController(this);

  private tiles: MappingTile[] = [];

  private selectedTiles: MappingTile[] = [];

  private hoveredOutputIndex: number | null = null;

  private inputDirty = true;

  private outputDirty = true;

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
      position: relative;
    }
    #input-canvas {
      position: absolute;
      image-rendering: pixelated;
    }
    #input-tiles {
      position: relative;
      display: grid;
      grid-template-columns: repeat(var(--tiles-wide), 1fr);
    }
    #output-tile-container {
      flex-shrink: 0;
    }
    #output-tiles {
      position: relative;
      display: grid;
      grid-template-columns: repeat(16, 1fr);
    }
    #output-canvas {
      position: absolute;
      image-rendering: pixelated;
      width: 384px;
      height: 768px;
    }
    .tile {
      box-sizing: border-box;
      width: 24px;
      height: 24px;
      cursor: move;
      border: 1px solid black;
    }
    .tile:hover {
      border: 1px solid white;
    }
    .tile.mapped,
    .tile.duplicate,
    .tile.blank {
      cursor: default;
      border: 1px solid #666;
    }
    .tile.selected {
      border: 2px solid yellow;
    }
    .tile.matches-mapped,
    .tile.matches-input {
      border: 2px solid red;
    }

    .empty.dragged-over {
      background-color: #ffff00;
    }
  `;

  constructor() {
    super();
    while (editorState.currentDocument.tileMapping.length < 512) {
      editorState.currentDocument.tileMapping.push(-1);
    }
  }

  willUpdate(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (!editorState.currentDocument?.imageData || changedProperties.size > 0) {
      setTimeout(() => this.requestUpdate(), 100);
      return;
    }
    // Set tiles wide CSS variable
    this.style.setProperty(
      '--tiles-wide',
      (editorState.currentDocument.tilesWide || 16).toString(10)
    );
    const tileInfo = getTilesWithDuplicateInfo();

    let newTiles: MappingTile[] = this.tiles;

    if (this.inputDirty) {
      newTiles = tileInfo.map((tile, i) => ({
        tileIndex: tile.tileIndex,
        paletteIndex: tile.paletteIndex,
        isDuplicate: tile.duplicateIndex != null,
        isDragging: false,
        selected: this.tiles[i]?.selected,
        blank: true,
        outputIndex: editorState.currentDocument.tileMapping.indexOf(
          tile.tileIndex
        ),
      }));
      newTiles.sort((a, b) => a.tileIndex - b.tileIndex);
    }

    this.tiles.length = 0;
    this.tiles.push(...newTiles);
  }

  private drawInput(newTiles: MappingTile[]) {
    const doc = editorState.currentDocument;

    if (!doc.imageData) {
      return;
    }

    const transparentColor = colorToRgb(doc.transparencyColor);

    const canvas = this.shadowRoot!.getElementById(
      'input-canvas'
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    canvas.width = doc.imageData.width;
    canvas.height = doc.imageData.height;
    canvas.style.width = `${doc.imageData.width * 3}px`;
    canvas.style.height = `${doc.imageData.height * 3}px`;
    ctx.drawImage(doc.imageCanvas, 0, 0);
    const imageData = ctx.getImageData(
      0,
      0,
      doc.imageData.width,
      doc.imageData.height
    );
    const { data } = imageData;
    for (let i = 0; i < data.length; i += 4) {
      const tileIndex = pixelToTileIndex(i / 4, doc.imageData.width);
      const tile = newTiles[tileIndex];
      if (tile.isDuplicate || (tile.outputIndex ?? -1) >= 0) {
        data[i + 3] = 160;
      }

      if (
        tile.paletteIndex == null ||
        (data[i] === transparentColor[0] &&
          data[i + 1] === transparentColor[1] &&
          data[i + 2] === transparentColor[2])
      ) {
        data[i + 3] = 0;
      } else {
        tile.blank = false;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const inputTiles = this.shadowRoot!.querySelectorAll('#input-tiles .tile');
    inputTiles.forEach(tileEl => {
      const tileIndex = Number((tileEl as HTMLElement).dataset.tileIndex);
      const tile = newTiles[tileIndex];
      if (tile.blank) {
        tileEl.classList.add('blank');
      } else {
        tileEl.classList.remove('blank');
      }
    });
  }

  private drawOutput(newTiles: MappingTile[]) {
    const doc = editorState.currentDocument;

    if (!doc.imageData) {
      return;
    }
    const transparentColor = colorToRgb(doc.transparencyColor);
    const inputData = doc.imageData;
    const canvas = this.shadowRoot!.getElementById(
      'output-canvas'
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 128;
    canvas.height = 256;
    const imageData = ctx.getImageData(0, 0, 128, 256);
    const { data } = imageData;
    const ghostInfo = this.getGhostInfo();
    for (let i = 0; i < data.length; i += 4) {
      const pixelNum = i / 4;
      const outputIndex = pixelToTileIndex(pixelNum, 128);
      let mapping = editorState.currentDocument.tileMapping[outputIndex];
      const ghostMapping = ghostInfo?.get(outputIndex)?.tileIndex;
      if (mapping < 0 && ghostMapping != null) {
        mapping = ghostMapping;
      }
      if (mapping >= 0) {
        const tile = newTiles[mapping];
        if (tile?.paletteIndex != null) {
          const offsetX = pixelNum % 8;
          const offsetY = Math.floor(pixelNum / 128) % 8;
          const { x: inputTileX, y: inputTileY } = tileIndexToPixelCoords(
            mapping,
            doc.tilesWide
          );
          const inputPixelIndex =
            ((inputTileY + offsetY) * inputData.width +
              (inputTileX + offsetX)) *
            4;
          const [r, g, b] = inputData.data.slice(
            inputPixelIndex,
            inputPixelIndex + 3
          );
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          if (
            r === transparentColor[0] &&
            g === transparentColor[1] &&
            b === transparentColor[2]
          ) {
            data[i + 3] = 0;
          } else if (ghostMapping != null) {
            data[i + 3] = 160;
          } else {
            data[i + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private getGhostInfo() {
    if (
      this.selectedTiles?.length > 0 &&
      (this.hoveredOutputIndex ?? -1) >= 0
    ) {
      const doc = editorState.currentDocument;
      this.selectedTiles.sort((a, b) => a.tileIndex - b.tileIndex);
      const firstTile = this.selectedTiles[0];
      const { x: inStartX, y: inStartY } = tileIndexToCoords(
        firstTile.tileIndex,
        doc.tilesWide
      );
      const { x: outStartX, y: outStartY } = tileIndexToCoords(
        this.hoveredOutputIndex!,
        16
      );
      const [offsetX, offsetY] = [outStartX - inStartX, outStartY - inStartY];

      const ghostInfo: Map<number, MappingTile> = new Map();
      for (const tile of this.selectedTiles) {
        const { x: inX, y: inY } = tileIndexToCoords(
          tile.tileIndex,
          doc.tilesWide
        );
        if (inX + offsetX >= 16 || inY + offsetY >= 32) {
          return null;
        }
        const outIndex = coordsToTileIndex(inX + offsetX, inY + offsetY, 16);
        if (doc.tileMapping[outIndex] >= 0) {
          return null;
        }
        ghostInfo.set(outIndex, tile);
      }
      return ghostInfo;
    }
    return null;
  }

  protected updated(): void {
    if (this.inputDirty) {
      this.drawInput(this.tiles);
    }
    if (this.outputDirty) {
      this.drawOutput(this.tiles);
    }

    const inputTiles = this.shadowRoot!.querySelectorAll('#input-tiles .tile');
    inputTiles.forEach(tile => {
      tile.addEventListener('dragstart', this.handleDragStart);
      tile.addEventListener('dragend', this.handleDragEnd);
      tile.addEventListener('click', this.selectTile);
      tile.addEventListener('mouseenter', this.handleMouseEnterInputTile);
    });
    const outputTiles = this.shadowRoot!.querySelectorAll(
      '#output-tiles .tile'
    );
    outputTiles.forEach(tile => {
      tile.addEventListener('dragover', this.handleDragOver);
      tile.addEventListener('drop', this.handleDrop);
      tile.addEventListener('dragstart', this.handleDragStart);
      tile.addEventListener('dragend', this.handleDragEnd);
      tile.addEventListener('mouseenter', this.handleMouseEnterSlot);
      tile.addEventListener('click', this.stampSelected);
    });
  }

  private handleDragStart = (ev: Event) => {
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

  private handleDragEnd = (ev: Event) => {
    const e = ev as DragEvent;
    const tile = e.currentTarget as HTMLElement;
    const tileIndex = parseInt(tile.dataset.tileIndex!, 10);
    const mappingTile = this.tiles[tileIndex];
    mappingTile.isDragging = false;
    tile.classList.remove('dragging');
  };

  private selectTile = (ev: Event) => {
    const e = ev as MouseEvent;
    const tile = e.currentTarget as HTMLElement;
    const tileIndex = parseInt(tile.dataset.tileIndex!, 10);
    const { outputIndex } = tile.dataset;
    const tileInfo = this.tiles[tileIndex];
    if (
      tileInfo &&
      !tileInfo.blank &&
      !tileInfo.isDuplicate &&
      (outputIndex || (tileInfo.outputIndex ?? -1) === -1) &&
      tileInfo.paletteIndex != null
    ) {
      tileInfo.selected = !tileInfo.selected;
      if (tileInfo.selected) {
        this.selectedTiles.push(tileInfo);
      } else {
        this.selectedTiles.splice(this.selectedTiles.indexOf(tileInfo), 1);
      }
      this.requestUpdate();
    }
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

      if ((mappingTile.outputIndex ?? -1) >= 0) {
        this.inputDirty = true;
      }
      this.outputDirty = true;

      mappingTile.outputIndex = outputIndex;
      editorState.currentDocument.tileMapping =
        editorState.currentDocument.tileMapping.map((currTileIndex, i) => {
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

  private handleMouseEnterSlot = (ev: Event) => {
    const e = ev as MouseEvent;
    const slot = e.currentTarget as HTMLElement;
    const tileIndex = slot.dataset.tileIndex
      ? parseInt(slot.dataset.tileIndex, 10)
      : null;
    const matchedTile = this.shadowRoot!.querySelector(
      `#input-tiles .tile.matches-mapped`
    );
    if (matchedTile) {
      matchedTile.classList.remove('matches-mapped');
    }
    if (tileIndex) {
      this.hoveredOutputIndex = -1;
      const inputTile = this.shadowRoot!.querySelector(
        `#input-tiles .tile[data-tile-index="${tileIndex}"]`
      );
      inputTile?.classList.add('matches-mapped');
    }
    const outputIndex = parseInt(slot.dataset.outputIndex!, 10);
    if (!Number.isNaN(outputIndex) && this.hoveredOutputIndex !== outputIndex) {
      this.hoveredOutputIndex = outputIndex;
      if (this.selectedTiles.length > 0) {
        this.outputDirty = true;
        this.requestUpdate();
      }
    }
  };

  private handleMouseEnterInputTile = (ev: Event) => {
    const e = ev as MouseEvent;
    const tile = e.currentTarget as HTMLElement;
    let tileIndex = parseInt(tile.dataset.tileIndex!, 10);
    const { duplicateIndex } = editorState.currentDocument.tiles[tileIndex];
    if (duplicateIndex != null) {
      tileIndex = duplicateIndex;
    }
    const { outputIndex } = this.tiles[tileIndex];
    const matchedSlot = this.shadowRoot!.querySelector(
      `#output-tiles .tile.matches-input`
    );
    if (matchedSlot) {
      matchedSlot.classList.remove('matches-input');
    }
    if ((outputIndex ?? -1) >= 0) {
      this.hoveredOutputIndex = -1;
      const outputSlot = this.shadowRoot!.querySelector(
        `#output-tiles .tile[data-output-index="${outputIndex}"]`
      );
      outputSlot!.classList.add('matches-input');
    }
  };

  private stampSelected = () => {
    const ghostInfo = this.getGhostInfo();
    if (ghostInfo) {
      const doc = editorState.currentDocument;
      const tileMapping = [...doc.tileMapping];
      ghostInfo.forEach((tile, outputIndex) => {
        const { tileIndex } = tile;
        const mappingTile = this.tiles[tileIndex];
        mappingTile.outputIndex = outputIndex;
        mappingTile.selected = false;
        tileMapping[outputIndex] = tileIndex;
      });
      this.selectedTiles = [];
      this.outputDirty = true;
      doc.tileMapping = tileMapping;
      this.requestUpdate();
    }
  };

  render() {
    return html`
      <div id="tile-mapping-view">
        <div id="input-tile-container">
          <canvas id="input-canvas"></canvas>
          <div id="input-tiles">
            ${this.tiles.map(
              tile => html` <div
                class="tile ${tile.isDuplicate
                  ? 'duplicate'
                  : ''} ${tile.selected
                  ? 'selected'
                  : ''} ${(tile.outputIndex ?? -1) >= 0 ? 'mapped' : ''}"
                draggable="true"
                data-tile-index="${tile.tileIndex}"
              ></div>`
            )}
          </div>
        </div>
        <div id="output-tile-container">
          <canvas id="output-canvas"></canvas>
          <div id="output-tiles">
            ${editorState.currentDocument.tileMapping.map(
              (tileIndex, i) => html` <div
                class="tile ${tileIndex === -1
                  ? 'empty'
                  : 'mapped'} ${tileIndex !== -1 &&
                this.tiles[tileIndex]?.selected
                  ? 'selected'
                  : ''}"
                data-output-index="${i}"
                data-tile-index="${tileIndex}"
                draggable="${tileIndex !== -1}"
                dropzone="${ifDefined(tileIndex === -1 ? 'move' : undefined)}"
              ></div>`
            )}
          </div>
        </div>
      </div>
    `;
  }
}
