import { StateController } from '@lit-app/state';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { baseCss } from './common/base-css.js';
import { editorState } from './state/editor-state.js';

@customElement('view-options')
export class ViewOptions extends LitElement {
  static styles = css`
    :host {
      position: relative;
    }
    .title {
      font-weight: bold;
      padding-left: 3px;
    }
    .title::after {
      content: ':';
    }
    .option {
      padding-right: 10px;
    }
  `;

  ctrl = new StateController(this, editorState);

  updateState(e: Event) {
    const target = e.target as HTMLInputElement;
    const targetName = target.name;
    if (targetName in editorState.viewOptions) {
      editorState.viewOptions = {
        ...editorState.viewOptions,
        [targetName]: target.checked,
      };
    }
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <div class="container">
        <div class="title">View</div>
        <div class="options">
          <label class="option">
            <input
              type="checkbox"
              id="showGrid"
              name="showGrid"
              .checked=${editorState.viewOptions.showGrid}
              @change=${this.updateState}
            />
            <span>Grid</span>
          </label>
          <label class="option">
            <input
              type="checkbox"
              id="showPaletteNumbers"
              name="showPaletteNumbers"
              .checked=${editorState.viewOptions.showPaletteNumbers}
              @change=${this.updateState}
            />
            <span>Palette Numbers</span>
          </label>
        </div>
      </div>
    `;
  }
}
