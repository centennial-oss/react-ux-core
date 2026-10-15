import { render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { TextArea } from './TextArea';

const isPhone = window.matchMedia('(max-width: 639.98px)').matches;
const hasTouch = navigator.maxTouchPoints > 0;

function textbox(name: string) {
  return screen.getByRole<HTMLTextAreaElement>('textbox', { name });
}

function lineHeight(element: HTMLElement) {
  return parseFloat(getComputedStyle(element).lineHeight);
}

/** Types at the end of the text, wherever a click would have put the caret. */
async function typeAtEnd(area: HTMLTextAreaElement, text: string) {
  area.focus();
  area.setSelectionRange(area.value.length, area.value.length);
  await userEvent.keyboard(text);
}

function lines(count: number) {
  return Array.from({ length: count }, (_, index) => `Line ${String(index + 1)}`).join('\n');
}

describe('TextArea', () => {
  it('is a labelled, described multi-line textbox that calls onChange with the string value', async () => {
    const onChange = vi.fn();
    render(<TextArea label="Notes" description="Visible to your team" onChange={onChange} />);
    const area = textbox('Notes');
    expect(area.tagName).toBe('TEXTAREA');
    expect(area).toHaveAccessibleDescription('Visible to your team');
    await userEvent.type(area, 'Hi{Enter}there');
    expect(onChange).toHaveBeenLastCalledWith('Hi\nthere');
  });

  it('starts at minRows tall and grows with its content up to maxRows, then scrolls', async () => {
    render(<TextArea label="Notes" minRows={2} maxRows={4} />);
    const area = textbox('Notes');
    const line = lineHeight(area);
    const base = area.getBoundingClientRect().height;
    // Two lines of text plus the vertical padding.
    expect(base).toBeCloseTo(2 * line + 16, 0);

    await userEvent.fill(area, lines(3));
    expect(area.getBoundingClientRect().height).toBeCloseTo(3 * line + 16, 0);
    expect(getComputedStyle(area).overflowY).toBe('hidden');

    await userEvent.fill(area, lines(10));
    expect(area.getBoundingClientRect().height).toBeCloseTo(4 * line + 16, 0);
    expect(getComputedStyle(area).overflowY).toBe('auto');
    expect(area.scrollHeight).toBeGreaterThan(area.clientHeight);

    // It shrinks back when text is removed.
    await userEvent.clear(area);
    expect(area.getBoundingClientRect().height).toBeCloseTo(base, 0);
  });

  it('grows when typing wraps onto a new line, and when its container narrows', async () => {
    function Resizable() {
      const [width, setWidth] = useState(320);
      return (
        <>
          <div style={{ width }}>
            <TextArea label="Notes" minRows={1} defaultValue="A short sentence that fits" />
          </div>
          <button
            type="button"
            onClick={() => {
              setWidth(120);
            }}
          >
            Narrow
          </button>
        </>
      );
    }
    render(<Resizable />);
    const area = textbox('Notes');
    const line = lineHeight(area);
    expect(area.getBoundingClientRect().height).toBeCloseTo(line + 16, 0);
    await userEvent.click(screen.getByRole('button', { name: 'Narrow' }));
    // The ResizeObserver callback runs after layout, so wait for the new height.
    await expect
      .poll(() => area.getBoundingClientRect().height)
      .toBeGreaterThanOrEqual(2 * line + 16 - 1);
  });

  it('starts from defaultValue when uncontrolled, sized to fit it', () => {
    render(<TextArea label="Notes" minRows={1} defaultValue={lines(3)} />);
    const area = textbox('Notes');
    expect(area).toHaveValue(lines(3));
    expect(area.getBoundingClientRect().height).toBeCloseTo(3 * lineHeight(area) + 16, 0);
  });

  it('works controlled', async () => {
    function Controlled() {
      const [value, setValue] = useState('Hello');
      return (
        <>
          <TextArea
            label="Notes"
            value={value}
            onChange={(next) => {
              setValue(next.toUpperCase());
            }}
          />
          <button
            type="button"
            onClick={() => {
              setValue(lines(5));
            }}
          >
            Fill
          </button>
        </>
      );
    }
    render(<Controlled />);
    const area = textbox('Notes');
    await typeAtEnd(area, 'x');
    expect(area).toHaveValue('HELLOX');
    const before = area.getBoundingClientRect().height;
    await userEvent.click(screen.getByRole('button', { name: 'Fill' }));
    expect(area).toHaveValue(lines(5));
    // A value set from outside resizes the area too.
    expect(area.getBoundingClientRect().height).toBeGreaterThan(before);
  });

  it('shows a character count, associated with the textarea, that follows the value', async () => {
    render(
      <TextArea
        label="Bio"
        description="Shown on your profile"
        maxLength={20}
        hasCharacterCount
        defaultValue="Hello"
      />,
    );
    const area = textbox('Bio');
    expect(screen.getByText('5 / 20')).toBeInTheDocument();
    expect(area).toHaveAccessibleDescription('Shown on your profile 5 / 20');
    expect(area).toHaveAttribute('maxlength', '20');
    await typeAtEnd(area, ' world, and more text');
    expect(area).toHaveValue('Hello world, and mor');
    expect(screen.getByText('20 / 20')).toBeInTheDocument();
  });

  it('formats the count through the messages', () => {
    render(
      <UIProvider messages={{ characterCount: ({ count, max }) => `${count} of ${max}` }}>
        <TextArea label="Bio" maxLength={10} hasCharacterCount defaultValue="abc" />
      </UIProvider>,
    );
    expect(screen.getByText('3 of 10')).toBeInTheDocument();
  });

  it('shows no count without maxLength or without hasCharacterCount', () => {
    render(
      <>
        <TextArea label="One" hasCharacterCount defaultValue="abc" />
        <TextArea label="Two" maxLength={10} defaultValue="abc" />
      </>,
    );
    expect(screen.queryByText(/\//)).toBeNull();
    expect(textbox('One')).not.toHaveAttribute('aria-describedby');
  });

  it('shows the error message when invalid and marks the textarea invalid', () => {
    render(<TextArea label="Reason" isInvalid errorMessage="Tell us why" />);
    const area = textbox('Reason');
    expect(area).toHaveAttribute('aria-invalid', 'true');
    expect(area).toHaveAccessibleDescription(/Tell us why/);
    expect(screen.getByText('Tell us why')).toBeInTheDocument();
  });

  it('marks required fields, and takes a ref, inputRef, className and data attributes', () => {
    const ref = createRef<HTMLDivElement>();
    const inputRef = createRef<HTMLTextAreaElement>();
    render(
      <TextArea
        label="Notes"
        isRequired
        ref={ref}
        inputRef={inputRef}
        className="mt-2"
        data-testid="notes"
      />,
    );
    const area = textbox('Notes');
    expect(area).toBeRequired();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    expect(inputRef.current).toBe(area);
    expect(ref.current).toBe(screen.getByTestId('notes'));
    expect(ref.current?.className).toContain('mt-2');
  });

  it('puts the placeholder on the textarea', () => {
    render(<TextArea label="Notes" placeholder="Anything else?" />);
    expect(textbox('Notes')).toHaveAttribute('placeholder', 'Anything else?');
  });

  it.runIf(isPhone)('uses at least 16px text on phones so iOS does not zoom', () => {
    render(<TextArea label="Notes" />);
    expect(parseFloat(getComputedStyle(textbox('Notes')).fontSize)).toBeGreaterThanOrEqual(16);
  });

  it.runIf(hasTouch)(
    'focuses when tapped and is at least the minimum touch target tall',
    async () => {
      render(<TextArea label="Notes" minRows={1} />);
      await commands.tap('textarea');
      expect(textbox('Notes')).toHaveFocus();
      expect(textbox('Notes').parentElement?.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        44,
      );
    },
  );

  it('fits a 360 px page without horizontal scroll', () => {
    render(<TextArea label="Notes" defaultValue={'x'.repeat(400)} />);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <TextArea label="Notes" description="Help" isRequired />
        <TextArea label="Bio" maxLength={100} hasCharacterCount defaultValue="Hi" />
        <TextArea label="Reason" isInvalid errorMessage="Required" />
        <TextArea label="Read only" isReadOnly defaultValue="Fixed" />
        <TextArea label="Disabled" isDisabled />
        <TextArea aria-label="Unlabelled visually" placeholder="Comment" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
