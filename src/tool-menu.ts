import { StateController } from '@lit-app/state';
import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { baseCss } from './common/base-css.js';
import {
  COLOR_PRIMARY_FG,
  COLOR_PRIMARY_HIGHLIGHT,
  ToolType,
} from './common/constants.js';

import './main-menu.js';
import { editorState } from './state/editor-state.js';

@customElement('tool-menu')
export class ToolMenu extends LitElement {
  static styles = css`
    :host {
      color: ${COLOR_PRIMARY_FG};
      flex-grow: 1;
    }
    .tools {
      display: flex;
      height: 34px;
      justify-content: center;
    }
    .tool-button {
      height: 100%;
      display: flex;
      align-items: center;
      padding: 0 5px;
      border: 1px solid transparent;
      border-left: 1px solid black;
    }
    .tool-button:last-child {
      border-right: 1px solid black;
    }
    .tool-button:not(.selected):hover {
      color: ${COLOR_PRIMARY_HIGHLIGHT};
      border: 1px solid ${COLOR_PRIMARY_HIGHLIGHT};
      box-shadow: inset 0 0 5px 1px ${COLOR_PRIMARY_HIGHLIGHT};
    }
    .tool-button.selected {
      color: white;
      border: 1px solid black;
      background: radial-gradient(transparent 50%, rgb(0 0 0 / 50%) 100%);
    }
    .tool-button.selected:hover {
      background: radial-gradient(transparent 50%, rgb(0 0 0 / 20%) 100%);
      border: 1px solid rgb(255 255 255 / 30%);
    }
    .tool-button svg {
      fill: ${COLOR_PRIMARY_FG};
    }
  `;

  ctrl = new StateController(this, editorState);

  updated() {
    const toolButtons = this.shadowRoot!.querySelectorAll('.tool-button');
    toolButtons.forEach(button => {
      const { toolType } = (button as HTMLElement).dataset;
      button.addEventListener('click', () => {
        if (toolType) {
          editorState.selectTool(toolType as ToolType);
          toolButtons.forEach(b => b.classList.remove('selected'));
          button.classList.add('selected');
        }
      });
      if (toolType === editorState.currentTool) {
        button.classList.add('selected');
      }
    });
  }

