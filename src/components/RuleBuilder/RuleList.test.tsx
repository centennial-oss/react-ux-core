import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import type { Messages } from '../../provider/messages';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  observatoryActions,
  observatoryFields,
  observatoryRules,
  WEATHER_HOLD_SUMMARY,
} from '../../../test/rules';
import type { RuleBuilderMessages } from './messages';
import { RuleList, type RuleListProps } from './RuleList';
import type { Rule } from './types';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = !hasTouch;

function Controlled({
  onRules,
  ...props
}: { onRules?: (rules: Rule[]) => void } & Partial<RuleListProps>) {
  const [rules, setRules] = useState<Rule[]>(observatoryRules);
  return (
    <RuleList
      label="Alert rules"
      fields={observatoryFields}
      actions={observatoryActions}
      value={rules}
      onChange={(next) => {
        setRules(next);
        onRules?.(next);
      }}
      {...props}
    />
  );
}

/** The visible part of a switch (its input is visually hidden). */
function switchLabel(name: string) {
  const label = screen.getByRole('switch', { name }).closest('label');
  if (!label) {
    throw new Error(`No switch ${name}`);
  }
  return label;
}

function names(rules: readonly Rule[]) {
  return rules.map((rule) => rule.name);
}

describe('RuleList', () => {
  it('lists the rules in order with their summaries and on/off switches', () => {
    render(<Controlled />);
    expect(screen.getByRole('grid', { name: 'Alert rules' })).toBeInTheDocument();
    expect(document.body.textContent).toEqual(
      expect.stringContaining('Rules are checked in order. The first rule that matches wins.'),
    );
    const rows = screen.getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Weather hold'),
      expect.stringContaining('Frost warning'),
      expect.stringContaining('Calibration targets'),
    ]);
    expect(rows[0]?.textContent).toEqual(expect.stringContaining(WEATHER_HOLD_SUMMARY));
    expect(screen.getByRole('switch', { name: 'Enable Weather hold' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Enable Calibration targets' })).not.toBeChecked();
    expect(rows[2]?.textContent).toEqual(expect.stringContaining('Off'));
  });

  it('turns a rule off and on', async () => {
    const onRules = vi.fn();
    render(<Controlled onRules={onRules} />);
    await userEvent.click(switchLabel('Enable Frost warning'));
    const rules = onRules.mock.lastCall?.[0] as Rule[];
    expect(rules.find((rule) => rule.id === 'frost')?.isEnabled).toBe(false);
    expect(screen.getByRole('switch', { name: 'Enable Frost warning' })).not.toBeChecked();
  });

  it.skipIf(!isDesktop)('toggles with the keyboard', async () => {
    const onRules = vi.fn();
    render(<Controlled onRules={onRules} />);
    const toggle = screen.getByRole('switch', { name: 'Enable Calibration targets' });
    // Rows take focus; the arrow keys move between the controls in a row.
    const row = toggle.closest<HTMLElement>('[role="row"]');
    row?.focus();
    for (let step = 0; step < 6 && document.activeElement !== toggle; step++) {
      await userEvent.keyboard('{ArrowRight}');
    }
    expect(toggle).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(toggle).toBeChecked();
    expect((onRules.mock.lastCall?.[0] as Rule[])[2]?.isEnabled).toBe(true);
  });

  it('moves a rule with its move buttons, first match first', async () => {
    const onRules = vi.fn();
    render(<Controlled onRules={onRules} />);
    await userEvent.click(screen.getByRole('button', { name: 'Move Frost warning up' }));
    expect(names(onRules.mock.lastCall?.[0] as Rule[])).toEqual([
      'Frost warning',
      'Weather hold',
      'Calibration targets',
    ]);
  });

  it('edits and removes rules when allowed', async () => {
    const onEdit = vi.fn();
    const onRules = vi.fn();
    render(<Controlled onEdit={onEdit} onRules={onRules} allowsRemoving />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Frost warning' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'frost' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Frost warning' }));
    expect(names(onRules.mock.lastCall?.[0] as Rule[])).toEqual([
      'Weather hold',
      'Calibration targets',
    ]);
    expect([...document.querySelectorAll('[aria-live="polite"]')].at(-1)?.textContent).toBe(
      'Frost warning removed.',
    );
  });

  it('locks the order and switches when read-only', () => {
    render(<Controlled isReadOnly onEdit={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Move|Edit/ })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Enable Weather hold' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );
  });

  it.skipIf(!hasTouch)('toggles with a tap', async () => {
    render(
      <div className="p-2">
        <Controlled />
      </div>,
    );
    switchLabel('Enable Frost warning').setAttribute('data-test-switch', '');
    await commands.tap('[data-test-switch]');
    await expect
      .poll(() => screen.getByRole('switch', { name: 'Enable Frost warning' }))
      .not.toBeChecked();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes its strings from UIProvider messages', () => {
    const messages: Partial<RuleBuilderMessages> = {
      ruleListOrderHint: 'La primera regla que coincide gana.',
      ruleEnable: ({ name }) => `Activar ${name}`,
    };
    render(
      <UIProvider messages={messages as Partial<Messages>}>
        <Controlled />
      </UIProvider>,
    );
    expect(document.body.textContent).toEqual(
      expect.stringContaining('La primera regla que coincide gana.'),
    );
    expect(screen.getByRole('switch', { name: 'Activar Frost warning' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<Controlled onEdit={vi.fn()} allowsRemoving />);
    await expectNoAxeViolations(container);
  });
});
