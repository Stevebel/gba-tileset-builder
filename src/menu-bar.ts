import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { baseCss } from './common/base-css.js';

import './main-menu.js';

@customElement('menu-bar')
export class MenuBar extends LitElement {
  static styles = css`
    :host {
      display: flex;
      background: #171818;
      padding: 10px;
      color: #fff;
      align-items: baseline;
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
