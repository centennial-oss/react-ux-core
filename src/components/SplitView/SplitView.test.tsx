import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import type { Messages } from '../../provider/messages';
import { UIProvider } from '../../provider/UIProvider';
import type { SplitViewMessages } from './messages';
import { SplitView, type SplitViewProps } from './SplitView';

// Wide enough to sit side by side on every test screen (the phone instance is 360 px wide, so it's narrower).
const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

function View(props: Partial<SplitViewProps> & { width?: number }) {
  const { width = 900, ...rest } = props;
  return (
    <div style={{ width, height: 300 }}>
      <SplitView
        paneLabels={['Planets', 'Details']}
        defaultSizes={[40, 60]}
        minSizes={[20, '180px']}
        {...rest}
      >
        <div data-testid="list">Mercury, Venus, Earth</div>
        <div data-testid="detail">Earth is the third planet.</div>
      </SplitView>
    </div>
  );
}

function handle(): HTMLElement {
  return screen.getByRole('separator', { name: 'Resize Planets' });
}

function paneWidth(testId: string): number {
  return screen.getByTestId(testId).parentElement?.getBoundingClientRect().width ?? 0;
}

describe('SplitView', () => {
  it.skipIf(isPhone)('renders panes with a labelled separator handle between them', () => {
    render(<View />);
    const separator = handle();
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveAttribute('aria-valuenow', '40');
    expect(separator).toHaveAttribute('aria-valuemin', '20');
    // 180 px of 900 is 20%, so the first pane can grow to 80%.
    expect(separator).toHaveAttribute('aria-valuemax', '80');
    expect(separator.getAttribute('aria-controls')).toBe(
      screen.getByTestId('list').parentElement?.id,
    );
    expect(paneWidth('list')).toBeGreaterThan(300);
    expect(paneWidth('list')).toBeLessThan(paneWidth('detail'));
  });

  it.skipIf(isPhone)('resizes with the arrow keys, Home and End', async () => {
    const onSizesChange = vi.fn();
    render(<View onSizesChange={onSizesChange} />);
    handle().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(handle()).toHaveAttribute('aria-valuenow', '45');
    expect(onSizesChange).toHaveBeenLastCalledWith([45, 55]);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(handle()).toHaveAttribute('aria-valuenow', '35');
    await userEvent.keyboard('{Home}');
    expect(handle()).toHaveAttribute('aria-valuenow', '20');
    await userEvent.keyboard('{End}');
    expect(handle()).toHaveAttribute('aria-valuenow', '80');
  });

  it.skipIf(isPhone)(
    'collapses and restores a collapsible pane with Enter and a double-click',
    async () => {
      render(<View collapsibleIndexes={[1]} />);
      handle().focus();
      await userEvent.keyboard('{Enter}');
      expect(screen.getByTestId('detail').parentElement).not.toBeVisible();
      expect(handle()).toHaveAttribute('aria-valuenow', '100');
      await userEvent.keyboard('{Enter}');
      expect(screen.getByTestId('detail').parentElement).toBeVisible();
      expect(handle()).toHaveAttribute('aria-valuenow', '40');
      await userEvent.dblClick(handle());
      expect(screen.getByTestId('detail').parentElement).not.toBeVisible();
    },
  );

  it.skipIf(isPhone)('resizes by dragging the handle with a mouse', async () => {
    const onSizesChange = vi.fn();
    render(<View onSizesChange={onSizesChange} />);
    const before = paneWidth('list');
    // Drop the handle near the left edge of the list: the list shrinks to its minimum (20%).
    await userEvent.dragAndDrop(handle(), screen.getByTestId('list'), {
      targetPosition: { x: 10, y: 10 },
    });
    await expect.poll(() => paneWidth('list')).toBeLessThan(before);
    expect(handle()).toHaveAttribute('aria-valuenow', '20');
    expect(onSizesChange).toHaveBeenCalled();
  });

  it.skipIf(isPhone)('follows a touch drag', async () => {
    render(<View />);
    const separator = handle();
    const rect = separator.getBoundingClientRect();
    const touch = (type: string, x: number) =>
      separator.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 7,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: rect.top + 20,
        }),
      );
    touch('pointerdown', rect.left);
    // 90 px of 900 is 10%.
    touch('pointermove', rect.left + 90);
    touch('pointerup', rect.left + 90);
    await expect.poll(() => separator.getAttribute('aria-valuenow')).toBe('50');
  });

  it('keeps sizes controlled by the app', async () => {
    function Controlled() {
      const [sizes, setSizes] = useState([30, 70]);
      return (
        <>
          <View sizes={sizes} onSizesChange={setSizes} />
          <output data-testid="sizes">{sizes.join(',')}</output>
        </>
      );
    }
    render(<Controlled />);
    if (isPhone) {
      return;
    }
    handle().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByTestId('sizes').textContent).toBe('35,65');
  });

  it('moves the secondary pane into a drawer in a narrow container', async () => {
    const onStackedChange = vi.fn();
    function Narrow() {
      const [isOpen, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Show details
          </button>
          <View
            width={340}
            isSecondaryOpen={isOpen}
            onSecondaryOpenChange={setOpen}
            onStackedChange={onStackedChange}
          />
        </>
      );
    }
    render(<Narrow />);
    await expect.poll(() => screen.queryByRole('separator')).toBeNull();
    expect(onStackedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('list')).toBeVisible();
    expect(screen.queryByTestId('detail')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show details' }));
    const drawer = await screen.findByRole('dialog', { name: 'Details' });
    expect(drawer.textContent).toEqual(expect.stringContaining('third planet'));
    await expect.poll(() => drawer.contains(document.activeElement), { timeout: 2000 }).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => screen.queryByRole('dialog'), { timeout: 3000 }).toBeNull();
  });

  it('stacks every pane in a narrow container when asked', async () => {
    render(<View width={340} secondaryPresentation="stack" />);
    await expect.poll(() => screen.queryByRole('separator')).toBeNull();
    expect(screen.getByTestId('list')).toBeVisible();
    expect(screen.getByTestId('detail')).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.skipIf(isPhone)('stacks top to bottom with a horizontal handle', async () => {
    render(<View orientation="vertical" minSizes={undefined} />);
    expect(handle()).toHaveAttribute('aria-orientation', 'horizontal');
    handle().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(handle()).toHaveAttribute('aria-valuenow', '45');
  });

  it('takes its strings from UIProvider', async () => {
    const overrides: Partial<SplitViewMessages> = {
      splitViewResize: ({ pane }) => `Change the size of ${pane}`,
      splitViewDetails: 'More',
    };
    // Until SplitViewMessages joins the Messages union, the overrides need widening.
    const messages = overrides as unknown as Partial<Messages>;
    const { rerender } = render(
      <UIProvider messages={messages}>
        <View />
      </UIProvider>,
    );
    if (!isPhone) {
      expect(
        screen.getByRole('separator', { name: 'Change the size of Planets' }),
      ).toBeInTheDocument();
    }
    rerender(
      <UIProvider messages={messages}>
        <View key="narrow" width={340} paneLabels={undefined} defaultSecondaryOpen />
      </UIProvider>,
    );
    expect(await screen.findByRole('dialog', { name: 'More' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<View collapsibleIndexes={[1]} />);
    await expectNoAxeViolations(container);
  });
});