  render() {
    return html`
      <style type="text/css">
        ${baseCss}
      </style>
      <div class="tools">
        <!-- Select tool -->
        <div class="tool-button" data-tool-type="select" title="Select">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path
              d="M20.978 13.21a1 1 0 0 0-.396-1.024l-14-10a.999.999 0 0 0-1.575.931l2 17a1 1 0 0 0 1.767.516l3.612-4.416 3.377 5.46 1.701-1.052-3.357-5.428 6.089-1.218a.995.995 0 0 0 .782-.769z"
              fill="currentColor"
            />
          </svg>
        </div>
        <!-- Box selection tool -->
        <div class="tool-button" data-tool-type="select-box" title="Box Select">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 18 18"
          >
            <path
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              d="M3,12 L3,13 L4,13 L4,15 L1,15 L1,12 L3,12 Z M8.19418406,6.94648449 L8.29786,6.9848 L13.5406,9.2317 C14.4056875,9.60243125 14.3154524,10.8303997 13.45886,11.1016009 L13.3428,11.1314 L12.6785,11.2643 L14.7071,13.2929 C15.0976,13.6834 15.0976,14.3166 14.7071,14.7071 C14.3466385,15.0675615 13.7793793,15.0952893 13.3871027,14.7902834 L13.2929,14.7071 L11.2643,12.6785 L11.1314,13.3428 C10.946825,14.265675 9.72661311,14.4304085 9.28477742,13.6480353 L9.23171,13.5406 L6.9848,8.29787 C6.64401667,7.50271208 7.40030219,6.69909568 8.19418406,6.94648449 Z M3,6 L3,10 L1,10 L1,6 L3,6 Z M4,1 L4,3 L3,3 L3,4 L1,4 L1,1 L4,1 Z M15,1 L15,4 L13,4 L13,3 L12,3 L12,1 L15,1 Z M10,1 L10,3 L6,3 L6,1 L10,1 Z"
            />
          </svg>
        </div>
        <!-- Highlight tool -->
        <div
          class="tool-button"
          data-tool-type="highlight-color"
          title="Highlight"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
          >
            <path
              xmlns="http://www.w3.org/2000/svg"
              d="m 2,3 c 4.1454497,3.8086831 5.001124,6.000148 5,11 h 5 5 C 19.998876,9.000148 20.85455,6.8086833 22,3 H 12 Z m 6,13 v 10 l 8,-6.154297 V 16 Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <!-- Merge tool -->
        <div class="tool-button" data-tool-type="merge-colors" title="Merge">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="-1 -4 36 36"
          >
            <path
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              d="M29,0v5.515c0,2.138-0.833,4.147-2.344,5.658l-7.484,7.484c-0.176,0.176-0.329,0.368-0.467,0.568  c-0.357-1.384-1.041-2.661-2.014-3.744l7.138-7.138C24.584,7.588,25,6.583,25,5.515V0H29z M18,24.343v-2.858  c0-2.138-0.833-4.147-2.344-5.657L8.172,8.342C7.416,7.588,7,6.583,7,5.515V0H3v5.515c0,2.138,0.833,4.147,2.344,5.657l7.484,7.486  C13.584,19.412,14,20.417,14,21.485v2.858l-2.596-2.596l-2.828,2.828L16,32l7.425-7.425l-2.828-2.828L18,24.343z"
            />
          </svg>
        </div>
        <!-- Remove Duplicates tool -->
        <div
          class="tool-button"
          data-tool-type="find-duplicates"
          title="Remove Duplicates"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 1920 1920"
          >
            <path
              xmlns="http://www.w3.org/2000/svg"
              d="M0 1920h1242.353V677.647H0V1920ZM1581.176 338.824v1242.352h-225.882V564.706H338.824V338.824h1242.352ZM903.53 1242.353v112.941H338.824v-112.941h564.705ZM1920.034-.011v1242.353h-225.882V225.872H677.68V-.012h1242.353Z"
              fill-rule="evenodd"
              fill="currentColor"
            />
          </svg>
        </div>
        <!-- Map Tiles tool -->
        <div class="tool-button" data-tool-type="map-tiles" title="Map Tiles">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="1 1 23 23"
            fill="none"
          >
            <path
              d="M7.62906 3.56969C7.80845 3.47184 7.99906 3.62237 7.99906 3.8267V17.3825C7.99906 17.6058 7.84665 17.7946 7.64926 17.8988C7.64249 17.9024 7.63576 17.906 7.62906 17.9097L5.27906 19.2497C3.63906 20.1897 2.28906 19.4097 2.28906 17.5097V7.77969C2.28906 7.14969 2.73906 6.36969 3.29906 6.04969L7.62906 3.56969Z"
              fill="currentColor"
            />
            <path
              d="M14.7219 6.1029C14.8922 6.18725 15 6.36089 15 6.55096V19.7041C15 20.0726 14.615 20.3145 14.283 20.1546L10.033 18.107C9.85998 18.0236 9.75 17.8485 9.75 17.6565V4.4462C9.75 4.07534 10.1396 3.83355 10.4719 3.99814L14.7219 6.1029Z"
              fill="currentColor"
            />
            <path
              d="M22 6.49006V16.2201C22 16.8501 21.55 17.6301 20.99 17.9501L17.4986 19.951C17.1653 20.1421 16.75 19.9014 16.75 19.5172V6.33038C16.75 6.15087 16.8462 5.98513 17.0021 5.89615L19.01 4.75006C20.65 3.81006 22 4.59006 22 6.49006Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    `;
  }
}
