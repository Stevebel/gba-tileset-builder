import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseCss } from './common/base-css.js';

@customElement('main-menu')
export class MenuBar extends LitElement {
  static styles = css`
    :host {
      position: relative;
    }
    .menu-button {
      font-size: 1.5em;
      cursor: pointer;
    }
    .menu {
      position: absolute;
      top: 25px;
      left: 0;
      background: #171818;
      list-style: none;
      margin: 0;
      padding: 0;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      border: 1px solid #000;
    }
    .menu.closed {
      display: none;
    }
    .menu-item {
      white-space: nowrap;
      padding: 10px 20px;
      cursor: pointer;
    }
    .menu-item * {
      pointer-events: none;
    }

    .menu-button:hover,
    .menu-item:hover {
      color: #e7ffbc;
    }
    .menu-item:hover {
      background: #2a302a;
    }
    .menu-item-icon {
      margin-right: 10px;
    }
  `;

  @property({ type: Array }) menuItems = [
    { name: 'Open', icon: 'fa-folder-open', action: 'open' },
    { name: 'Save', icon: 'fa-save', action: 'save' },
  ];

  @state() menuOpen = false;

  firstUpdated() {
    window.addEventListener('click', () => {
      this.menuOpen = false;
    });
  }

  toggleMenu(e: MouseEvent) {
    this.menuOpen = !this.menuOpen;
    e.stopPropagation();
  }

  selectItem(e: MouseEvent) {
    const target = e.target as HTMLElement;
    this.dispatchEvent(
      new CustomEvent('menu-item-clicked', {
        detail: {
          action: target.dataset.action,
        },
        bubbles: true,
        composed: true,
      })
    );
    this.menuOpen = false;
    e.stopPropagation();
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <i
        class="menu-button fa fa-bars"
        @click="${this.toggleMenu}"
        @keyup="${this.toggleMenu}"
      ></i>

      <ul class="menu ${this.menuOpen ? 'open' : 'closed'}">
        ${this.menuItems.map(
          item => html`
            <li
              class="menu-item"
              data-action="${item.action}"
              @click="${this.selectItem}"
            >
              <i class="menu-item-icon fa ${item.icon}"></i>
              <span class="menu-item-name">${item.name}</span>
            </li>
          `
        )}
      </ul>
    `;
  }
}
