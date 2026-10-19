import { render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { Button } from '../Button';
import { Stepper, type StepperStep, type StepperVariant } from './Stepper';

const STEPS: StepperStep[] = [
  { id: 'cart', title: 'Cart' },
  { id: 'shipping', title: 'Shipping', description: 'Address and speed' },
  { id: 'payment', title: 'Payment' },
  { id: 'review', title: 'Review' },
];

const STATES: StepperStep[] = [
  { id: 'account', title: 'Account' },
  { id: 'team', title: 'Team', status: 'skipped', isOptional: true },
  { id: 'billing', title: 'Billing', status: 'error', content: <button>Update card</button> },
  { id: 'launch', title: 'Launch', isDisabled: true },
];

function items(name = 'Checkout') {
  return within(screen.getByRole('list', { name })).getAllByRole('listitem');
}

describe('Stepper', () => {
  it('lists the steps in order, marking the current one and the ones before it as done', () => {
    render(<Stepper label="Checkout" steps={STEPS} currentStep={1} compactBelow={0} />);
    const list = items();
    expect(list.map((item) => item.getAttribute('data-status'))).toEqual([
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
    expect(list[1]).toHaveAttribute('aria-current', 'step');
    expect(list.filter((item) => item.hasAttribute('aria-current'))).toHaveLength(1);
    // A done step says so in words, not only with its check mark.
    expect(list[0]?.textContent).toContain('Done');
    expect(list[1]?.textContent).toContain('Address and speed');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows error, skipped, optional and disabled states in a vertical list', () => {
    render(
      <Stepper
        label="Onboarding"
        steps={STATES}
        currentStep={2}
        orientation="vertical"
        headingLevel={3}
      />,
    );
    const list = items('Onboarding');
    expect(list.map((item) => item.getAttribute('data-status'))).toEqual([
      'done',
      'skipped',
      'error',
      'upcoming',
    ]);
    expect(list[1]?.textContent).toContain('Skipped');
    expect(list[1]?.textContent).toContain('Optional');
    // The current step can also have an error: it's still the current step.
    expect(list[2]).toHaveAttribute('aria-current', 'step');
    expect(list[2]?.textContent).toContain('Needs attention');
    const action = screen.getByRole('button', { name: 'Update card' });
    expect(action).toBeVisible();
    expect(list[2]?.contains(action)).toBe(true);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Billing Needs attention' }),
    ).toBeVisible();
  });

  it('makes steps pressable inside a nav when it takes onCurrentStepChange', async () => {
    const onChange = vi.fn();
    render(
      <Stepper
        label="Checkout"
        steps={STEPS}
        defaultCurrentStep={1}
        onCurrentStepChange={onChange}
        compactBelow={0}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Checkout' });
    // The current step isn't a button; every other one is.
    expect(within(nav).getAllByRole('button')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'Payment' }));
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(within(nav).getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Cart Done' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Shipping Done' })).toBeEnabled();
  });

  it('only lets a linear stepper go back, or to done steps', async () => {
    const onChange = vi.fn();
    render(
      <Stepper
        label="Checkout"
        steps={STEPS}
        currentStep={2}
        onCurrentStepChange={onChange}
        isLinear
        compactBelow={0}
      />,
    );
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Review' }), { force: true });
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cart Done' }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('never lets a disabled step be pressed', () => {
    render(
      <Stepper
        label="Onboarding"
        steps={STATES}
        currentStep={2}
        onCurrentStepChange={vi.fn()}
        compactBelow={0}
      />,
    );
    expect(screen.getByRole('button', { name: 'Launch' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Account Done' })).toBeEnabled();
  });

  it('moves between steps with the keyboard', async () => {
    const onChange = vi.fn();
    render(
      <Stepper
        label="Checkout"
        steps={STEPS}
        defaultCurrentStep={1}
        onCurrentStepChange={onChange}
        orientation="vertical"
      />,
    );
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Cart Done' })).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Payment' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('shows "Step 2 of 4" and the current title in the compact variant', () => {
    const { rerender } = render(
      <Stepper label="Checkout" steps={STEPS} currentStep={1} variant="compact" />,
    );
    const group = screen.getByRole('group', { name: 'Checkout' });
    expect(within(group).getByText('Step 2 of 4')).toBeVisible();
    expect(group.textContent).toContain('Shipping');
    expect(screen.queryByRole('list')).toBeNull();
    rerender(
      <Stepper
        label="Checkout"
        steps={STEPS}
        currentStep={1}
        variant="compact"
        isCurrentTitleHidden
      />,
    );
    expect(screen.getByRole('group', { name: 'Checkout' }).textContent).not.toContain('Shipping');
  });

  it('switches a horizontal stepper to compact when its container is too narrow', () => {
    const { rerender } = render(
      <div style={{ width: 240 }}>
        <Stepper label="Checkout" steps={STEPS} currentStep={2} />
      </div>,
    );
    expect(screen.getByText('Step 3 of 4')).toBeVisible();
    expect(screen.queryByRole('list')).toBeNull();
    rerender(
      <div style={{ width: 240 }}>
        <Stepper label="Checkout" steps={STEPS} currentStep={2} compactBelow={0} />
      </div>,
    );
    expect(items()).toHaveLength(4);
    rerender(
      <div style={{ width: 240 }}>
        <Stepper label="Checkout" steps={STEPS} currentStep={2} orientation="vertical" />
      </div>,
    );
    expect(items()).toHaveLength(4);
  });

  it('draws arrows and dots as lists too', () => {
    const { rerender } = render(
      <Stepper label="Checkout" steps={STEPS} currentStep={1} variant="arrow" compactBelow={0} />,
    );
    expect(screen.getByRole('list', { name: 'Checkout' }).parentElement).toHaveAttribute(
      'data-variant',
      'arrow',
    );
    expect(items()[1]).toHaveAttribute('aria-current', 'step');
    rerender(
      <Stepper label="Checkout" steps={STEPS} currentStep={1} variant="dot" compactBelow={0} />,
    );
    expect(items()[0]?.textContent).toContain('Done');
  });

  it('takes the app’s strings from UIProvider and passes ref and attributes through', () => {
    const ref = createRef<HTMLElement>();
    render(
      <UIProvider
        messages={{
          steps: 'Progress',
          stepStatus: ({ status }) => (status === 'done' ? 'Finished' : status),
          stepOf: ({ step, total }) => `${step}/${total}`,
        }}
      >
        <Stepper ref={ref} data-testid="stepper" steps={STEPS} currentStep={1} compactBelow={0} />
        <Stepper steps={STEPS} currentStep={1} variant="compact" />
      </UIProvider>,
    );
    expect(ref.current).toBe(screen.getByTestId('stepper'));
    expect(items('Progress')[0]?.textContent).toContain('Finished');
    expect(screen.getByText('2/4')).toBeVisible();
  });

  describe('as a checklist', () => {
    const SETUP: StepperStep[] = [
      { id: 'users', title: 'Add users', status: 'done' },
      {
        id: 'settings',
        title: 'Confirm site settings',
        status: 'current',
        description: 'Time zone and currency.',
        content: <Button size="sm">Confirm</Button>,
      },
      { id: 'driver', title: 'Register a driver', status: 'upcoming' },
      {
        id: 'tariff',
        title: 'Create a tariff',
        status: 'upcoming',
        isDisabled: true,
        description: 'Waiting for settings.',
      },
    ];

    function Checklist(props: { hasProgressBar?: boolean }) {
      return (
        <Stepper
          label="Site setup"
          steps={SETUP}
          orientation="vertical"
          headingLevel={3}
          hasStatusBadges
          hasProgressBar
          {...props}
        />
      );
    }

    it('shows each status in words in a badge, without repeating it for screen readers', () => {
      render(<Checklist />);
      const list = items('Site setup');
      expect(list.map((item) => item.textContent)).toEqual([
        expect.stringContaining('Done'),
        expect.stringContaining('Up next'),
        expect.stringContaining('To do'),
        expect.stringContaining('Blocked'),
      ]);
      // The badge says "Done"; the hidden words after the title would repeat it.
      expect(list[0]?.textContent.match(/Done/g)).toHaveLength(1);
      expect(list[1]).toHaveAttribute('aria-current', 'step');
      expect(
        screen.getByRole('heading', { level: 3, name: 'Confirm site settings' }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('summarises progress in a bar, which turns success once every step is done', () => {
      const { rerender } = render(<Checklist />);
      expect(screen.getByRole('progressbar', { name: 'Site setup' })).toHaveAttribute(
        'aria-valuetext',
        '1 of 4 done',
      );
      rerender(<Checklist hasProgressBar={false} />);
      expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('takes the app’s strings from UIProvider', () => {
      render(
        <UIProvider
          messages={{
            stepStatus: ({ status }) => status.toUpperCase(),
            stepProgress: ({ done, total }) => `${done}/${total}`,
          }}
        >
          <Checklist />
        </UIProvider>,
      );
      expect(screen.getByText('CURRENT')).toBeInTheDocument();
      expect(screen.getByText('BLOCKED')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { name: 'Site setup' })).toHaveAttribute(
        'aria-valuetext',
        '1/4',
      );
    });

    it('has no accessibility violations', async () => {
      const { container } = render(<Checklist />);
      await expectNoAxeViolations(container);
    });
  });

  it.each<StepperVariant>(['numbered', 'dot', 'arrow', 'compact'])(
    'has no accessibility violations (%s)',
    async (variant) => {
      const { container } = render(
        <div className="flex flex-col gap-8">
          <Stepper label="Onboarding" steps={STATES} currentStep={2} variant={variant} />
          <Stepper
            label="Checkout"
            steps={STEPS}
            defaultCurrentStep={1}
            variant={variant}
            orientation="vertical"
            onCurrentStepChange={() => undefined}
          />
        </div>,
      );
      await expectNoAxeViolations(container);
    },
  );
});
