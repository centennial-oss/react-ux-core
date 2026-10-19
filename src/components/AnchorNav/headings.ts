// AnchorNav's links gathered from the headings in a container (Markdown, Prose or any HTML), kept current as it
// changes.

import { useEffect, useState, type RefObject } from 'react';
import { slugify } from '../SlugField/slugify';

/** A link gathered from a heading: its id, its text, and the headings under it. */
export interface HeadingLink {
  id: string;
  label: string;
  children: HeadingLink[];
}

const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const NONE: readonly HeadingLink[] = [];

/** The ids given to headings here, with the text each came from. */
const given = new WeakMap<Element, { id: string; text: string }>();

/**
 * `heading`'s id, giving it a unique one from its text first when it has none (`Getting started` → `getting-started`).
 * An id given here is given again when the text changes, as it does when React reuses the element for new content.
 */
function idOf(heading: Element, text: string, taken: ReadonlySet<string>): string {
  const mine = given.get(heading);
  const isStale = mine?.id === heading.id && mine.text !== text;
  if (heading.id !== '' && !isStale) {
    return heading.id;
  }
  const doc = heading.ownerDocument;
  const base = slugify(text) || 'section';
  let id = base;
  for (let suffix = 2; ; suffix++) {
    const owner = doc.getElementById(id);
    if (!taken.has(id) && (owner === null || owner === heading)) {
      break;
    }
    id = `${base}-${String(suffix)}`;
  }
  heading.id = id;
  given.set(heading, { id, text });
  return id;
}

/**
 * The headings in `container` (outside `skip`) as nested links, down to `maxDepth` levels below the highest level
 * present, with a key that changes only when the links do. Headings without an id are given one from their text, so
 * the links have somewhere to go and the page can be linked to; empty headings are left out.
 */
export function gatherHeadings(
  container: Element,
  maxDepth: number,
  skip: Element | null,
): { links: HeadingLink[]; key: string } {
  const found: { heading: Element; level: number; text: string }[] = [];
  let top = 7;
  for (const heading of container.querySelectorAll(HEADINGS)) {
    const text = heading.textContent.trim();
    if (text !== '' && !skip?.contains(heading)) {
      const level = Number(heading.tagName[1]);
      found.push({ heading, level, text });
      top = Math.min(top, level);
    }
  }
  const links: HeadingLink[] = [];
  const taken = new Set<string>();
  // The open headings above the current one, highest first.
  const stack: { level: number; link: HeadingLink }[] = [];
  let key = '';
  for (const { heading, level, text } of found) {
    if (level >= top + maxDepth) {
      continue;
    }
    const id = idOf(heading, text, taken);
    if (taken.has(id)) {
      continue;
    }
    taken.add(id);
    key += `${String(level)} ${id} ${text}\n`;
    const link: HeadingLink = { id, label: text, children: [] };
    while ((stack.at(-1)?.level ?? 0) >= level) {
      stack.pop();
    }
    (stack.at(-1)?.link.children ?? links).push(link);
    stack.push({ level, link });
  }
  return { links, key };
}

/**
 * The links for the headings in `contentRef`'s element (none without one), gathered after it renders and again
 * whenever its content changes, with a MutationObserver. New links are set only when the headings changed, so the
 * component settles. Headings inside `skipRef` (the nav itself) don't count.
 */
export function useHeadingLinks(
  contentRef: RefObject<HTMLElement | null> | undefined,
  maxDepth: number,
  skipRef: RefObject<Element | null>,
): readonly HeadingLink[] {
  const [links, setLinks] = useState(NONE);
  // Not a layout effect: a ref on content rendered after the nav isn't attached yet when the nav's layout effects run.
  useEffect(() => {
    const container = contentRef?.current;
    if (!container) {
      return;
    }
    let lastKey = '';
    const update = () => {
      const next = gatherHeadings(container, maxDepth, skipRef.current);
      if (next.key !== lastKey) {
        lastKey = next.key;
        setLinks(next.links);
      }
    };
    update();
    const observer = new MutationObserver((records) => {
      const skip = skipRef.current;
      if (!skip || records.some((record) => !skip.contains(record.target))) {
        update();
      }
    });
    observer.observe(container, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [contentRef, maxDepth, skipRef]);
  return links;
}
