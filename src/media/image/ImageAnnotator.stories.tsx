import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { bodyDiagram, telescopeAnnotations, telescopeDiagram } from '../../../test/mediaImages';
import { ImageAnnotator } from './ImageAnnotator';
import type { Annotation } from './types';

// Diagrams drawn on a canvas in code: deterministic, nothing downloaded.
const body = bodyDiagram();
const telescope = telescopeDiagram();

const bodyPins: Annotation[] = [
  { id: 'a', kind: 'pin', x: 0.5, y: 0.12, label: 'Headache', tone: 'warning' },
  { id: 'b', kind: 'pin', x: 0.26, y: 0.47, label: 'Bruise', note: 'About 3 cm across.' },
  { id: 'c', kind: 'pin', x: 0.6, y: 0.8, label: 'Sprain', tone: 'danger' },
];

const meta = {
  title: 'Media/ImageAnnotator',
  component: ImageAnnotator,
  args: { image: telescope, defaultAnnotations: telescopeAnnotations },
} satisfies Meta<typeof ImageAnnotator>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Pins, a rectangle and a polygon on a diagram, with the side list. */
export const Default: Story = {};

/** With one annotation selected: its handles show, and its row is selected in the list. */
export const Selected: Story = { args: { defaultSelectedId: 'objective' } };

/** A body map with label options: choose the pin tool, tap to place a pin, then choose its label. */
export const BodyMap: Story = {
  args: {
    image: body,
    defaultAnnotations: bodyPins,
    tools: ['pin'],
    labelOptions: ['Bruise', 'Laceration', 'Burn', 'Sprain', 'Headache'],
    height: '32rem',
  },
};

/** Nothing annotated yet. */
export const Empty: Story = {
  args: { image: body, defaultAnnotations: [], labelOptions: ['Bruise', 'Laceration'] },
};

/** Read-only: annotations can be selected and viewed, but not changed. */
export const ReadOnly: Story = { args: { isReadOnly: true, defaultSelectedId: 'eyepiece' } };

/** Controlled by the page, which shows the annotations as JSON. */
export const Controlled: Story = {
  tags: ['!visual'],
  render: function Controlled(args) {
    const [annotations, setAnnotations] = useState<Annotation[]>(telescopeAnnotations);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <div className="flex flex-col gap-3">
        <ImageAnnotator
          {...args}
          defaultAnnotations={undefined}
          annotations={annotations}
          onChange={setAnnotations}
          selectedId={selectedId}
          onSelectionChange={setSelectedId}
        />
        <pre className="overflow-auto rounded-control bg-surface-3 p-3 text-xs">
          {JSON.stringify({ selectedId, annotations }, null, 2)}
        </pre>
      </div>
    );
  },
};
