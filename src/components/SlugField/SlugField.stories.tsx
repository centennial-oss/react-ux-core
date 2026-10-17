import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { TextField } from '../TextField/TextField';
import { SlugField } from './SlugField';

const taken = new Set(['moons-of-jupiter', 'about']);

/** A pretend availability check: some slugs are taken. */
async function checkSlug(slug: string, signal: AbortSignal) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 300);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
  return taken.has(slug) ? 'That address is already in use.' : undefined;
}

const meta = {
  title: 'Inputs/SlugField',
  component: SlugField,
  args: { label: 'Slug' },
} satisfies Meta<typeof SlugField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** The slug follows the title until it's edited by hand; "Reset" makes it follow again. */
export const FromTitle: Story = {
  render: function FromTitleStory() {
    const [title, setTitle] = useState('Café Déjà Vu!');
    return (
      <div className="flex max-w-md flex-col gap-5">
        <TextField label="Title" value={title} onChange={setTitle} />
        <SlugField label="Slug" source={title} prefix="https://blog.example.com/posts/" />
      </div>
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <SlugField label="Following" source="Rings of Saturn" />
      <SlugField label="Edited by hand" source="Rings of Saturn" defaultValue="saturn-rings" />
      <SlugField
        label="No source"
        defaultValue="night-sky-guide"
        description="Lower case, digits and hyphens"
      />
      <SlugField
        label="Invalid"
        defaultValue="about"
        isInvalid
        errorMessage="That address is reserved."
      />
      <SlugField label="Disabled" defaultValue="observatory" isDisabled />
    </div>
  ),
};

/** `validate` runs after typing pauses, aborting stale checks. Try "moons-of-jupiter". */
export const Availability: Story = {
  tags: ['!visual'],
  render: () => (
    <div className="max-w-md">
      <SlugField label="Slug" defaultValue="moons-of-saturn" validate={checkSlug} />
    </div>
  ),
};
