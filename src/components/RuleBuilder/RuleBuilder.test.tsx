import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import type { Messages } from '../../provider/messages';
import { expectNoAxeViolations } from '../../../test/axe';
import {
  observatoryActions,
  observatoryFields,
  WEATHER_HOLD_SUMMARY,
  weatherHoldRule,
} from '../../../test/rules';
import type { RuleBuilderMessages } from './messages';
import { RuleBuilder, type RuleBuilderProps } from './RuleBuilder';
import type { Rule } from './types';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = !hasTouch;
// Select opens a bottom sheet on phones (covered by Select's own tests).
const isPhone = window.matchMedia('(max-width: 639.98px)').matches;

const emptyRule: Rule = {
  id: 'new',
  name: '',
  isEnabled: true,
  when: { id: 'root', join: 'and', items: [] },
  then: [],
};

function Controlled({
  initial = weatherHoldRule,
  onRule,
  ...props
}: { initial?: Rule; onRule?: (rule: Rule) => void } & Partial<RuleBuilderProps>) {
  const [rule, setRule] = useState(initial);
  return (
    <RuleBuilder
      fields={observatoryFields}
      actions={observatoryActions}
      value={rule}
      onChange={(next) => {
        setRule(next);
        onRule?.(next);
      }}
      {...props}
    />
  );
}

function summaryText() {
  return document.querySelector('[data-rule-summary]')?.textContent;
}

function liveText() {
  return [...document.querySelectorAll('[aria-live="polite"]')].at(-1)?.textContent;
}

/** The group named `name` directly in `container`'s condition group (not in a nested one). */
function group(name: string, container: HTMLElement = document.body) {
  const matches = within(container).getAllByRole('group', { name });
  const own = matches.filter(
    (element) =>
      !container.hasAttribute('data-group-id') ||
      element.parentElement?.closest('[data-group-id]') === container,
  );
  const [first] = own;
  if (own.length !== 1 || !first) {
    throw new Error(`Expected one group "${name}", found ${String(own.length)}`);
  }
  return first;
}

/** The Select trigger in `container` whose name includes `label`. */
function trigger(container: HTMLElement, label: string) {
  return within(container).getByRole('button', { name: new RegExp(label) });
}

/** Opens a Select with the keyboard and picks `option` with the arrow keys and Enter. */
async function chooseByKeyboard(button: HTMLElement, option: string) {
  button.focus();
  await userEvent.keyboard('{ArrowDown}');
  const target = await screen.findByRole('option', { name: option });
  for (let step = 0; step < 20 && document.activeElement !== target; step++) {
    await userEvent.keyboard('{ArrowDown}');
  }
  expect(target).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => screen.queryByRole('listbox')).toBeNull();
}

async function pressByKeyboard(button: HTMLElement) {
  button.focus();
  await userEvent.keyboard('{Enter}');
}

