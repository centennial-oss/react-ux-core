import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe';
import { explanationMarkdown, labMarkdown } from '../../test/code';
import { statisticsMarkdown } from '../../test/math';
import type { LinkComponentProps } from '../provider/link';
import { UIProvider } from '../provider/UIProvider';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('shows raw HTML as text and never runs it', () => {
    const { container } = render(
      <Markdown>
        {
          'Hello <script>window.injected = true</script> <img src="x" onerror="window.injected = true">'
        }
      </Markdown>,
    );
    expect(container.querySelector('script, img')).toBeNull();
    expect(container.textContent).toContain('<script>');
    expect((window as { injected?: boolean }).injected).toBeUndefined();
  });

  it('drops javascript: links', () => {
    render(<Markdown>{'[click](javascript:alert(1))'}</Markdown>);
    expect(screen.queryByRole('link')?.getAttribute('href') ?? '').not.toContain('javascript');
  });

  it('shifts headings under the page’s own, capped at h6', () => {
    render(
      <Markdown headingLevel={3}>{'# Top\n\n## Next\n\n#### Deep\n\n###### Deepest'}</Markdown>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Top' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Next' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 6, name: 'Deep' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 6, name: 'Deepest' })).toBeInTheDocument();
  });

  it('routes internal links through the LinkComponent, and opens external ones safely in a new tab', () => {
    function AppLink({ children, ...props }: LinkComponentProps) {
      return (
        <a data-router="" {...props}>
          {children}
        </a>
      );
    }
    render(
      <UIProvider LinkComponent={AppLink}>
        <Markdown>{explanationMarkdown}</Markdown>
      </UIProvider>,
    );
    expect(screen.getByRole('link', { name: 'kinematics drill' })).toHaveAttribute('data-router');
    const external = screen.getByRole('link', { name: /Free fall/ });
    expect(external).not.toHaveAttribute('data-router');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAccessibleName('Free fall (opens in a new tab)');
  });

  it('renders fenced code through CodeBlock, or as plain monospace', () => {
    const { unmount } = render(<Markdown>{explanationMarkdown}</Markdown>);
    expect(screen.getByRole('figure', { name: 'json code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    unmount();
    const { container } = render(<Markdown hasCodeBlocks={false}>{explanationMarkdown}</Markdown>);
    expect(screen.queryByRole('figure')).toBeNull();
    expect(container.querySelector('pre code')?.textContent).toContain('"g_ms2": 9.81');
  });

  it('labels read-only task checkboxes and keeps table headers', () => {
    render(<Markdown>{labMarkdown}</Markdown>);
    const done = screen.getByRole('checkbox', { name: /view of the evening sky/ });
    expect(done).toBeChecked();
    expect(done).toBeDisabled();
    const table = within(screen.getByRole('region', { name: 'Table' })).getByRole('table');
    expect(within(table).getAllByRole('columnheader')[0]).toHaveAttribute('scope', 'col');
    const centred = within(table).getAllByRole('columnheader')[1];
    expect(centred).toHaveClass('text-center');
    expect(getComputedStyle(centred as Element).textAlign).toBe('center');
    // A code block draws its own box; Prose's styles for plain <pre> don't add a second one.
    const block = screen.getAllByRole('figure')[0]?.querySelector('pre');
    expect(getComputedStyle(block as Element).borderTopWidth).toBe('0px');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Markdown>{labMarkdown}</Markdown>);
    await expectNoAxeViolations(container);
  });

  describe('hasMath', () => {
    async function formulasReady(container: HTMLElement) {
      await expect
        .poll(() =>
          [...container.querySelectorAll('[data-math-status]')].map((node) =>
            node.getAttribute('data-math-status'),
          ),
        )
        .toEqual(Array.from({ length: 7 }, () => 'ready'));
    }

    it('renders $…$ inline and $$…$$ as a block formula, loading the converter on demand', async () => {
      const { container } = render(<Markdown hasMath>{statisticsMarkdown}</Markdown>);
      await formulasReady(container);
      const [mean] = container.querySelectorAll('p [data-math-display="inline"]');
      expect(mean?.querySelector('math mover mi')?.textContent).toBe('x');
      const block = container.querySelector('[data-math-display="block"]');
      expect(block?.parentElement).toBe(container.firstElementChild);
      expect(block?.closest('p')).toBeNull();
      expect(block?.querySelector('math[display="block"] mfrac msqrt')).not.toBeNull();
      // The paragraph around the block splits in two, and currency and code stay text.
      const paragraphs = [...container.querySelectorAll('p')].map(
        (paragraph) => paragraph.textContent,
      );
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[1]).toEqual(
        expect.stringContaining('Prices such as $5 and $10 stay plain text'),
      );
      expect(container.querySelector('p code')?.textContent).toBe('$x$');
      await expectNoAxeViolations(container);
    });

    it('copies a formula as its TeX source', async () => {
      const { container } = render(<Markdown hasMath>{'Mean: $\\bar{x}$'}</Markdown>);
      await expect
        .poll(() => container.querySelector('[data-math-status]')?.getAttribute('data-math-status'))
        .toBe('ready');
      const formula = container.querySelector('[data-math-display="inline"] math');
      const clipboardData = new DataTransfer();
      formula?.dispatchEvent(
        new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true }),
      );
      expect(clipboardData.getData('text/plain')).toBe('\\bar{x}');
    });

    it('leaves dollar signs alone without hasMath', () => {
      const { container } = render(<Markdown>{statisticsMarkdown}</Markdown>);
      expect(container.querySelector('[data-math-status]')).toBeNull();
      expect(container.textContent).toContain('$\\bar{x}$');
    });
  });
});
