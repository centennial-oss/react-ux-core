import { afterEach, describe, expect, it } from 'vitest';
import { focusTarget, TABBABLE_SELECTOR } from './focus';

afterEach(() => {
  document.body.replaceChildren();
});

describe('TABBABLE_SELECTOR', () => {
  it('matches what Tab reaches, and nothing else', () => {
    document.body.innerHTML = `
      <a href="#" id="link"></a><a id="anchor"></a>
      <button id="button"></button><button id="disabled" disabled></button>
      <input id="text" /><input id="hidden" type="hidden" />
      <textarea id="area"></textarea><select id="select"></select>
      <div id="editable" contenteditable="true"></div>
      <div id="tabbable" tabindex="0"></div><div id="programmatic" tabindex="-1"></div>`;
    const ids = [...document.querySelectorAll(TABBABLE_SELECTOR)].map((element) => element.id);
    expect(ids).toEqual(['link', 'button', 'text', 'area', 'select', 'editable', 'tabbable']);
  });
});

describe('focusTarget', () => {
  it('focuses a heading by script, leaving it out of the Tab order', () => {
    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.href = '#x';
    document.body.append(heading, link);
    focusTarget(heading);
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute('tabindex')).toBe('-1');
    focusTarget(link);
    expect(document.activeElement).toBe(link);
    expect(link.hasAttribute('tabindex')).toBe(false);
  });

  it("doesn't scroll to the element", () => {
    const heading = document.createElement('h2');
    heading.style.marginTop = '3000px';
    document.body.append(heading);
    focusTarget(heading);
    expect(window.scrollY).toBe(0);
  });
});
