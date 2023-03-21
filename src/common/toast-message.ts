import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

// A simple toast message component, displaying the contents of the
// Light DOM for the specified duration when the "show" method is called.
@customElement('toast-message')
export class ToastMessage extends LitElement {
  // The duration to display the toast message, in seconds.
  @property({ type: Number })
  duration = 3;

  @query('.toast')
  toast!: HTMLElement;

  timeout: number | null = null;

  render() {
    return html`
      <div class="toast">
        <!-- Icon slot -->
        <slot name="icon"></slot>
        <!-- Message slot -->
        <slot></slot>
      </div>
    `;
  }

  // Styles
  static styles = css`
    :host {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 100;
    }
    .toast {
      position: relative;
      opacity: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      background: #333;
      color: #fff;
      font-size: 16px;
      padding: 10px 20px;
      border-radius: 5px;
      box-shadow: 2px 4px 8px #000;
      transition: opacity 0.5s, bottom 0.5s;
    }
    .toast.show {
      opacity: 1;
      bottom: 30px;
    }
    .toast > * {
      display: block;
      margin: 0 10px;
      pointer-events: none;
    }
    slot[name='icon'] {
      width: 24px;
      height: 24px;
      font-size: 20px;
    }
  `;

  // Show the toast message for the specified duration.
  show() {
    if (this.timeout != null) {
      window.clearTimeout(this.timeout);
    }

    this.toast.classList.add('show');

    this.timeout = window.setTimeout(() => {
      this.toast.classList.remove('show');
    }, this.duration * 1000);
  }
}
