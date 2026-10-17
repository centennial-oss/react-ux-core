import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { UIProvider } from '../../provider/UIProvider';
import type { Messages } from '../../provider/messages';
import { expectNoAxeViolations } from '../../../test/axe';
import { describedText } from '../../../test/clipboard';
import { TextField } from '../TextField/TextField';
import type { SlugFieldMessages } from './messages';
import { SlugField } from './SlugField';

const hasTouch = navigator.maxTouchPoints > 0;

function textbox(name: string) {
  return screen.getByRole<HTMLInputElement>('textbox', { name });
}

function overrides(messages: Partial<SlugFieldMessages>): Partial<Messages> {
  return messages;
}

function TitleAndSlug({ onSlug }: { onSlug?: (slug: string) => void }) {
  const [title, setTitle] = useState('');
  return (
    <>
      <TextField label="Title" value={title} onChange={setTitle} />
      <SlugField label="Slug" source={title} onChange={onSlug} />
    </>
  );
}

describe('SlugField', () => {
  it('follows the title ("Café Déjà Vu!" → cafe-deja-vu) until edited by hand', async () => {
    const onSlug = vi.fn();
    render(<TitleAndSlug onSlug={onSlug} />);
    await userEvent.type(textbox('Title'), 'Café Déjà Vu!');
    expect(textbox('Slug')).toHaveValue('cafe-deja-vu');
    expect(onSlug).toHaveBeenLastCalledWith('cafe-deja-vu');
    expect(describedText(textbox('Slug'))).toContain('Follows the title');

    // A manual edit stops the following.
    await userEvent.type(textbox('Slug'), '-paris');
    expect(textbox('Slug')).toHaveValue('cafe-deja-vu-paris');
    expect(describedText(textbox('Slug'))).toContain('Edited by hand');
    await userEvent.type(textbox('Title'), ' Again');
    expect(textbox('Slug')).toHaveValue('cafe-deja-vu-paris');

    // Reset makes it follow again.
    await userEvent.click(screen.getByRole('button', { name: 'Reset to follow the title' }));
    expect(textbox('Slug')).toHaveValue('cafe-deja-vu-again');
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull();
  });

  it('cleans typing as it goes and finishes the slug on blur', async () => {
    const onChange = vi.fn();
    render(<SlugField label="Slug" onChange={onChange} />);
    await userEvent.type(textbox('Slug'), 'Moons OF Jupiter ');
    expect(textbox('Slug')).toHaveValue('moons-of-jupiter-');
    await userEvent.tab();
    expect(textbox('Slug')).toHaveValue('moons-of-jupiter');
    expect(onChange).toHaveBeenLastCalledWith('moons-of-jupiter');
  });

  it('starts detached when its value differs from the source', () => {
    render(<SlugField label="Slug" source="Rings of Saturn" defaultValue="rings" />);
    expect(textbox('Slug')).toHaveValue('rings');
    expect(screen.getByRole('button', { name: 'Reset to follow the title' })).toBeInTheDocument();
  });

  it('validates after a pause, aborting stale checks, and shows the error or announces "Available"', async () => {
    const signals: AbortSignal[] = [];
    const validate = vi.fn((slug: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string | undefined>((resolve) => {
        // Answers on the next task, so a newer slug can arrive first.
        requestAnimationFrame(() => {
          resolve(slug === 'about' ? 'Already in use' : undefined);
        });
      });
    });
    render(<SlugField label="Slug" validate={validate} validateDelay={50} />);
    await userEvent.type(textbox('Slug'), 'about');
    // Typing within the delay produces a single check, for the final slug.
    await expect.poll(() => validate.mock.calls.length).toBe(1);
    expect(validate.mock.calls[0]?.[0]).toBe('about');
    await expect.poll(() => textbox('Slug').getAttribute('aria-invalid')).toBe('true');
    expect(describedText(textbox('Slug'))).toContain('Already in use');

    await userEvent.type(textbox('Slug'), '-us');
    // The newer slug aborts the old check's signal.
    expect(signals[0]?.aborted).toBe(true);
    await expect.poll(() => validate.mock.calls.length).toBe(2);
    await expect.poll(() => textbox('Slug').getAttribute('aria-invalid')).toBeNull();
    await expect
      .poll(() => document.querySelector('[aria-live="polite"]')?.textContent)
      .toBe('Available');
  });

  it('shows the prefix before the input', () => {
    render(<SlugField label="Slug" prefix="https://blog.example.com/posts/" defaultValue="io" />);
    expect(screen.getByText('https://blog.example.com/posts/')).toBeVisible();
  });

  it('takes its strings from the messages', () => {
    render(
      <UIProvider messages={overrides({ slugLinked: 'Folgt dem Titel' })}>
        <SlugField label="Slug" source="Mond" />
      </UIProvider>,
    );
    expect(screen.getByText('Folgt dem Titel')).toBeInTheDocument();
  });

  it.runIf(hasTouch)('resets on tap', async () => {
    render(<SlugField label="Slug" source="Io" defaultValue="moon" />);
    await commands.tap('button');
    expect(textbox('Slug')).toHaveValue('io');
  });

  it('fits a 360 px page with a long prefix', () => {
    render(
      <div className="p-2">
        <SlugField
          label="Slug"
          prefix="https://a-very-long-observatory-blog.example.com/posts/archive/"
          defaultValue="the-moons-of-jupiter-and-saturn"
          source="Moons"
        />
      </div>,
    );
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <SlugField label="Following" source="Rings of Saturn" prefix="https://example.com/" />
        <SlugField label="Edited" source="Rings of Saturn" defaultValue="rings" />
        <SlugField label="Invalid" defaultValue="about" isInvalid errorMessage="Reserved" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
