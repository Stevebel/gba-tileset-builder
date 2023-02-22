import { display, getColor, serialize, sRGB, steps, to } from 'colorjs.io/fn';
import { ColorObject } from 'colorjs.io/types/src/color';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { COLOR_PRIMARY_BG, COLOR_PRIMARY_FG } from './common/constants.js';

@customElement('lch-color-picker')
export class MenuBar extends LitElement {
  static styles = css`
    :host {
      position: relative;
    }
    .color-info {
      display: flex;
      padding: 10px 0;
      align-items: center;
    }
    .swatch {
      width: 20px;
      height: 20px;
      border: 1px solid #000;
      margin: 0 10px;
    }
    .color-picker {
      display: none;
      flex-direction: column;
      align-items: stretch;
      position: absolute;
      top: 34px;
      left: 0;
      background: ${COLOR_PRIMARY_BG};
      padding: 10px;
      border: 1px solid #000;
      border-radius: 5px;
      box-shadow: 2px 4px 8px #000;
      width: 250px;
    }
    .color-picker.open {
      display: flex;
      z-index: 100;
    }
    .color-hex {
      background-color: ${COLOR_PRIMARY_BG};
      color: ${COLOR_PRIMARY_FG};
      font-size: 16px;
      width: 100px;
    }
    .color-slider-label {
      margin: 5px 0;
    }
    .color-slider {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 20px;
      border-radius: 5px;
      margin: 10px 0 0 0;
    }
    .color-slider::-webkit-slider-thumb {
      width: 1em;
      height: 22px;
      -webkit-appearance: none;
      border-radius: 3px;
      border: 1px solid black;
      box-shadow: 0 0 0 1px white;
    }

    .color-slider::-moz-range-thumb {
      width: 1em;
      height: 22px;
      border-radius: 3px;
      border: 1px solid black;
      box-shadow: 0 0 0 1px white;
      background: transparent;
    }
  `;

  @property({ type: String })
  // Getter and setter are required to trigger update when color is changed
  get color() {
    return this._color;
  }

  set color(value) {
    if (value !== this._color) {
      console.log(value, this._color);
      this._color = value;
      this.updateHex();
    }
  }

  private _color = '#000000';

  @state()
  private _open = false;

  @state()
  private _lightness = 0;

  @state()
  private _chroma = 0;

  @state()
  private _hue = 0;

  private _lightnessStops: string = '';

  private _chromaStops: string = '';

  private _hueStops: string = '';

  firstUpdated() {
    window.addEventListener('click', () => {
      this._open = false;
    });
    const colorPicker = this.shadowRoot?.querySelector('.color-picker');
    colorPicker!.addEventListener('click', e => {
      e.stopPropagation();
    });
  }

  updateLCH() {
    const color: ColorObject = {
      space: 'lch',
      coords: [this._lightness, this._chroma, this._hue],
    };
    this._color = serialize(to(color, sRGB), {
      format: 'hex',
      collapse: false,
    });
    this.updateStops();
    this.dispatchEvent(
      new CustomEvent('color-change', { detail: this._color })
    );
  }

  updateHex() {
    let color: ColorObject;
    try {
      color = getColor(this.color);
    } catch (e) {
      color = getColor('#000000');
    }
    const lch = to(color, 'lch');
    [this._lightness, this._chroma, this._hue] = lch.coords;

    this.updateStops();
  }

  updateStops() {
    const minLightness: ColorObject = {
      space: 'lch',
      coords: [0, this._chroma, this._hue],
    };
    const maxLightness: ColorObject = {
      space: 'lch',
      coords: [100, this._chroma, this._hue],
    };
    this._lightnessStops = this.stepsToStops(
      steps(minLightness, maxLightness, {
        space: 'lch',
        steps: 10,
        maxDeltaE: 3,
      })
    );

    const minChroma: ColorObject = {
      space: 'lch',
      coords: [this._lightness, 0, this._hue],
    };
    const maxChroma: ColorObject = {
      space: 'lch',
      coords: [this._lightness, 100, this._hue],
    };
    this._chromaStops = this.stepsToStops(
      steps(minChroma, maxChroma, { space: 'lch', steps: 10, maxDeltaE: 3 })
    );

    const minHue: ColorObject = {
      space: 'lch',
      coords: [this._lightness, this._chroma, 0],
    };
    const maxHue: ColorObject = {
      space: 'lch',
      coords: [this._lightness, this._chroma, 360],
    };
    this._hueStops = this.stepsToStops(
      steps(minHue, maxHue, {
        space: 'lch',
        steps: 10,
        maxDeltaE: 3,
        hue: 'raw',
      })
    );
  }

  private stepsToStops(colors: ColorObject[]) {
    return colors.map(c => display(c)).join(', ');
  }

  private _onLightnessChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this._lightness = Number(target.value);
    this.updateLCH();
  }

  private _onChromaChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this._chroma = Number(target.value);
    this.updateLCH();
  }

  private _onHueChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this._hue = Number(target.value);
    this.updateLCH();
  }

  private _onHexChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.color = target.value;
    this.dispatchEvent(
      new CustomEvent('color-change', { detail: this._color })
    );
  }

  togglePicker(e: Event) {
    e.stopPropagation();
    this._open = !this._open;
  }

  render() {
    return html`
      <div class="color-picker-container">
        <div class="color-info">
          <input
            class="color-hex"
            type="text"
            .value="${this.color}"
            @blur=${this._onHexChange}
          />
          <div
            class="swatch"
            style="background-color: ${this.color}"
            @click=${this.togglePicker}
          ></div>
        </div>
        <div class="color-picker ${this._open ? 'open' : ''}">
          <label class="color-slider-label">
            Lightness
            <input
              class="color-slider"
              type="range"
              min="0"
              max="100"
              .value="${this._lightness.toFixed(3)}"
              @input=${this._onLightnessChange}
              style="background: linear-gradient(to right, ${this
                ._lightnessStops})"
            />
          </label>
          <label class="color-slider-label">
            Chroma
            <input
              class="color-slider"
              type="range"
              min="0"
              max="100"
              .value="${this._chroma.toFixed(3)}"
              @input=${this._onChromaChange}
              style="background: linear-gradient(to right, ${this
                ._chromaStops})"
            />
          </label>
          <label class="color-slider-label">
            Hue
            <input
              class="color-slider"
              type="range"
              min="0"
              max="360"
              .value="${this._hue.toFixed(3)}"
              @input=${this._onHueChange}
              style="background: linear-gradient(to right, ${this._hueStops})"
            />
          </label>
        </div>
      </div>
    `;
  }
}
