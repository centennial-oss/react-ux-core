import { act, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import type { Messages } from '../../provider/messages';
import { expectNoAxeViolations } from '../../../test/axe';
import { mixedCidrEntries, mixedCidrText } from '../../../test/cidr';
import { describedText, pasteText } from '../../../test/clipboard';
import { CidrField } from './CidrField';
import { CidrList } from './CidrList';
import type { CidrFieldMessages } from './messages';

const hasTouch = navigator.maxTouchPoints > 0;

function textbox(name: string) {
  return screen.getByRole<HTMLInputElement>('textbox', { name });
}

/** Overrides for this component's strings (not yet part of `Messages`). */
function overrides(messages: Partial<CidrFieldMessages>): Partial<Messages> {
  return messages;
}

/** The list's own live region comes after its entries'. */
function listAnnouncement() {
  return [...document.querySelectorAll('[aria-live="polite"]')].at(-1)?.textContent;
}

function paste(element: HTMLElement, text: string) {
  act(() => {
    pasteText(element, text);
  });
}

describe('CidrField', () => {
  it('normalises host bits on blur, with a note, and shows the range and address count', async () => {
    const onChange = vi.fn();
    render(<CidrField label="Origin range" onChange={onChange} />);
    const input = textbox('Origin range');
    await userEvent.type(input, '10.0.0.5/8');
    expect(onChange).toHaveBeenLastCalledWith('10.0.0.5/8');
    await userEvent.tab();
    expect(input).toHaveValue('10.0.0.0/8');
    expect(onChange).toHaveBeenLastCalledWith('10.0.0.0/8');
    const description = input.getAttribute('aria-describedby') ?? '';
    expect(description).not.toBe('');
    expect(describedText(input)).toContain('10.0.0.0 – 10.255.255.255, 16,777,216 addresses');
    expect(describedText(input)).toContain('Changed 10.0.0.5/8 to 10.0.0.0/8');
    // The change is announced politely.
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain('Changed 10.0.0.5/8 to 10.0.0.0/8');
  });

  it('turns a bare address into a /32 or /128 unless allowsHost is false', async () => {
    render(
      <>
        <CidrField label="Host" />
        <CidrField label="Host v6" />
        <CidrField label="Strict" allowsHost={false} />
      </>,
    );
    await userEvent.type(textbox('Host'), '203.0.113.7');
    await userEvent.type(textbox('Host v6'), '2620:fe::fe');
    await userEvent.type(textbox('Strict'), '203.0.113.7');
    await userEvent.tab();
    expect(textbox('Host')).toHaveValue('203.0.113.7/32');
    expect(textbox('Host v6')).toHaveValue('2620:fe::fe/128');
    expect(textbox('Strict')).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(textbox('Strict'))).toContain('Add a prefix length');
  });

  it('waits until the field is left to show an error', async () => {
    render(<CidrField label="Range" />);
    const input = textbox('Range');
    await userEvent.type(input, '10.0.0.0/40');
    expect(input).not.toHaveAttribute('aria-invalid');
    await userEvent.tab();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('The prefix must be a number from 0 to 32.')).toBeInTheDocument();
  });

  it('shows errors at once for a value set from outside, and limits the family', () => {
    render(
      <>
        <CidrField label="Bad" defaultValue="300.1.1.1/8" />
        <CidrField label="IPv4 only" family="ipv4" defaultValue="2001:db8::/32" />
        <CidrField label="IPv6 only" family="ipv6" defaultValue="10.0.0.0/8" />
      </>,
    );
    expect(textbox('Bad')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter an IPv4 range.')).toBeInTheDocument();
    expect(screen.getByText('Enter an IPv6 range.')).toBeInTheDocument();
  });

  it('counts IPv6 addresses exactly', () => {
    render(<CidrField label="Prefix" defaultValue="2001:db8::/64" />);
    expect(describedText(textbox('Prefix'))).toContain(
      '2001:db8:: – 2001:db8::ffff:ffff:ffff:ffff, 18,446,744,073,709,551,616 addresses',
    );
  });

  it('shows a warning without marking the field invalid', () => {
    render(<CidrField label="Range" defaultValue="0.0.0.0/0" warningMessage="Allows everyone" />);
    expect(textbox('Range')).not.toHaveAttribute('aria-invalid');
    expect(describedText(textbox('Range'))).toContain('Allows everyone');
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState('192.0.2.9/24');
      return (
        <>
          <CidrField label="Range" value={value} onChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    textbox('Range').focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('status').textContent).toBe('192.0.2.0/24');
  });

  it('takes its strings from the messages', async () => {
    render(
      <UIProvider
        messages={overrides({
          cidrNormalized: ({ from, to }) => `${from} → ${to}`,
          cidrRange: ({ count }) => `${count} adresses`,
        })}
      >
        <CidrField label="Range" />
      </UIProvider>,
    );
    await userEvent.type(textbox('Range'), '10.0.0.5/30');
    await userEvent.tab();
    expect(describedText(textbox('Range'))).toContain('10.0.0.5/30 → 10.0.0.4/30');
    expect(describedText(textbox('Range'))).toContain('4 adresses');
  });

  it.runIf(hasTouch)('focuses on tap', async () => {
    render(<CidrField label="Range" />);
    await commands.tap('input');
    expect(textbox('Range')).toHaveFocus();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <CidrField label="Range" defaultValue="10.0.0.0/8" description="An origin range" />
        <CidrField label="Bad" defaultValue="nope" />
        <CidrField label="Warn" defaultValue="0.0.0.0/0" warningMessage="Allows everyone" />
        <CidrField label="Disabled" isDisabled defaultValue="192.0.2.0/24" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('CidrList', () => {
  it('adds every pasted line, flags 2 overlaps and 1 invalid entry, and merges on request', async () => {
    const onChange = vi.fn();
    render(<CidrList label="Allowlist" onChange={onChange} />);
    const add = textbox('Add ranges');
    paste(add, mixedCidrText);
    const group = screen.getByRole('group', { name: 'Allowlist' });
    expect(within(group).getAllByRole('listitem')).toHaveLength(20);
    // Bare addresses were normalised as they were added.
    expect(textbox('Range 6')).toHaveValue('203.0.113.7/32');
    expect(screen.getByText('20 ranges, 2 overlaps, 1 invalid')).toBeInTheDocument();
    expect(describedText(textbox('Range 1'))).toContain('Also covers 10.20.0.0/16');
    expect(describedText(textbox('Range 2'))).toContain('Already covered by 10.0.0.0/8');
    expect(textbox('Range 14')).toHaveAttribute('aria-invalid', 'true');
    expect(listAnnouncement()).toContain('Added 20 ranges. 2 normalised. 1 invalid.');

    await userEvent.click(screen.getByRole('button', { name: 'Merge 19 ranges into 16' }));
    const merged = onChange.mock.lastCall?.[0] as string[];
    expect(merged).toHaveLength(17);
    expect(merged).toContain('192.168.1.0/24');
    expect(merged).not.toContain('10.20.0.0/16');
    // The invalid entry stays, at the end, for the user to fix.
    expect(merged.at(-1)).toBe('999.1.1.1/24');
    expect(screen.queryByRole('button', { name: /^Merge/ })).toBeNull();
    expect(screen.getByText('17 ranges, 1 invalid')).toBeInTheDocument();
  });

  it('adds a typed entry with Enter or the Add button, and removes entries with focus moving on', async () => {
    render(<CidrList label="Allowlist" />);
    const add = textbox('Add ranges');
    await userEvent.type(add, '10.0.0.0/8{Enter}');
    await userEvent.type(add, '192.0.2.0/24');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(textbox('Range 1')).toHaveValue('10.0.0.0/8');
    expect(textbox('Range 2')).toHaveValue('192.0.2.0/24');
    expect(add).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Remove 10.0.0.0/8' }));
    expect(textbox('Range 1')).toHaveValue('192.0.2.0/24');
    expect(textbox('Range 1')).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Remove 192.0.2.0/24' }));
    expect(add).toHaveFocus();
  });

  it('flags duplicates on both entries, and skips the checks when shouldCheckOverlaps is false', () => {
    render(
      <>
        <CidrList label="Checked" defaultValue={['10.0.0.0/8', '10.0.0.0/8']} />
        <CidrList
          label="Unchecked"
          shouldCheckOverlaps={false}
          defaultValue={['192.0.2.0/24', '192.0.2.0/24']}
        />
      </>,
    );
    const checked = screen.getByRole('group', { name: 'Checked' });
    expect(within(checked).getAllByText('Duplicate of 10.0.0.0/8')).toHaveLength(2);
    const unchecked = screen.getByRole('group', { name: 'Unchecked' });
    expect(within(unchecked).queryByText(/Duplicate/)).toBeNull();
    expect(within(unchecked).queryByRole('button', { name: /^Merge/ })).toBeNull();
  });

  it('stops at maxItems and says why', () => {
    render(<CidrList label="Allowlist" maxItems={3} />);
    paste(textbox('Add ranges'), mixedCidrEntries.slice(0, 5).join('\n'));
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(textbox('Add ranges')).toBeDisabled();
    expect(listAnnouncement()).toContain('2 ranges were not added: the limit is 3.');
  });

  it('fits a 360 px page without horizontal scroll', () => {
    render(
      <div className="p-2">
        <CidrList label="Allowlist" defaultValue={[...mixedCidrEntries]} />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <CidrList
        label="Allowlist"
        description="Requests from these ranges skip the challenge"
        defaultValue={[...mixedCidrEntries.slice(0, 4), '999.1.1.1/24']}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
