import { act, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import type { Messages } from '../../provider/messages';
import { expectNoAxeViolations } from '../../../test/axe';
import { describedText, pasteText } from '../../../test/clipboard';
import { KeyValueEditor, type KeyValuePair } from './KeyValueEditor';
import type { KeyValueEditorMessages } from './messages';

const hasTouch = navigator.maxTouchPoints > 0;
const isDesktop = !hasTouch;

const headers: KeyValuePair[] = [
  { id: 'a', key: 'Accept', value: 'application/json' },
  { id: 'b', key: 'Cache-Control', value: 'no-cache' },
];

const tenLineEnv = [
  '# Observatory',
  'SITE=north-ridge',
  'TELESCOPE=NR-1',
  'LATITUDE=19.82',
  'LONGITUDE=-155.47',
  'ELEVATION=4205',
  'TIMEZONE=Pacific/Honolulu',
  'ARCHIVE_URL=https://archive.example.com',
  'export CAMERA="Ada 2"',
  'FILTERS=r,g,b',
  "OBSERVER='Grace'",
].join('\n');

function overrides(messages: Partial<KeyValueEditorMessages>): Partial<Messages> {
  return messages;
}

function liveText() {
  return [...document.querySelectorAll('[aria-live="polite"]')].at(-1)?.textContent;
}

/** The key inputs, in order. */
function keyInputs() {
  return [...document.querySelectorAll<HTMLInputElement>('[data-kv-key] input')];
}

function keyInput(index: number): HTMLInputElement {
  const input = keyInputs()[index];
  if (!input) {
    throw new Error(`No key input ${String(index)}`);
  }
  return input;
}

function Controlled({
  initial = headers,
  ...props
}: { initial?: KeyValuePair[] } & Partial<Parameters<typeof KeyValueEditor>[0]>) {
  const [value, setValue] = useState<KeyValuePair[]>(initial);
  return (
    <KeyValueEditor
      label="Headers"
      keyLabel="Header"
      value={value}
      onChange={setValue}
      {...props}
    />
  );
}

describe('KeyValueEditor', () => {
  it('shows each row as a group named by its key', () => {
    render(
      <KeyValueEditor
        label="Headers"
        keyLabel="Header"
        defaultValue={[...headers, { id: 'c', key: '', value: '' }]}
      />,
    );
    const editor = screen.getByRole('group', { name: 'Headers' });
    expect(within(editor).getByRole('group', { name: 'Accept' })).toBeInTheDocument();
    expect(within(editor).getByRole('group', { name: 'Cache-Control' })).toBeInTheDocument();
    expect(within(editor).getByRole('group', { name: 'Row 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove header Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Row 3' })).toBeInTheDocument();
  });

  it('adds a row, focusing its key and announcing it', async () => {
    const onChange = vi.fn();
    render(<KeyValueEditor label="Variables" onChange={onChange} createId={() => 'new'} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(onChange).toHaveBeenLastCalledWith([{ id: 'new', key: '', value: '' }]);
    expect(keyInputs()[0]).toHaveFocus();
    expect(liveText()).toBe('Row 1 added.');
  });

  it('splits a pasted 10-line .env into 10 rows', () => {
    const onChange = vi.fn();
    render(
      <KeyValueEditor
        label="Variables"
        defaultValue={[{ id: 'x', key: '', value: '' }]}
        onChange={onChange}
      />,
    );
    act(() => {
      pasteText(keyInput(0), tenLineEnv);
    });
    const rows = onChange.mock.lastCall?.[0] as KeyValuePair[];
    expect(rows).toHaveLength(10);
    expect(rows[0]).toEqual({ id: 'x', key: 'SITE', value: 'north-ridge' });
    expect(rows.map((row) => row.key)).toEqual([
      'SITE',
      'TELESCOPE',
      'LATITUDE',
      'LONGITUDE',
      'ELEVATION',
      'TIMEZONE',
      'ARCHIVE_URL',
      'CAMERA',
      'FILTERS',
      'OBSERVER',
    ]);
    expect(rows[7]?.value).toBe('Ada 2');
    expect(new Set(rows.map((row) => row.id)).size).toBe(10);
    expect(keyInputs()).toHaveLength(10);
    expect(liveText()).toBe('Pasted 10 rows.');
  });

  it('leaves a plain paste alone', () => {
    render(<KeyValueEditor label="Variables" defaultValue={[{ id: 'x', key: '', value: '' }]} />);
    const input = keyInput(0);
    const event = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer(),
      bubbles: true,
      cancelable: true,
    });
    event.clipboardData?.setData('text/plain', 'Authorization');
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('flags a duplicate key on both rows, unless duplicates are allowed', () => {
    const duplicated = [
      { id: 'a', key: 'Accept', value: 'text/html' },
      { id: 'b', key: 'accept', value: 'application/json' },
      { id: 'c', key: 'Accept', value: '*/*' },
    ];
    const { unmount } = render(<KeyValueEditor label="Headers" defaultValue={duplicated} />);
    const first = screen.getAllByRole('group', { name: 'Accept' });
    expect(first).toHaveLength(2);
    for (const row of first) {
      expect(describedText(row)).toBe('Accept is used more than once');
    }
    expect(describedText(screen.getByRole('group', { name: 'accept' }))).toBe('');
    expect(keyInputs()[0]).toHaveAttribute('aria-invalid', 'true');
    unmount();

    // Case-insensitive keys (HTTP headers) flag all three.
    const { unmount: unmountInsensitive } = render(
      <KeyValueEditor label="Headers" defaultValue={duplicated} hasCaseSensitiveKeys={false} />,
    );
    expect(
      keyInputs().filter((input) => input.getAttribute('aria-invalid') === 'true'),
    ).toHaveLength(3);
    unmountInsensitive();

    render(<KeyValueEditor label="Headers" defaultValue={duplicated} allowsDuplicateKeys />);
    expect(screen.queryByText(/used more than once/)).toBeNull();
  });

  it('asks for a key when a value has none, and shows validate errors on the row', () => {
    render(
      <KeyValueEditor
        label="Tags"
        defaultValue={[
          { id: 'a', key: '', value: 'orphan' },
          { id: 'b', key: 'planet', value: 'Pluto' },
        ]}
        validate={(pair) => (pair.value === 'Pluto' ? 'Pick a planet' : undefined)}
      />,
    );
    expect(describedText(screen.getByRole('group', { name: 'Row 1' }))).toBe(
      'Enter a key for this value',
    );
    expect(describedText(screen.getByRole('group', { name: 'planet' }))).toBe('Pick a planet');
  });

  it('removes a row, moving focus to the next one and announcing it', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove header Accept' }));
    expect(screen.queryByRole('group', { name: 'Accept' })).toBeNull();
    expect(keyInputs()[0]).toHaveValue('Cache-Control');
    expect(keyInputs()[0]).toHaveFocus();
    expect(liveText()).toBe('Removed Accept.');
    await userEvent.click(screen.getByRole('button', { name: 'Remove header Cache-Control' }));
    expect(screen.getByRole('button', { name: 'Add row' })).toHaveFocus();
  });

  it.runIf(isDesktop)(
    'reorders rows with the keyboard, focus following the moved row',
    async () => {
      render(<Controlled />);
      const down = screen.getByRole('button', { name: 'Move Accept down' });
      down.focus();
      await userEvent.keyboard('{Enter}');
      expect(keyInputs().map((input) => input.value)).toEqual(['Cache-Control', 'Accept']);
      expect(liveText()).toBe('Accept, moved to position 2 of 2');
      // At the bottom, focus moves to the row's other move button.
      expect(screen.getByRole('button', { name: 'Move Accept up' })).toHaveFocus();
    },
  );

  it.runIf(hasTouch)('adds and reorders rows by touch', async () => {
    render(<Controlled />);
    await commands.tap('[data-row-id="b"] [data-move="up"]');
    expect(keyInputs().map((input) => input.value)).toEqual(['Cache-Control', 'Accept']);
    await commands.tap('[data-kv-add]');
    expect(keyInputs()).toHaveLength(3);
  });

  it('masks secret values with a per-row toggle and named show/hide buttons', async () => {
    render(
      <Controlled
        initial={[{ id: 'k', key: 'API_TOKEN', value: 'sk-123', isSecret: true }]}
        hasSecretToggle
      />,
    );
    const value = screen.getByRole('group', { name: 'API_TOKEN' }).querySelectorAll('input')[1];
    expect(value).toHaveAttribute('type', 'password');
    const toggle = screen.getByRole('button', { name: 'Treat API_TOKEN as a secret' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Show value of API_TOKEN' }));
    expect(value).toHaveAttribute('type', 'text');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /value of API_TOKEN/ })).toBeNull();
  });

  it('suggests keys with a combo box', () => {
    render(
      <KeyValueEditor
        label="Headers"
        defaultValue={[{ id: 'a', key: '', value: '' }]}
        keySuggestions={['Accept', 'Content-Type']}
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('stops at maxItems, including for pastes', () => {
    render(
      <KeyValueEditor
        label="Variables"
        defaultValue={[{ id: 'x', key: '', value: '' }]}
        maxItems={3}
      />,
    );
    act(() => {
      pasteText(keyInput(0), tenLineEnv);
    });
    expect(keyInputs()).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Add row' })).toBeDisabled();
    expect(screen.getByText('Up to 3 rows.')).toBeInTheDocument();
    expect(liveText()).toBe('Pasted 3 rows. 7 more didn’t fit: the limit is 3.');
  });

  it('shows a table in wide containers and stacked pairs in narrow ones', () => {
    render(
      <>
        <div style={{ width: 900 }} data-testid="wide">
          <KeyValueEditor label="Wide" keyLabel="Header" defaultValue={headers} />
        </div>
        <div style={{ width: 320 }} data-testid="narrow">
          <KeyValueEditor label="Narrow" keyLabel="Header" defaultValue={headers} />
        </div>
      </>,
    );
    const wide = screen.getByTestId('wide');
    const wideRow = within(wide).getByRole('group', { name: 'Accept' });
    const [wideKey, wideValue] = within(wideRow).getAllByRole('textbox');
    expect(wideKey).toHaveAccessibleName('Header');
    expect(wideKey?.getBoundingClientRect().top).toBeCloseTo(
      wideValue?.getBoundingClientRect().top ?? 0,
      0,
    );

    const narrow = screen.getByTestId('narrow');
    const narrowRow = within(narrow).getByRole('group', { name: 'Accept' });
    expect(within(narrowRow).getByText('Header')).toBeVisible();
    const [narrowKey, narrowValue] = within(narrowRow).getAllByRole('textbox');
    expect(narrowValue?.getBoundingClientRect().top).toBeGreaterThan(
      narrowKey?.getBoundingClientRect().bottom ?? 0,
    );
  });

  it('takes its strings from the messages', () => {
    render(
      <UIProvider messages={overrides({ kvAdd: 'Zeile hinzufügen' })}>
        <KeyValueEditor label="Variablen" />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Zeile hinzufügen' })).toBeInTheDocument();
  });

  it('hides the editing buttons when read-only', () => {
    render(<KeyValueEditor label="Headers" defaultValue={headers} isReadOnly />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(keyInputs()[0]).toHaveAttribute('readonly');
  });

  it('fits a 360 px page without horizontal scroll', () => {
    render(
      <div className="p-2">
        <KeyValueEditor label="Headers" defaultValue={headers} hasSecretToggle />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <KeyValueEditor
        label="Headers"
        description="Sent with every request"
        keyLabel="Header"
        hasSecretToggle
        defaultValue={[
          ...headers,
          { id: 'c', key: 'Accept', value: 'text/html' },
          { id: 'd', key: 'Authorization', value: 'Bearer abc', isSecret: true },
        ]}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
