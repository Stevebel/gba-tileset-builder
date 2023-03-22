import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { baseCss } from './common/base-css.js';

import './main-menu.js';
import { editorState } from './state/editor-state.js';
import './tool-menu.js';
import './view-options.js';

@customElement('menu-bar')
export class MenuBar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      background: rgb(67, 66, 66);
      padding: 0 10px;
      color: rgb(204, 197, 185);
      align-items: center;
      border-bottom: 1px solid rgb(0, 0, 0);
      box-shadow: rgb(0 0 0 / 50%) 0px 3px 10px;
      z-index: 20;
      height: 44px;
    }
    .title {
      font-size: 1.5em;
      margin-left: 10px;
    }
    .version {
      font-size: 0.8em;
      margin-left: 2px;
      color: #aaa;
    }
  `;

  // Add listener for keyboard shortcuts
  firstUpdated() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'z' && e.ctrlKey) {
      editorState.history.undo();
    }
    if ((e.key === 'y' || e.key === 'Z') && e.ctrlKey) {
      editorState.history.redo();
    }
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <main-menu></main-menu>
      <div class="title">Tileset Builder</div>
      <div class="version">v0.9.1</div>
      <tool-menu></tool-menu>
      <view-options></view-options>
    `;
  }
}
