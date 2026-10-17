import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { longLine, marsOrbitJson, planetsJson } from '../../test/code';
import { CodeBlock } from './CodeBlock';
import { highlightCode } from './tokenize';

const isPhone = window.innerWidth < 640;

describe('highlightCode', () => {
  it('colours JSON keys, strings, numbers and literals, line by line', () => {
    const lines = highlightCode('{\n  "a": "b",\n  "n": 2, "ok": true\n}', 'json');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContainEqual({ type: 'property', text: '"a"' });
    expect(lines[1]).toContainEqual({ type: 'string', text: '"b"' });
    expect(lines[2]).toContainEqual({ type: 'number', text: '2' });
    expect(lines[2]).toContainEqual({ type: 'keyword', text: 'true' });
  });

  it('splits a multi-line comment across lines', () => {
    const lines = highlightCode('a /* one\ntwo */ b', 'typescript');
    expect(lines[0]).toContainEqual({ type: 'comment', text: '/* one' });
    expect(lines[1]).toContainEqual({ type: 'comment', text: 'two */' });
  });
});

describe('CodeBlock', () => {
  it('is a figure named by its title, showing the code', () => {
    render(<CodeBlock code={planetsJson} language="json" title="planets.json" />);
    const figure = screen.getByRole('figure', { name: 'planets.json' });
    expect(figure.textContent).toContain('"radiusKm": 6371');
  });

  it('copies the exact code and announces it', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<CodeBlock code={planetsJson} language="json" aria-label="Planets" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(planetsJson);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByText('Copied', { selector: '[aria-live]' })).toBeInTheDocument();
    writeText.mockRestore();
  });

  it('renders markup in the code as text', () => {
    const { container } = render(
      <CodeBlock code={'<script>window.hacked = 1</script><img src=x onerror="alert(1)">'} />,
    );
    expect(container.querySelector('script, img')).toBeNull();
    expect(container.textContent).toContain('<script>');
  });

  it('marks highlighted lines and hides line numbers from screen readers', () => {
    const { container } = render(
      <CodeBlock code={marsOrbitJson} language="json" hasLineNumbers highlightedLines={[6]} />,
    );
    const marked = container.querySelectorAll('.bg-code-highlight');
    expect(marked).toHaveLength(1);
    expect(marked[0]?.textContent).toContain('"eccentricity": 0.0934');
    expect(container.querySelector('pre [aria-hidden="true"]')?.textContent).toBe('1');
  });

  it('scrolls a long line inside itself, focusable only when it scrolls, and wraps on request', async () => {
    render(
      <div className="w-72">
        <CodeBlock code={longLine} language="bash" aria-label="Command" />
      </div>,
    );
    const area = screen.getByRole('figure').querySelector('pre')?.parentElement;
    await expect.poll(() => area?.getAttribute('tabindex')).toBe('0');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await userEvent.click(screen.getByRole('button', { name: 'Wrap lines' }));
    expect(screen.getByRole('button', { name: 'Wrap lines' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect.poll(() => area?.hasAttribute('tabindex')).toBe(false);
  });

  it.runIf(isPhone)('never makes the page scroll sideways on a phone', () => {
    render(<CodeBlock code={longLine.repeat(3)} language="bash" title="long.sh" hasLineNumbers />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CodeBlock
        code={marsOrbitJson}
        language="json"
        title="mars.json"
        hasLineNumbers
        highlightedLines={[6]}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
