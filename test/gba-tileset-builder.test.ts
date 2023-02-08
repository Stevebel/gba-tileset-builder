import { html } from 'lit';
import { fixture, expect } from '@open-wc/testing';

import type { GbaTilesetBuilder } from '../src/gba-tileset-builder.js';
import '../src/gba-tileset-builder.js';

describe('GbaTilesetBuilder', () => {
  let element: GbaTilesetBuilder;
  beforeEach(async () => {
    element = await fixture(html`<gba-tileset-builder></gba-tileset-builder>`);
  });

  it('renders a h1', () => {
    const h1 = element.shadowRoot!.querySelector('h1')!;
    expect(h1).to.exist;
    expect(h1.textContent).to.equal('My app');
  });

  it('passes the a11y audit', async () => {
    await expect(element).shadowDom.to.be.accessible();
  });
});
