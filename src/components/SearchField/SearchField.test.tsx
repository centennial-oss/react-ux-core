import { render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { SearchField } from './SearchField';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

function searchbox(name = 'Search') {
  return screen.getByRole('searchbox', { name });
}

describe('SearchField', () => {
  it('is a labelled, described searchbox that reports every keystroke through onChange', async () => {
    const onChange = vi.fn();
    render(<SearchField label="Search" description="Sites and devices" onChange={onChange} />);
    const input = searchbox();
    expect(input).toHaveAccessibleDescription('Sites and devices');
    await userEvent.type(input, 'sol');
    expect(onChange.mock.calls).toEqual([['s'], ['so'], ['sol']]);
  });

  it('sets on-screen keyboard and autofill hints, which props can override', () => {
    render(
      <>
        <SearchField label="Search" />
        <SearchField label="Recent" autoComplete="on" />
      </>,
    );
    const input = searchbox();
    expect(input).toHaveAttribute('inputmode', 'search');
    expect(input).toHaveAttribute('enterkeyhint', 'search');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(searchbox('Recent')).toHaveAttribute('autocomplete', 'on');
  });

  it('debounces onSearch until typing pauses', async () => {
    const onSearch = vi.fn();
    // A long delay, so a slow, loaded machine still types the whole word within it.
    render(<SearchField label="Search" onSearch={onSearch} searchDelay={1500} />);
    await userEvent.type(searchbox(), 'solar');
    expect(onSearch).not.toHaveBeenCalled();
    await expect.poll(() => onSearch.mock.calls, { timeout: 6000 }).toEqual([['solar']]);
  });

  it('uses a 300 ms delay by default', async () => {
    let typedAt = 0;
    let searchedAt = 0;
    const onSearch = vi.fn(() => {
      searchedAt = performance.now();
    });
    render(
      <SearchField
        label="Search"
        onChange={() => {
          typedAt = performance.now();
        }}
        onSearch={onSearch}
      />,
    );
    await userEvent.type(searchbox(), 'a');
    await expect.poll(() => onSearch.mock.calls.length, { timeout: 3000 }).toBe(1);
    // Measured from the keystroke itself, so a slow test runner can't shorten it.
    expect(searchedAt - typedAt).toBeGreaterThanOrEqual(295);
    expect(onSearch).toHaveBeenCalledWith('a');
  });

  it('searches straight away on Enter, and calls onSubmit', async () => {
    const onSearch = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SearchField label="Search" onSearch={onSearch} onSubmit={onSubmit} searchDelay={60_000} />,
    );
    await userEvent.type(searchbox(), 'wind{Enter}');
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('wind');
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('wind');
  });

  it('lets Enter submit a surrounding form when nothing listens for it', async () => {
    const onFormSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    render(
      <form onSubmit={onFormSubmit}>
        <SearchField label="Search" />
        <button type="submit">Go</button>
      </form>,
    );
    await userEvent.type(searchbox(), 'x{Enter}');
    expect(onFormSubmit).toHaveBeenCalledOnce();
  });

  it('clears with the clear button, keeps focus in the input, and searches for "" at once', async () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    const onClear = vi.fn();
    render(
      <SearchField
        label="Search"
        defaultValue="battery"
        onChange={onChange}
        onSearch={onSearch}
        onClear={onClear}
        searchDelay={60_000}
      />,
    );
    const clear = screen.getByRole('button', { name: 'Clear' });
    expect(clear).toHaveAttribute('tabindex', '-1');
    await userEvent.click(searchbox());
    await userEvent.click(clear);
    expect(searchbox()).toHaveValue('');
    expect(searchbox()).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('');
    expect(onClear).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('clears with Escape, and lets Escape through when already empty', async () => {
    const onClear = vi.fn();
    const onOuterKeyDown = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- records keys that bubble out
      <div
        onKeyDown={(event) => {
          onOuterKeyDown(event.key);
        }}
      >
        <SearchField label="Search" onClear={onClear} />
      </div>,
    );
    await userEvent.type(searchbox(), 'pump');
    await userEvent.keyboard('{Escape}');
    expect(searchbox()).toHaveValue('');
    expect(onClear).toHaveBeenCalledOnce();
    expect(onOuterKeyDown).not.toHaveBeenCalledWith('Escape');
    await userEvent.keyboard('{Escape}');
    expect(onClear).toHaveBeenCalledOnce();
    expect(onOuterKeyDown).toHaveBeenCalledWith('Escape');
  });

  it('focuses with the "/" shortcut from anywhere except other text fields', async () => {
    render(
      <>
        <button type="button">Elsewhere</button>
        <input aria-label="Other field" />
        <SearchField label="Search" hasShortcut />
      </>,
    );
    const input = searchbox();
    expect(input).toHaveAttribute('aria-keyshortcuts', '/');
    expect(input).toHaveAccessibleDescription('Press / to search');

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await userEvent.keyboard('/');
    expect(input).toHaveFocus();
    // The key moves focus; it doesn't type a "/".
    expect(input).toHaveValue('');

    const other = screen.getByRole('textbox', { name: 'Other field' });
    await userEvent.click(other);
    await userEvent.keyboard('/');
    expect(other).toHaveFocus();
    expect(other).toHaveValue('/');

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await userEvent.keyboard('{Control>}/{/Control}');
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });

  it('ignores "/" without hasShortcut, and when disabled', async () => {
    const { unmount } = render(
      <>
        <button type="button">Elsewhere</button>
        <SearchField label="Search" />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await userEvent.keyboard('/');
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    expect(searchbox()).not.toHaveAttribute('aria-keyshortcuts');
    unmount();

    render(
      <>
        <button type="button">Elsewhere</button>
        <SearchField label="Search" hasShortcut isDisabled />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await userEvent.keyboard('/');
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    // A disabled field doesn't advertise the shortcut either.
    expect(searchbox()).not.toHaveAttribute('aria-keyshortcuts');
    expect(screen.queryByText('/', { selector: 'kbd' })).toBeNull();
  });

  it.runIf(hasFinePointer)(
    'shows the "/" hint only while empty and unfocused, with a fine pointer',
    async () => {
      render(<SearchField label="Search" hasShortcut />);
      const hint = () => screen.queryByText('/', { selector: 'kbd' });
      expect(hint()).toBeVisible();
      expect(hint()).toHaveAttribute('aria-hidden', 'true');
      await userEvent.click(searchbox());
      expect(hint()).not.toBeVisible();
      await userEvent.keyboard('a');
      expect(hint()).toBeNull();
    },
  );

  it.runIf(!hasFinePointer)('hides the "/" hint on touch-first devices', () => {
    render(<SearchField label="Search" hasShortcut />);
    expect(screen.queryByText('/', { selector: 'kbd' })).not.toBeVisible();
  });

  it('works controlled', async () => {
    function Controlled() {
      const [query, setQuery] = useState('heat');
      return (
        <>
          <SearchField label="Search" value={query} onChange={setQuery} />
          <output>{query || 'empty'}</output>
          <button
            type="button"
            onClick={() => {
              setQuery('');
            }}
          >
            Reset
          </button>
        </>
      );
    }
    render(<Controlled />);
    expect(searchbox()).toHaveValue('heat');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('status').textContent).toBe('empty');
    await userEvent.type(searchbox(), 'pv');
    expect(screen.getByRole('status').textContent).toBe('pv');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(searchbox()).toHaveValue('');
  });

  it('shows the error message when invalid and marks the input invalid', () => {
    render(<SearchField label="Search" isInvalid errorMessage="Enter at least 2 characters" />);
    const input = searchbox();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Enter at least 2 characters/);
    expect(screen.getByText('Enter at least 2 characters')).toBeInTheDocument();
  });

  it('has no clear button when read-only, and takes a ref, inputRef, className and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    const inputRef = createRef<HTMLInputElement>();
    render(
      <SearchField
        label="Search"
        isReadOnly
        defaultValue="fixed"
        ref={ref}
        inputRef={inputRef}
        className="mt-2"
        data-testid="search"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    expect(inputRef.current).toBe(searchbox());
    expect(ref.current).toBe(screen.getByTestId('search'));
    expect(ref.current?.className).toContain('mt-2');
  });

  it.runIf(isPhone)('uses at least 16px text on phones so iOS does not zoom', () => {
    render(<SearchField label="Search" />);
    expect(parseFloat(getComputedStyle(searchbox()).fontSize)).toBeGreaterThanOrEqual(16);
  });

  it.runIf(hasTouch)(
    'clears when the clear button is tapped, with touch-sized targets',
    async () => {
      const onClear = vi.fn();
      render(<SearchField label="Search" size="sm" defaultValue="grid" onClear={onClear} />);
      const box = searchbox().parentElement?.getBoundingClientRect();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      const clear = screen.getByRole('button', { name: 'Clear' });
      const rect = clear.getBoundingClientRect();
      // The button fills the field's height (over its border) and stays inside its sides.
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.right).toBeLessThanOrEqual(box?.right ?? 0);
      await commands.tap('button[aria-label="Clear"]');
      expect(onClear).toHaveBeenCalledOnce();
      expect(searchbox()).toHaveValue('');
    },
  );

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <SearchField label="Search" description="Help" hasShortcut />
        <SearchField label="With value" defaultValue="solar" />
        <SearchField label="Invalid" isInvalid errorMessage="Too short" />
        <SearchField label="Disabled" isDisabled />
        <SearchField aria-label="Unlabelled visually" placeholder="Search sites" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
