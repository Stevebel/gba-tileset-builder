import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { baseCss } from '../common/base-css.js';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from '../common/constants.js';
import { Tileset } from '../common/tileset.interface.js';

@customElement('palette-panel')
export class MenuBar extends LitElement {
  static styles = css`
    :host {
      background: ${COLOR_PRIMARY_BG};
      color: ${COLOR_PRIMARY_FG};
      padding: 10px;
      box-shadow: 3px 0 10px rgba(0, 0, 0, 0.5);
      z-index: 10;
    }
  `;

  @property()
  tileset: Tileset | undefined;

  render() {
    console.log(this.tileset);
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <h3>Palette Panel</h3>
    `;
  }
}
