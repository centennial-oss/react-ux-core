import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  exposureProperties,
  exposureValues,
  marsShape,
  moonShape,
  shapeProperties,
} from '../../../test/shapes';
import { PropertyInspector, type PropertyInspectorProps } from './PropertyInspector';

type Shape = Record<string, unknown>;

/** A side panel that applies each change to every selected shape, as an app would. */
function Panel({ initial, ...props }: { initial: Shape[] } & Partial<PropertyInspectorProps>) {
  const [shapes, setShapes] = useState<Shape[]>(initial);
  return (
    <div className="w-full max-w-80 rounded-card border border-border bg-surface-1 p-3">
      <PropertyInspector
        aria-label="Shape properties"
        properties={shapeProperties}
        values={shapes.length === 1 ? (shapes[0] ?? {}) : shapes}
        onChange={(id, value) => {
          setShapes((current) =>
            current.map((shape) => ({
              ...shape,
              // A vector edit may hold one component when the other is mixed: merge it.
              [id]:
                id === 'position' ? { ...(shape.position as object), ...(value as object) } : value,
            })),
          );
        }}
        {...props}
      />
    </div>
  );
}

function Exposure() {
  const [values, setValues] = useState<Shape>(exposureValues);
  return (
    <div className="w-full max-w-sm rounded-card border border-border bg-surface-1 p-3">
      <PropertyInspector
        aria-label="Exposure settings"
        properties={exposureProperties}
        values={values}
        onChange={(id, value) => {
          setValues((current) => ({ ...current, [id]: value }));
        }}
      />
    </div>
  );
}

const meta = {
  title: 'Inputs/PropertyInspector',
  component: PropertyInspector,
  args: { properties: shapeProperties, values: moonShape, onChange: () => undefined },
} satisfies Meta<typeof PropertyInspector>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { tags: ['!visual'] };

/** One shape: position, size, rotation, fill and stroke width. Drag a number's label sideways to scrub it. */
export const Shape: Story = {
  render: () => <Panel initial={[moonShape]} />,
};

/** Two shapes with different fills, sizes and positions: those show "Mixed", and an edit applies to both. */
export const MixedSelection: Story = {
  render: () => <Panel initial={[moonShape, marsShape]} />,
};

/** Every property type, from text to JSON, in compact density. */
export const EveryType: Story = {
  render: () => <Exposure />,
};

/** `isCompact={false}`: labels above full-size inputs, for settings pages rather than side panels. */
export const Comfortable: Story = {
  render: () => (
    <div className="max-w-lg">
      <PropertyInspector
        properties={exposureProperties}
        values={exposureValues}
        onChange={() => undefined}
        isCompact={false}
        defaultExpandedGroups={['Capture']}
      />
    </div>
  ),
};

/** Nothing selected. */
export const Empty: Story = {
  render: () => <Panel initial={[]} />,
};
