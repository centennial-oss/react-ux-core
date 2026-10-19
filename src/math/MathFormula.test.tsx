import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import {
  alignedEquations,
  combustion,
  invalidFormula,
  longFormula,
  quadraticFormula,
} from '../../test/math';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import { MathFormula } from './MathFormula';
import type { MathMessages } from './messages';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;

/** Copies from `element` the way the browser does, and returns the plain text put on the clipboard. */
function copyFrom(element: Element): string {
  const clipboardData = new DataTransfer();
  element.dispatchEvent(
    new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true }),
  );
  return clipboardData.getData('text/plain');
}

describe('MathFormula', () => {
  it('renders inline MathML in running text', () => {
    const { container } = render(
      <p>
        The roots are <MathFormula tex={quadraticFormula} />.
      </p>,
    );
    const root = container.querySelector('[data-math-display="inline"]');
    expect(root?.tagName).toBe('SPAN');
    const math = root?.querySelector('math');
    expect(math).not.toBeNull();
    expect(math?.getAttribute('display')).toBeNull();
    expect(math?.querySelector('mfrac msqrt msup')).not.toBeNull();
    // MathML inherits the text colour, so formulas follow the theme.
    expect(getComputedStyle(math as Element).color).toBe(
      getComputedStyle(container.querySelector('p') as Element).color,
    );
  });

  it('renders a centred, labelled block formula that links can target by id', () => {
    render(<MathFormula tex={alignedEquations} display="block" label="(3)" id="eq-3" />);
    const root = document.getElementById('eq-3');
    expect(root?.dataset.mathDisplay).toBe('block');
    expect(root?.querySelector('math[display="block"] mtable')).not.toBeNull();
    expect(root?.textContent).toContain('(3)');
    // aligned's columns line up (MathML Core has no columnalign, so classes do it).
    const right = root?.querySelector('mtd.tml-right') ?? document.body;
    expect(getComputedStyle(right).textAlign).toMatch(/right$/);
  });

  it('scrolls a long block formula inside a focusable region, not the page', async () => {
    render(
      <div className="w-60">
        <MathFormula tex={longFormula} display="block" label="(7)" />
      </div>,
    );
    const region = await screen.findByRole('region', { name: 'Equation (7)' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('keeps short block formulas out of the tab order', () => {
    render(<MathFormula tex="E = mc^2" display="block" />);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('copies the TeX source', () => {
    const { container } = render(<MathFormula tex={quadraticFormula} />);
    const inner = container.querySelector('math mfrac') ?? document.body;
    expect(copyFrom(inner)).toBe(quadraticFormula);
  });

  it('shows the source and the parser’s message for invalid TeX, without throwing', async () => {
    const { container } = render(<MathFormula tex={invalidFormula} />);
    expect(container.querySelector('math')).toBeNull();
    expect(container.querySelector('code')?.textContent).toBe(invalidFormula);
    expect(container.querySelector('[data-math-display]')).toHaveAttribute('data-math-error');
    const details = screen.getByRole('button', { name: 'Formula error details' });
    if (isTouch) {
      await commands.tap('[aria-label="Formula error details"]');
    } else {
      await userEvent.click(details);
    }
    const dialog = await screen.findByRole('dialog', { name: 'Formula error details' });
    expect(dialog.textContent).toEqual(
      expect.stringContaining('This formula couldn’t be displayed'),
    );
    expect(dialog.textContent).toEqual(expect.stringContaining('Unexpected end of input'));
  });

  it('uses a custom fallback', () => {
    render(<MathFormula tex={invalidFormula} fallback={<em>See the worked solution.</em>} />);
    expect(screen.getByText('See the worked solution.')).toBeInTheDocument();
  });

  it('needs hasChemistry for \\ce', () => {
    const { container, rerender } = render(<MathFormula tex={combustion} display="block" />);
    expect(container.querySelector('math')).toBeNull();
    rerender(<MathFormula tex={combustion} display="block" hasChemistry />);
    expect(container.querySelector('math mover')?.textContent).toContain('→');
  });

  it('takes an aria-label override', () => {
    render(<MathFormula tex={'\\frac{a}{b}'} aria-label="a over b" />);
    expect(screen.getByRole('math', { name: 'a over b' })).toBeInTheDocument();
  });

  it('opens the error details by keyboard', async () => {
    if (!isDesktop) {
      return;
    }
    render(<MathFormula tex={invalidFormula} />);
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Formula error details' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('takes its strings from UIProvider', async () => {
    const messages: Partial<Messages> & Partial<MathMessages> = {
      formulaErrorDetails: 'Détails de l’erreur',
      formulaRegion: ({ label }) => `Équation ${label}`,
    };
    render(
      <UIProvider messages={messages as Partial<Messages>}>
        <MathFormula tex={invalidFormula} />
        <div className="w-40">
          <MathFormula tex={longFormula} display="block" label="(1)" />
        </div>
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Détails de l’erreur' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Équation (1)' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <p>
          Inline <MathFormula tex={quadraticFormula} /> and an error{' '}
          <MathFormula tex={invalidFormula} />.
        </p>
        <MathFormula tex={alignedEquations} display="block" label="(2)" />
        <div className="w-48">
          <MathFormula tex={longFormula} display="block" />
        </div>
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
