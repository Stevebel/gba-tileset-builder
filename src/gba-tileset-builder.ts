import { css, html, LitElement } from 'lit';
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from 'lit/decorators.js';

import { StateController } from '@lit-app/state';
import { ExecutionInfo } from './commands/history.js';
import {
  COLOR_PRIMARY_BG,
  COLOR_PRIMARY_FG,
  COLOR_PRIMARY_HIGHLIGHT,
} from './common/constants.js';
import './common/toast-message.js';
import { downloadCompleteExportZip } from './export-handler.js';
import { watchForFindDuplicates } from './find-duplicates.js';
import './menu-bar.js';
import './palette/merge-panel.js';
import './palette/palette-panel.js';
import { editorState } from './state/editor-state.js';
import './tileset-viewer.js';

@customElement('gba-tileset-builder')
export class GbaTilesetBuilder extends LitElement {
  @property({ type: String }) header = 'Tileset Builder';

  @property() data = { value: 'Hello World' };

  @state()
  private _lastActionType: ExecutionInfo['type'] = 'execute';

  @state()
  private _lastActionDescription = 'No actions yet';

  ctrl = new StateController(this, editorState);

  @queryAll('main > *') mainChildren!: HTMLElement[];

  @query('toast-message') toastMessage!: any;

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
        <merge-panel></merge-panel>
        <tileset-viewer
          .tiles="${editorState.currentDocument.tiles}"
        ></tileset-viewer>
        <toast-message>
          <span slot="icon">
            ${this._lastActionType === 'undo'
              ? html`<span role="img" aria-label="Undo">↩️</span>`
              : html`<span role="img" aria-label="Redo">↪️</span>`}
          </span>
          ${this._lastActionDescription}
        </toast-message>
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
                editorState.open(data as string);
              }
            };
            reader.readAsDataURL(file);
          };
          input.click();
          break;
        case 'save':
          console.log('save');
          break;
        case 'export':
          downloadCompleteExportZip();
          break;
        default:
          console.warn('Unknown action', event?.detail?.action);
          break;
      }
    });
    // Display toast for command history changes
    editorState.currentDocumentChange
      .flatMap(doc => doc.history.stateChange)
      .subscribe(execInfo => {
        this._lastActionType = execInfo.type;
        this._lastActionDescription = execInfo.description;
        this.toastMessage.show();
      });
    watchForFindDuplicates();
  }
}