describe('RuleBuilder', () => {
  it('labels every condition and group by position, and reads the rule back', () => {
    render(<Controlled />);
    const when = group('When');
    expect(group('Condition 1 of 2', when)).toBeInTheDocument();
    const nested = group('Group 2 of 2', when);
    expect(group('Condition 1 of 2', nested)).toBeInTheDocument();
    expect(group('Condition 2 of 2', nested)).toBeInTheDocument();
    expect(group('Action 1 of 2')).toBeInTheDocument();
    expect(group('Action 2 of 2')).toBeInTheDocument();
    expect(summaryText()).toBe(WEATHER_HOLD_SUMMARY);
    expect(screen.getByRole('textbox', { name: 'Rule name' })).toHaveValue('Weather hold');
  });

  it.skipIf(!isDesktop)(
    'builds a rule with 3 conditions, a nested OR group and 2 actions by keyboard',
    async () => {
      const onRule = vi.fn();
      render(<Controlled initial={emptyRule} onRule={onRule} />);
      const name = screen.getByRole('textbox', { name: 'Rule name' });
      await userEvent.click(name);
      await userEvent.keyboard('Weather hold');

      // Condition 1: Instrument is Telescope NR-1.
      await pressByKeyboard(screen.getByRole('button', { name: 'Add condition' }));
      expect(liveText()).toBe('Condition added, 1 of 1.');
      const first = group('Condition 1 of 1');
      expect(trigger(first, 'Field')).toHaveFocus();
      await chooseByKeyboard(trigger(first, 'Value'), 'Telescope NR-1');

      // A nested OR group, its first condition: cloud cover is more than 6 oktas.
      await pressByKeyboard(screen.getByRole('button', { name: 'Add group' }));
      expect(liveText()).toBe('Group added, 2 of 2.');
      const nested = group('Group 2 of 2');
      expect(trigger(nested, 'Match')).toHaveFocus();
      expect(trigger(nested, 'Match').textContent).toContain('Any of these (OR)');
      expect(within(nested).queryByRole('button', { name: 'Add group' })).toBeNull();
      await chooseByKeyboard(trigger(group('Condition 1 of 1', nested), 'Field'), 'Cloud cover');
      const cloudValue = within(group('Condition 1 of 1', nested)).getByRole('textbox', {
        name: 'Value',
      });
      await userEvent.click(cloudValue);
      await userEvent.keyboard('6{Tab}');

      // Condition 3, in the group: wind speed is more than 40 km/h.
      await pressByKeyboard(within(nested).getByRole('button', { name: 'Add condition' }));
      const wind = group('Condition 2 of 2', nested);
      expect(trigger(wind, 'Field')).toHaveFocus();
      await chooseByKeyboard(trigger(wind, 'Field'), 'Wind speed');
      await userEvent.click(within(wind).getByRole('textbox', { name: 'Value' }));
      await userEvent.keyboard('40{Tab}');

      // Two actions: close the dome, then notify the observer.
      await pressByKeyboard(screen.getByRole('button', { name: 'Add action' }));
      expect(liveText()).toBe('Action added, 1 of 1.');
      await pressByKeyboard(screen.getByRole('button', { name: 'Add action' }));
      expect(group('Action 2 of 2')).toBeInTheDocument();

      expect(summaryText()).toBe(WEATHER_HOLD_SUMMARY);
      const rule = onRule.mock.lastCall?.[0] as Rule;
      expect(rule.name).toBe('Weather hold');
      expect(rule.when.items).toHaveLength(2);
      expect(rule.then.map((entry) => entry.actionId)).toEqual(['closeDome', 'notify']);
    },
  );

  it('removes a condition, announcing it and moving focus to the next row', async () => {
    render(<Controlled />);
    const nested = group('Group 2 of 2');
    await userEvent.click(within(nested).getByRole('button', { name: 'Remove condition 1' }));
    expect(liveText()).toBe('Condition 1 removed.');
    const remaining = group('Condition 1 of 1', nested);
    expect(trigger(remaining, 'Field')).toHaveFocus();
    expect(summaryText()).toBe(
      'When instrument is Telescope NR-1 and wind speed is more than 40 km/h, close the dome and notify the observer by email',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove group 2' }));
    expect(liveText()).toBe('Group 2 removed.');
    expect(trigger(group('Condition 1 of 1'), 'Field')).toHaveFocus();
  });

  it.skipIf(isPhone)('changes the operator list with the field and resets the value', async () => {
    const onRule = vi.fn();
    render(<Controlled onRule={onRule} />);
    const first = group('Condition 1 of 2', group('When'));
    await userEvent.click(trigger(first, 'Field'));
    await userEvent.click(await screen.findByRole('option', { name: 'Temperature' }));
    await expect.poll(() => onRule.mock.calls.length).toBe(1);
    await expect.poll(() => screen.queryByRole('listbox')).toBeNull();
    const rule = onRule.mock.lastCall?.[0] as Rule;
    expect(rule.when.items[0]).toMatchObject({
      fieldId: 'temperature',
      operator: 'lt',
      value: null,
    });
    await userEvent.click(trigger(group('Condition 1 of 2', group('When')), 'Operator'));
    await screen.findByRole('option', { name: 'is between' });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'is less than',
      'is at most',
      'is more than',
      'is at least',
      'is between',
    ]);
    await userEvent.click(screen.getByRole('option', { name: 'is between' }));
    const row = group('Condition 1 of 2', group('When'));
    expect(within(row).getByRole('textbox', { name: 'From' })).toBeInTheDocument();
    expect(within(row).getByRole('textbox', { name: 'To' })).toBeInTheDocument();
  });

  it('flags a bad pattern at once and a missing value after leaving the row', async () => {
    const rule: Rule = {
      ...emptyRule,
      when: {
        id: 'root',
        join: 'and',
        items: [
          { id: 'p', fieldId: 'target', operator: 'matches', value: '(M3' },
          { id: 'q', fieldId: 'wind', operator: 'gt', value: null },
        ],
      },
    };
    render(<Controlled initial={rule} />);
    const pattern = group('Condition 1 of 2');
    expect(pattern).toHaveAccessibleDescription('Enter a valid regular expression.');
    const empty = group('Condition 2 of 2');
    expect(empty).not.toHaveAccessibleDescription();
    await userEvent.click(within(empty).getByRole('textbox', { name: 'Value' }));
    await userEvent.click(screen.getByRole('textbox', { name: 'Rule name' }));
    expect(empty).toHaveAccessibleDescription('Enter a value.');
    expect(summaryText()).toContain('wind speed is more than …');
  });

  it('respects maxDepth and hides editing controls when disabled', () => {
    const { unmount } = render(<Controlled maxDepth={1} />);
    expect(screen.queryByRole('button', { name: 'Add group' })).toBeNull();
    unmount();
    render(<Controlled isDisabled hasSummary={false} />);
    expect(screen.queryByRole('button', { name: /Add|Remove/ })).toBeNull();
    expect(document.querySelector('[data-rule-summary]')).toBeNull();
  });

  it('renders action settings and edits them', async () => {
    const onRule = vi.fn();
    render(<Controlled onRule={onRule} />);
    const notify = group('Action 2 of 2');
    await userEvent.click(within(notify).getByRole('button', { name: /Channel/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Text message' }));
    expect((onRule.mock.lastCall?.[0] as Rule).then[1]).toEqual({
      actionId: 'notify',
      settings: 'sms',
    });
    expect(summaryText()).toContain('close the dome and text the observer');
  });

  it.skipIf(!hasTouch)('adds a condition with a tap', async () => {
    render(
      <div className="p-2">
        <Controlled initial={emptyRule} />
      </div>,
    );
    await commands.tap('[data-rule-add="root"]');
    await expect
      .poll(() => screen.queryByRole('group', { name: 'Condition 1 of 1' }))
      .not.toBeNull();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('takes its strings from UIProvider messages', () => {
    const messages: Partial<RuleBuilderMessages> = {
      ruleWhen: 'Si',
      ruleConditionLabel: ({ index, total }) => `Condición ${String(index)} de ${String(total)}`,
      ruleSummary: ({ conditions, actions }) => `Cuando ${conditions}: ${actions}`,
    };
    render(
      <UIProvider messages={messages as Partial<Messages>}>
        <Controlled />
      </UIProvider>,
    );
    expect(group('Condición 1 de 2', group('Si'))).toBeInTheDocument();
    expect(summaryText()).toMatch(/^Cuando /);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Controlled />);
    await expectNoAxeViolations(container);
  });
});
