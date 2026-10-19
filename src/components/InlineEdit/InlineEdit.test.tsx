import { render, screen, within } from '@testing-library/react';
import { Profiler, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { UIProvider } from '../../provider/UIProvider';
import { Option } from '../ListBox/ListBoxParts';
import { NumberField } from '../NumberField/NumberField';
import { Select } from '../Select/Select';
import { InlineEdit } from './InlineEdit';

const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const liveText = (container: HTMLElement) => container.querySelector('[aria-live]')?.textContent;
// Shown text, not the live region's copy of it.
const shownText = (text: string) =>
  screen.queryByText(text, { ignore: '[aria-live], script, style' });
const editButton = (name = 'Edit Project name') => screen.getByRole('button', { name });
const field = (name = 'Project name') => screen.getByRole('textbox', { name });
const isEditing = () => screen.queryByRole('textbox') !== null;

async function startEditing(name?: string) {
  await userEvent.click(editButton(name));
  await expect.poll(isEditing).toBe(true);
}

describe('InlineEdit', () => {
  it('shows the text with an edit button named by the label and described by the value', () => {
    render(<InlineEdit label="Project name" defaultValue="Apollo" />);
    expect(screen.getByText('Project name')).toBeVisible();
    expect(screen.getByText('Apollo')).toBeVisible();
    expect(editButton()).toHaveAccessibleDescription('Apollo');
    expect(isEditing()).toBe(false);
  });

  it('edits on press with the text selected, and Enter saves, announces and returns focus', async () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    const onEditingChange = vi.fn();
    const { container } = render(
      <InlineEdit
        label="Project name"
        defaultValue="Apollo"
        onChange={onChange}
        onSave={onSave}
        onEditingChange={onEditingChange}
      />,
    );
    await startEditing();
    const input = field() as HTMLInputElement;
    expect(input).toHaveFocus();
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 6]);
    expect(onEditingChange).toHaveBeenLastCalledWith(true);

    await userEvent.keyboard('Artemis{Enter}');
    await expect.poll(isEditing).toBe(false);
    expect(onSave).toHaveBeenCalledWith('Artemis');
    expect(onChange).toHaveBeenCalledWith('Artemis');
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('Artemis')).toBeVisible();
    expect(editButton()).toHaveFocus();
    expect(liveText(container)).toBe('Project name saved');
  });

  it('makes the whole text the edit button’s target', () => {
    render(<InlineEdit label="Project name" defaultValue="A rather long project name" />);
    const box = screen.getByText('A rather long project name').getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + 4, box.top + box.height / 2);
    expect(hit).toBe(editButton());
  });

  it('cancels with Escape: the value stays, onCancel is called and focus comes back', async () => {
    const onCancel = vi.fn();
    const onChange = vi.fn();
    render(
      <InlineEdit
        label="Project name"
        defaultValue="Apollo"
        onCancel={onCancel}
        onChange={onChange}
      />,
    );
    await startEditing();
    await userEvent.keyboard('Gemini{Escape}');
    await expect.poll(isEditing).toBe(false);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Apollo')).toBeVisible();
    expect(editButton()).toHaveFocus();
  });

  it('saves and cancels with its buttons', async () => {
    const onChange = vi.fn();
    const onCancel = vi.fn();
    render(
      <InlineEdit
        label="Project name"
        defaultValue="Apollo"
        onChange={onChange}
        onCancel={onCancel}
      />,
    );
    await startEditing();
    await userEvent.keyboard('Gemini');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect.poll(isEditing).toBe(false);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();

    await startEditing();
    await userEvent.keyboard('Gemini');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await expect.poll(isEditing).toBe(false);
    expect(onChange).toHaveBeenCalledWith('Gemini');
    expect(screen.getByText('Gemini')).toBeVisible();
  });

  it.runIf(isDesktop)(
    'edits from the keyboard: Enter or F2 on the text, F2 in the field',
    async () => {
      const onChange = vi.fn();
      render(<InlineEdit label="Project name" defaultValue="Apollo" onChange={onChange} />);
      await userEvent.tab();
      expect(editButton()).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect.poll(isEditing).toBe(true);
      await userEvent.keyboard('{Escape}');
      await expect.poll(isEditing).toBe(false);

      await userEvent.keyboard('{F2}');
      await expect.poll(isEditing).toBe(true);
      await userEvent.keyboard('Mercury{F2}');
      await expect.poll(isEditing).toBe(false);
      expect(onChange).toHaveBeenCalledWith('Mercury');
      expect(editButton()).toHaveFocus();
    },
  );

  it('closes without saving when nothing changed', async () => {
    const onSave = vi.fn();
    const { container } = render(
      <InlineEdit label="Project name" defaultValue="Apollo" onSave={onSave} />,
    );
    await startEditing();
    await userEvent.keyboard('{Enter}');
    await expect.poll(isEditing).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
    expect(liveText(container)).toBe('');
  });

  it('saves when focus leaves, and leaves focus where it went', async () => {
    const onChange = vi.fn();
    render(
      <>
        <InlineEdit label="Project name" defaultValue="Apollo" onChange={onChange} />
        <button type="button">Elsewhere</button>
      </>,
    );
    await startEditing();
    await userEvent.keyboard('Gemini');
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await expect.poll(isEditing).toBe(false);
    expect(onChange).toHaveBeenCalledWith('Gemini');
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
  });

  it('cancels when focus leaves with blurAction cancel, and stays open with none', async () => {
    const onCancel = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      <>
        <InlineEdit
          label="Project name"
          defaultValue="Apollo"
          blurAction="cancel"
          onCancel={onCancel}
          onChange={onChange}
        />
        <button type="button">Elsewhere</button>
      </>,
    );
    await startEditing();
    await userEvent.keyboard('Gemini');
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await expect.poll(isEditing).toBe(false);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <>
        <InlineEdit label="Project name" defaultValue="Apollo" blurAction="none" />
        <button type="button">Elsewhere</button>
      </>,
    );
    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(isEditing()).toBe(true);
  });

  it('keeps editing while focus moves into a field’s popover', async () => {
    const onChange = vi.fn();
    render(
      <InlineEdit
        label="Status"
        defaultValue="open"
        formatValue={(id) => (id === 'open' ? 'Open' : 'Closed')}
        onChange={onChange}
        renderEditor={(props) => (
          <Select<object, string> {...props}>
            <Option id="open">Open</Option>
            <Option id="closed">Closed</Option>
          </Select>
        )}
      />,
    );
    await userEvent.click(editButton('Edit Status'));
    const trigger = await screen.findByRole('button', { name: /Status/ });
    await userEvent.click(trigger);
    const listbox = await screen.findByRole('listbox');
    await userEvent.click(within(listbox).getByRole('option', { name: 'Closed' }));
    // Still editing after the list closed: the Save button is there.
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await expect.poll(() => onChange.mock.calls).toEqual([['closed']]);
    expect(screen.getByText('Closed')).toBeVisible();
  });

  it('shows a pending save, then keeps the field open with the returned error', async () => {
    const save = deferred<string | undefined>();
    const onChange = vi.fn();
    const { container } = render(
      <InlineEdit
        label="Project name"
        defaultValue="Apollo"
        onChange={onChange}
        onSave={() => save.promise}
      />,
    );
    await startEditing();
    await userEvent.keyboard('Gemini{Enter}');
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await expect.poll(() => saveButton.getAttribute('aria-busy')).toBe('true');
    expect(field()).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    // Escape and a second Enter wait for the save.
    await userEvent.keyboard('{Escape}{Enter}');
    expect(isEditing()).toBe(true);

    save.resolve('That name is taken');
    await expect.poll(() => shownText('That name is taken')).not.toBeNull();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription('That name is taken');
    expect(field()).not.toHaveAttribute('readonly');
    expect(liveText(container)).toBe('That name is taken');
    expect(onChange).not.toHaveBeenCalled();

    // Editing again clears the message.
    await userEvent.keyboard('s');
    expect(shownText('That name is taken')).toBeNull();
  });

  it('shows a rejected save’s message, or the generic one', async () => {
    const onSave = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Network down'))
      .mockRejectedValueOnce('nope')
      .mockResolvedValue(undefined);
    const onChange = vi.fn();
    render(
      <InlineEdit label="Project name" defaultValue="Apollo" onSave={onSave} onChange={onChange} />,
    );
    await startEditing();
    await userEvent.keyboard('Gemini{Enter}');
    await expect.poll(() => shownText('Network down')).not.toBeNull();
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => shownText('Something went wrong. Please try again.')).not.toBeNull();
    await userEvent.keyboard('{Enter}');
    await expect.poll(isEditing).toBe(false);
    expect(onChange).toHaveBeenCalledWith('Gemini');
  });

  it('validates with the field’s validate, as the user types and on save', async () => {
    const onSave = vi.fn();
    const { container } = render(
      <InlineEdit
        label="Project name"
        defaultValue="Apollo"
        validate={(value) => (value.trim() === '' ? 'Enter a name' : null)}
        onSave={onSave}
      />,
    );
    await startEditing();
    await userEvent.keyboard('{Backspace}');
    await expect.poll(() => shownText('Enter a name')).not.toBeNull();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    await userEvent.keyboard('{Enter}');
    expect(isEditing()).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
    expect(liveText(container)).toBe('Enter a name');
  });

  it('works controlled, including opening the field from the app', async () => {
    function Controlled() {
      const [value, setValue] = useState('Apollo');
      const [isEditingNow, setEditing] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
            }}
          >
            Rename
          </button>
          <InlineEdit
            label="Project name"
            value={value}
            onChange={(next) => {
              setValue(next.toUpperCase());
            }}
            isEditing={isEditingNow}
            onEditingChange={setEditing}
          />
          <output data-testid="value">{value}</output>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await expect.poll(isEditing).toBe(true);
    expect(field()).toHaveFocus();
    await userEvent.keyboard('gemini{Enter}');
    await expect.poll(isEditing).toBe(false);
    expect(screen.getByTestId('value')).toHaveTextContent('GEMINI');
    expect(screen.getByText('GEMINI', { selector: 'span' })).toBeVisible();
    expect(editButton()).toHaveFocus();
  });

  it('starts open with defaultEditing, without taking focus', () => {
    render(<InlineEdit label="Project name" defaultValue="Apollo" defaultEditing />);
    expect(field()).toHaveValue('Apollo');
    expect(field()).not.toHaveFocus();
  });

  it('shows a placeholder while empty, and names the button by the text without a label', async () => {
    const { rerender } = render(<InlineEdit label="Description" />);
    expect(screen.getByText('Not set')).toBeVisible();
    rerender(<InlineEdit label="Description" placeholder="Add a description" />);
    expect(screen.getByText('Add a description')).toBeVisible();
    await startEditing('Edit Description');
    expect(field('Description')).toHaveAttribute('placeholder', 'Add a description');

    rerender(<InlineEdit defaultValue="Apollo" key="unnamed" />);
    expect(editButton('Edit Apollo')).not.toHaveAccessibleDescription();
  });

  it('can’t be edited when disabled, and shows no edit button when read-only', async () => {
    const { rerender } = render(
      <InlineEdit label="Project name" defaultValue="Apollo" isDisabled />,
    );
    expect(editButton()).toBeDisabled();
    await userEvent.click(editButton(), { force: true });
    expect(isEditing()).toBe(false);

    rerender(<InlineEdit label="Project name" defaultValue="Apollo" isReadOnly />);
    expect(screen.getByText('Apollo')).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a heading, and edits it in the heading’s font', async () => {
    render(<InlineEdit aria-label="Project name" headingLevel={2} defaultValue="Apollo" />);
    const heading = screen.getByRole('heading', { level: 2, name: 'Apollo' });
    expect(editButton()).toHaveAccessibleDescription('Apollo');
    const headingSize = getComputedStyle(heading).fontSize;
    await startEditing();
    const input = field();
    expect(getComputedStyle(input).fontWeight).toBe('600');
    expect(getComputedStyle(input).fontSize).toBe(headingSize);
  });

  it('edits several lines: Enter adds a line and Ctrl+Enter saves', async () => {
    const onChange = vi.fn();
    render(<InlineEdit label="Notes" defaultValue="Line one" isMultiline onChange={onChange} />);
    await startEditing('Edit Notes');
    const area = field('Notes') as HTMLTextAreaElement;
    expect(area.tagName).toBe('TEXTAREA');
    expect([area.selectionStart, area.selectionEnd]).toEqual([8, 8]);
    await userEvent.keyboard('{Enter}Line two');
    expect(isEditing()).toBe(true);
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await expect.poll(isEditing).toBe(false);
    expect(onChange).toHaveBeenCalledWith('Line one\nLine two');
    const text = screen.getByText(/Line one/);
    expect(getComputedStyle(text).whiteSpace).toBe('pre-wrap');
  });

  it('edits any value through renderEditor, saving what the field commits on Enter', async () => {
    const onChange = vi.fn();
    render(
      <InlineEdit<number | null>
        label="Exposure"
        defaultValue={30}
        formatValue={(seconds) => (seconds === null ? '' : `${seconds} s`)}
        onChange={onChange}
        renderEditor={(props) => <NumberField {...props} minValue={1} />}
      />,
    );
    expect(screen.getByText('30 s')).toBeVisible();
    await startEditing('Edit Exposure');
    await userEvent.keyboard('45{Enter}');
    await expect.poll(isEditing).toBe(false);
    expect(onChange).toHaveBeenCalledWith(45);
    expect(screen.getByText('45 s')).toBeVisible();
  });

  it('handles Enter itself, so a surrounding form isn’t submitted', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => {
      event.preventDefault();
    });
    render(
      <form
        onSubmit={(event) => {
          onSubmit(event.nativeEvent);
        }}
      >
        <InlineEdit label="Project name" defaultValue="Apollo" />
      </form>,
    );
    await startEditing();
    await userEvent.keyboard('Gemini{Enter}');
    await expect.poll(isEditing).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uses UIProvider strings', async () => {
    const { container } = render(
      <UIProvider
        messages={{
          inlineEditLabel: ({ label }) => `Modifier ${label}`,
          inlineEditSaved: ({ label }) => `${label} enregistré`,
          save: 'Enregistrer',
          cancel: 'Annuler',
          notSet: 'Vide',
        }}
      >
        <InlineEdit label="Nom" />
      </UIProvider>,
    );
    expect(screen.getByText('Vide')).toBeVisible();
    await startEditing('Modifier Nom');
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeVisible();
    await userEvent.keyboard('Gemini');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await expect.poll(isEditing).toBe(false);
    expect(liveText(container)).toBe('Nom enregistré');
  });

  it.runIf(hasTouch)('edits and saves with touch', async () => {
    const onChange = vi.fn();
    render(<InlineEdit label="Project name" defaultValue="Apollo" onChange={onChange} />);
    await commands.tap('button[aria-label="Edit Project name"]');
    await expect.poll(isEditing).toBe(true);
    await userEvent.fill(field(), 'Gemini');
    await commands.tap('button[aria-label="Save"]');
    await expect.poll(isEditing).toBe(false);
    expect(onChange).toHaveBeenCalledWith('Gemini');
  });

  it('has no sideways page scroll on a phone with long text, reading or editing', async () => {
    const long = 'A-project-name-without-any-spaces-that-would-otherwise-overflow-the-page-width';
    render(<InlineEdit label="Project name" defaultValue={long} />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    await startEditing();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });

  it('stops rendering once settled, reading and editing', async () => {
    let commits = 0;
    render(
      <Profiler
        id="inline-edit"
        onRender={() => {
          commits += 1;
        }}
      >
        <InlineEdit label="Project name" defaultValue="Apollo" />
      </Profiler>,
    );
    const settled = async () => {
      const before = commits;
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });
      return commits - before;
    };
    await expect.poll(settled).toBe(0);
    await startEditing();
    await expect.poll(settled).toBe(0);
  });

  it('has no accessibility violations, reading and editing', async () => {
    const { container } = render(
      <>
        <InlineEdit aria-label="Project name" headingLevel={2} defaultValue="Apollo" />
        <InlineEdit label="Description" placeholder="Add a description" />
        <InlineEdit label="Owner" defaultValue="Ada Lovelace" isDisabled />
        <InlineEdit label="Code" defaultValue="APL-1" isReadOnly />
      </>,
    );
    await expectNoAxeViolations(container);
    await startEditing();
    await expectNoAxeViolations(container);
  });
});
