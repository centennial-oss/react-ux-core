import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { TagField, type TagFieldProps } from './TagField';

const hasTouch = navigator.maxTouchPoints > 0;

const languages = ['Go', 'Java', 'JavaScript', 'Python', 'Rust', 'TypeScript'];

function Controlled(props: Omit<TagFieldProps, 'value' | 'onChange'> & { initial?: string[] }) {
  const { initial = [], ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <>
      <TagField label="Tags" {...rest} value={value} onChange={setValue} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

function value(): string[] {
  return JSON.parse(screen.getByTestId('value').textContent) as string[];
}

/** The tags as rendered, by their rows' names. */
function shownTags(): string[] {
  const grid = screen.queryByRole('grid');
  return grid
    ? within(grid)
        .getAllByRole('row')
        .map((row) => row.getAttribute('aria-label') ?? '')
    : [];
}

function input() {
  return screen.getByRole('textbox', { name: 'Tags' });
}

/** The field's own announcements (React Aria's announcer, for its lists and drags, is another live region). */
function liveText() {
  return document.querySelector('span[data-live-announcer] > [aria-live]')?.textContent ?? '';
}

/** Visible text, not counting the same words in the field's live region. */
function shownText(text: string) {
  return screen.queryByText(text, { ignore: '[aria-live], script, style' });
}

function paste(target: HTMLElement, text: string): ClipboardEvent {
  const event = new ClipboardEvent('paste', {
    clipboardData: new DataTransfer(),
    bubbles: true,
    cancelable: true,
  });
  event.clipboardData?.setData('text/plain', text);
  target.dispatchEvent(event);
  return event;
}

/** Waits for the suggestions (touch screens reveal them after a short delay) and returns the list. */
async function suggestions() {
  await expect
    .poll(
      () => {
        const listbox = document.querySelector('[role="listbox"]');
        return listbox
          ? getComputedStyle(listbox.closest('[data-placement]') ?? listbox).opacity
          : '';
      },
      { timeout: 3000 },
    )
    .toBe('1');
  return screen.getByRole('listbox');
}

describe('TagField', () => {
  it('adds the typed text on Enter or a delimiter, trimmed, and announces it', async () => {
    render(<Controlled />);
    await userEvent.type(input(), '  solar {Enter}');
    expect(value()).toEqual(['solar']);
    expect(input()).toHaveValue('');
    expect(liveText()).toBe('Added solar');
    await userEvent.type(input(), 'battery,grid');
    expect(value()).toEqual(['solar', 'battery']);
    expect(input()).toHaveValue('grid');
    expect(shownTags()).toEqual(['solar', 'battery']);
  });

  it('ignores Enter with nothing typed, and blank pieces between delimiters', async () => {
    render(<Controlled />);
    await userEvent.type(input(), '{Enter}, ,a,,');
    expect(value()).toEqual(['a']);
    expect(input()).toHaveValue('');
  });

  it('adds what was typed when the field is left', async () => {
    render(
      <>
        <Controlled />
        <button type="button">Next</button>
      </>,
    );
    await userEvent.type(input(), 'solar');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(value()).toEqual(['solar']);
  });

  it('keeps Enter from submitting a form while it adds a tag', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    render(
      <form onSubmit={onSubmit}>
        <Controlled />
      </form>,
    );
    await userEvent.type(input(), 'solar{Enter}');
    expect(value()).toEqual(['solar']);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('splits a pasted list at commas and line breaks, around the caret', async () => {
    render(<Controlled initial={['a']} />);
    await userEvent.type(input(), 'b');
    const event = paste(input(), ', c\r\n\n d ,e');
    expect(event.defaultPrevented).toBe(true);
    await expect.poll(value).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(input()).toHaveValue('');
    expect(liveText()).toBe('Added 4');
  });

  it('splits pasted text at custom delimiters, and leaves a plain paste alone', async () => {
    render(<Controlled delimiters={[';']} />);
    expect(paste(input(), 'one, two').defaultPrevented).toBe(false);
    const event = paste(input(), 'x;y');
    expect(event.defaultPrevented).toBe(true);
    await expect.poll(value).toEqual(['x', 'y']);
  });

  it('refuses a repeat with a message the input describes, cleared by typing', async () => {
    render(<Controlled initial={['solar']} />);
    await userEvent.type(input(), 'solar{Enter}');
    expect(value()).toEqual(['solar']);
    const message = '“solar” is already added';
    expect(shownText(message)).toBeInTheDocument();
    expect(input()).toHaveAccessibleDescription(message);
    expect(liveText()).toBe(message);
    await userEvent.type(input(), 'x');
    expect(shownText(message)).toBeNull();
  });

  it('allows repeats when asked', async () => {
    render(<Controlled initial={['solar']} allowsDuplicates />);
    await userEvent.type(input(), 'solar{Enter}');
    expect(value()).toEqual(['solar', 'solar']);
    expect(shownTags()).toEqual(['solar', 'solar']);
  });

  it('refuses tags past maxItems, keeping their text to fix', async () => {
    render(<Controlled initial={['a']} maxItems={2} />);
    paste(input(), 'b, c, d');
    await expect.poll(value).toEqual(['a', 'b']);
    expect(input()).toHaveValue('c, d');
    expect(shownText('You can add up to 2')).toBeInTheDocument();
  });

  it('takes the last tag into the input to edit with Backspace in the empty input', async () => {
    render(<Controlled initial={['solar', 'battery']} />);
    await userEvent.click(input());
    await userEvent.keyboard('{Backspace}');
    // The tag stays in the value while its text is edited.
    expect(value()).toEqual(['solar', 'battery']);
    expect(shownTags()).toEqual(['solar']);
    expect(input()).toHaveValue('battery');
    expect(liveText()).toBe('Editing battery');
    await userEvent.keyboard('{Backspace}ies{Enter}');
    expect(value()).toEqual(['solar', 'batteries']);
  });

  it('removes a focused tag with Delete and edits it in place with Enter', async () => {
    render(<Controlled initial={['a', 'b', 'c']} />);
    const [, second] = within(screen.getByRole('grid', { name: 'Tags' })).getAllByRole('row');
    second?.focus();
    await userEvent.keyboard('{Delete}');
    expect(value()).toEqual(['a', 'c']);
    expect(liveText()).toBe('Removed b');
    // Focus moves to the tag that took its place.
    await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('c');
    await userEvent.keyboard('{ArrowLeft}{Enter}');
    expect(value()).toEqual(['a', 'c']);
    expect(shownTags()).toEqual(['c']);
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue('a');
    await userEvent.keyboard('2{Enter}');
    // An edited tag goes back where it was.
    expect(value()).toEqual(['a2', 'c']);
  });

  it('moves focus to the input when the last tag is removed', async () => {
    render(<Controlled initial={['a']} />);
    screen.getByRole('row', { name: 'a' }).focus();
    await userEvent.keyboard('{Backspace}');
    expect(value()).toEqual([]);
    await expect.poll(() => document.activeElement).toBe(input());
  });

  it('removes a tag with its remove button', async () => {
    const onChange = vi.fn<(value: string[]) => void>();
    render(<TagField label="Tags" defaultValue={['a', 'b']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove a' }));
    expect(onChange).toHaveBeenLastCalledWith(['b']);
    expect(shownTags()).toEqual(['b']);
  });

  it.runIf(hasTouch)('removes a tag with a touch tap', async () => {
    render(<Controlled initial={['a', 'b']} />);
    await commands.tap('[data-tag-index="0"] button');
    expect(value()).toEqual(['b']);
  });

  it('marks invalid tags in the danger tone, with their messages for screen readers', async () => {
    const { container } = render(
      <Controlled
        initial={['ada@example.com', 'grace@example']}
        validateTag={(tag) => (tag.includes('.') ? undefined : 'Not an email address')}
      />,
    );
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input()).toHaveAccessibleDescription('grace@example: Not an email address');
    const invalid = screen.getByRole('row', { name: 'grace@example Not an email address' });
    expect(invalid.querySelector('.border-danger-border, [class*="danger"]')).not.toBeNull();
    expect(screen.getByRole('row', { name: 'ada@example.com' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
    // Fixing the tag clears the error.
    await userEvent.click(screen.getByRole('button', { name: 'Remove grace@example' }));
    expect(input()).not.toHaveAttribute('aria-invalid');
  });

  it('shows the app error message with the field invalid', () => {
    render(<TagField label="Tags" isInvalid isRequired errorMessage="Add at least one tag" />);
    expect(input()).toHaveAccessibleDescription('Add at least one tag');
    expect(input()).toBeRequired();
  });

  it('is required only while there are no tags', () => {
    render(<TagField label="Tags" isRequired defaultValue={['a']} />);
    expect(input()).not.toBeRequired();
  });

  it('works uncontrolled', async () => {
    const onChange = vi.fn<(value: string[]) => void>();
    render(<TagField label="Tags" defaultValue={['a']} onChange={onChange} />);
    await userEvent.type(input(), 'b{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    expect(shownTags()).toEqual(['a', 'b']);
  });

  it('follows a controlled value', () => {
    const { rerender } = render(<TagField label="Tags" value={['a']} />);
    expect(shownTags()).toEqual(['a']);
    rerender(<TagField label="Tags" value={['x', 'y']} />);
    expect(shownTags()).toEqual(['x', 'y']);
  });

  it('changes nothing while read-only or disabled', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TagField label="Tags" defaultValue={['a']} isReadOnly onChange={onChange} />,
    );
    expect(screen.queryByRole('button', { name: 'Remove a' })).toBeNull();
    expect(input()).toHaveAttribute('readonly');
    await userEvent.click(input());
    await userEvent.keyboard('{Backspace}');
    screen.getByRole('row', { name: 'a' }).focus();
    await userEvent.keyboard('{Delete}');
    expect(paste(input(), 'b, c').defaultPrevented).toBe(false);
    rerender(<TagField label="Tags" defaultValue={['a']} isDisabled onChange={onChange} />);
    expect(input()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove a' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes its strings from UIProvider', async () => {
    render(
      <UIProvider
        messages={{
          remove: 'Retirer',
          tagDuplicate: ({ tag }) => `« ${tag} » existe déjà`,
          tagAdded: ({ tag }) => `${tag} ajouté`,
        }}
      >
        <Controlled initial={['a']} />
      </UIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Retirer a' })).toBeInTheDocument();
    await userEvent.type(input(), 'b{Enter}');
    expect(liveText()).toBe('b ajouté');
    await userEvent.type(input(), 'a{Enter}');
    expect(shownText('« a » existe déjà')).toBeInTheDocument();
  });

  it('has no sideways page scroll on a phone with long tags', () => {
    render(
      <TagField
        label="Tags"
        defaultValue={[
          'a-very-long-tag-without-any-spaces-that-would-otherwise-overflow-the-page-width',
          'short',
        ]}
      />,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <TagField
        label="Tags"
        description="Press Enter after each tag."
        defaultValue={['a', 'b']}
        isReorderable
      />,
    );
    await expectNoAxeViolations(container);
  });
});

describe('TagField suggestions', () => {
  function combobox() {
    return screen.getByRole('combobox', { name: 'Languages' });
  }

  it('filters suggestions as you type, leaving out chosen tags, and adds a chosen one', async () => {
    render(<Controlled label="Languages" suggestions={languages} initial={['Java']} />);
    await userEvent.type(combobox(), 'ja');
    const listbox = await suggestions();
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['JavaScript']);
    await userEvent.click(within(listbox).getByRole('option', { name: 'JavaScript' }), {
      force: true,
    });
    expect(value()).toEqual(['Java', 'JavaScript']);
    expect(combobox()).toHaveValue('');
  });

  it.skipIf(hasTouch)(
    'chooses a highlighted suggestion with Enter, not the typed text',
    async () => {
      render(<Controlled label="Languages" suggestions={languages} />);
      await userEvent.type(combobox(), 'rus');
      await suggestions();
      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(value()).toEqual(['Rust']);
      expect(combobox()).toHaveValue('');
    },
  );

  it('still adds text that isn’t a suggestion', async () => {
    render(<Controlled label="Languages" suggestions={languages} />);
    await userEvent.type(combobox(), 'Zig{Enter}');
    expect(value()).toEqual(['Zig']);
  });

  it('accepts only suggestions with allowsCustomValue false, as the list writes them', async () => {
    render(<Controlled label="Languages" suggestions={languages} allowsCustomValue={false} />);
    await userEvent.type(combobox(), 'Zig{Enter}');
    expect(value()).toEqual([]);
    expect(shownText('“Zig” isn’t one of the options')).toBeInTheDocument();
    await userEvent.clear(combobox());
    await userEvent.type(combobox(), 'python{Enter}');
    expect(value()).toEqual(['Python']);
  });

  it('has no accessibility violations with the list open', async () => {
    const { container } = render(
      <TagField label="Languages" suggestions={languages} defaultValue={['Go']} />,
    );
    await userEvent.type(combobox(), 'a');
    await suggestions();
    // While the list is open, React Aria hides the rest of the field (the tags too) from assistive technology, as it
    // does the rest of the page; leaving the input closes the list.
    await expectNoAxeViolations(container, { disabledRules: ['aria-hidden-focus'] });
  });
});

describe('TagField reordering', () => {
  it('reorders by keyboard drag and drop from a tag’s handle, announcing the move', async () => {
    render(<Controlled initial={['a', 'b', 'c']} isReorderable />);
    screen.getByRole('button', { name: 'Drag a' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Enter}');
    await expect.poll(value).toEqual(['b', 'a', 'c']);
    expect(liveText()).toBe('a, moved to position 2 of 3');
  });

  it.skipIf(hasTouch)('reorders by dragging a tag with the mouse', async () => {
    render(<Controlled initial={['a', 'b', 'c']} isReorderable />);
    await userEvent.dragAndDrop(
      screen.getByRole('row', { name: 'c' }),
      screen.getByRole('row', { name: 'a' }),
    );
    await expect.poll(value).toEqual(['c', 'a', 'b']);
  });

  it('has no drag handles unless reorderable, or while locked', () => {
    const { rerender } = render(<TagField label="Tags" defaultValue={['a']} />);
    expect(screen.queryByRole('button', { name: 'Drag a' })).toBeNull();
    rerender(<TagField label="Tags" defaultValue={['a']} isReorderable isReadOnly />);
    expect(screen.queryByRole('button', { name: 'Drag a' })).toBeNull();
    rerender(<TagField label="Tags" defaultValue={['a']} isReorderable />);
    expect(screen.getByRole('button', { name: 'Drag a' })).toBeInTheDocument();
  });
});

describe('TagField edge cases', () => {
  it('keeps refused tags apart: Enter adds them one at a time, and typing refuses nothing again', async () => {
    render(<Controlled maxItems={2} />);
    paste(input(), 'a\nb\nc\nd');
    await expect.poll(value).toEqual(['a', 'b']);
    expect(input()).toHaveValue('c, d');
    expect(shownText('You can add up to 2')).toBeInTheDocument();
    await userEvent.type(input(), 'x');
    expect(input()).toHaveValue('c, dx');
    expect(shownText('You can add up to 2')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Remove a' }));
    await userEvent.click(input());
    await userEvent.keyboard('{Enter}');
    expect(value()).toEqual(['b', 'c']);
    expect(input()).toHaveValue('dx');
  });

  it('removes through the latest onChange, not the one from when the tags last changed', async () => {
    function Draft() {
      const [draft, setDraft] = useState({ name: '', tags: ['a', 'b'] });
      return (
        <>
          <input
            aria-label="Name"
            value={draft.name}
            onChange={(event) => {
              setDraft({ ...draft, name: event.target.value });
            }}
          />
          <TagField
            label="Tags"
            value={draft.tags}
            onChange={(tags) => {
              setDraft({ ...draft, tags });
            }}
          />
          <output data-testid="draft">{JSON.stringify(draft)}</output>
        </>
      );
    }
    render(<Draft />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');
    await userEvent.click(screen.getByRole('button', { name: 'Remove a' }));
    expect(JSON.parse(screen.getByTestId('draft').textContent)).toEqual({
      name: 'Ada',
      tags: ['b'],
    });
  });

  it('keeps an edited tag when its new text is refused, and adds the next tag at the end', async () => {
    render(<Controlled initial={['a', 'b']} />);
    screen.getByRole('row', { name: 'a' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(input()).toHaveValue('a');
    await userEvent.keyboard('{Backspace}b{Enter}');
    expect(value()).toEqual(['a', 'b']);
    expect(shownText('“b” is already added')).toBeInTheDocument();
    await userEvent.keyboard('c{Enter}');
    expect(value()).toEqual(['a', 'b', 'c']);
  });

  it('sends no change while a tag is edited, nor when it goes back unchanged or the edit is cancelled', async () => {
    const onChange = vi.fn();
    render(
      <>
        <TagField label="Tags" defaultValue={['a', 'b']} onChange={onChange} />
        <button type="button">Next</button>
      </>,
    );
    await userEvent.click(input());
    await userEvent.keyboard('{Backspace}');
    expect(input()).toHaveValue('b');
    expect(shownTags()).toEqual(['a']);
    await userEvent.keyboard('{Enter}');
    expect(shownTags()).toEqual(['a', 'b']);
    await userEvent.keyboard('{Backspace}x{Escape}');
    expect(input()).toHaveValue('');
    expect(shownTags()).toEqual(['a', 'b']);
    expect(onChange).not.toHaveBeenCalled();
    // Emptying the text and leaving removes the tag, and focus goes where the user went.
    await userEvent.keyboard('{Backspace}{Backspace}');
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(['a']);
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  });

  it('describes a tag that turns invalid after it was added', () => {
    const { rerender } = render(<TagField label="Tags" defaultValue={['grace']} />);
    expect(screen.getByRole('row', { name: 'grace' })).toBeInTheDocument();
    rerender(
      <TagField label="Tags" defaultValue={['grace']} validateTag={() => 'Not an email address'} />,
    );
    expect(screen.getByRole('row', { name: 'grace Not an email address' })).toBeInTheDocument();
  });

  it('always lets an edited tag go back, even one outside a list it has to come from', async () => {
    const onChange = vi.fn();
    render(
      <TagField
        label="Languages"
        suggestions={languages}
        allowsCustomValue={false}
        defaultValue={['Legacy']}
        onChange={onChange}
      />,
    );
    const combobox = screen.getByRole('combobox', { name: 'Languages' });
    await userEvent.click(combobox);
    await userEvent.keyboard('{Backspace}');
    expect(combobox).toHaveValue('Legacy');
    await userEvent.tab();
    expect(shownTags()).toEqual(['Legacy']);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears text that isn’t in the list when a list-only field is left, saying why', async () => {
    render(
      <>
        <Controlled label="Languages" suggestions={languages} allowsCustomValue={false} />
        <button type="button">Next</button>
      </>,
    );
    const combobox = screen.getByRole('combobox', { name: 'Languages' });
    await userEvent.type(combobox, 'Zi');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(combobox).toHaveValue('');
    expect(value()).toEqual([]);
    expect(shownText('“Zi” isn’t one of the options')).toBeInTheDocument();
  });

  it('doesn’t move focus later when a parent turns a removal down', async () => {
    function Keeper() {
      const [tags, setTags] = useState(['a', 'b']);
      return (
        <TagField
          label="Tags"
          value={tags}
          onChange={(next) => {
            if (next.length >= tags.length) {
              setTags(next);
            }
          }}
        />
      );
    }
    render(<Keeper />);
    screen.getByRole('row', { name: 'b' }).focus();
    await userEvent.keyboard('{Delete}');
    expect(shownTags()).toEqual(['a', 'b']);
    await userEvent.click(input());
    await userEvent.keyboard('c{Enter}');
    expect(shownTags()).toEqual(['a', 'b', 'c']);
    expect(input()).toHaveFocus();
  });

  it('announces what a paste added along with what it refused', async () => {
    render(<Controlled initial={['a']} maxItems={3} />);
    paste(input(), 'b\nc\nd');
    await expect.poll(value).toEqual(['a', 'b', 'c']);
    expect(liveText()).toBe('Added 2. You can add up to 3');
  });
});
