import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { baseCss } from './common/base-css.js';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from './common/constants.js';

import './main-menu.js';

@customElement('menu-bar')
export class MenuBar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      background: ${COLOR_PRIMARY_BG};
      padding: 10px;
      color: ${COLOR_PRIMARY_FG};
      align-items: baseline;
      border-bottom: 1px solid #000;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
      z-index: 20;
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

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <main-menu></main-menu>
      <div class="title">Tileset Builder</div>
      <div class="version">v0.0.1</div>
    `;
  }
}
