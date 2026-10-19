import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { parabolaAndSine, vertexPoint } from '../../test/math';
import { CoordinatePlane, type PlanePoint } from './CoordinatePlane';

const meta = {
  title: 'Math/CoordinatePlane',
  component: CoordinatePlane,
  args: {
    title: 'Parabola and sine',
    xRange: [-4, 4],
    yRange: [-3, 4],
    functions: parabolaAndSine,
  },
} satisfies Meta<typeof CoordinatePlane>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * y = x² − 2 and y = sin x, the area under the parabola from 0 to 1 shaded, and a vertex the learner drags (or moves
 * with the arrow keys) while its coordinates are reported.
 */
export const ParabolaAndSine: Story = {
  render: (args) => {
    const [vertex, setVertex] = useState<PlanePoint>(vertexPoint);
    return (
      <div className="flex flex-col gap-2">
        <CoordinatePlane
          {...args}
          points={[vertex]}
          draggablePointIds={['vertex']}
          dragStep={0.5}
          onPointMove={(id, x, y) => {
            setVertex({ ...vertex, x, y });
          }}
        />
        <p className="text-sm text-fg-muted tabular-nums">
          Vertex at ({vertex.x}, {vertex.y})
        </p>
      </div>
    );
  },
};

/** Trigonometry: x ticks at multiples of π, and tan x broken at its asymptotes. */
export const Trigonometry: Story = {
  args: {
    title: 'Sine, cosine and tangent',
    xRange: [-2 * Math.PI, 2 * Math.PI],
    yRange: [-3, 3],
    xTickFormat: 'pi',
    functions: [
      { id: 'sin', label: 'y = \\sin x', fn: Math.sin },
      { id: 'cos', label: 'y = \\cos x', fn: Math.cos, dash: [6, 4] },
      {
        id: 'tan',
        label: 'y = \\tan x',
        fn: Math.tan,
        features: 'Asymptotes at x = π/2 + kπ.',
      },
    ],
  },
};

/** A hyperbola, which breaks at x = 0 instead of drawing a vertical line. */
export const Reciprocal: Story = {
  args: {
    title: 'Reciprocal function',
    xRange: [-5, 5],
    yRange: [-5, 5],
    functions: [
      {
        id: 'reciprocal',
        label: 'y = \\frac{1}{x}',
        fn: (x) => 1 / x,
        features: 'Undefined at x = 0; approaches both axes.',
      },
    ],
  },
};

/** Geometry: labelled points, a segment, vectors and a triangle, without pan and zoom. */
export const Geometry: Story = {
  args: {
    title: 'Triangle and vectors',
    xRange: [-1, 7],
    yRange: [-1, 5],
    functions: [],
    isInteractive: false,
    points: [
      { id: 'a', x: 1, y: 1, label: 'A' },
      { id: 'b', x: 5, y: 1, label: 'B' },
      { id: 'c', x: 3, y: 4, label: 'C' },
    ],
    polygons: [
      {
        id: 'abc',
        points: [
          [1, 1],
          [5, 1],
          [3, 4],
        ],
        label: 'T',
      },
    ],
    segments: [
      { id: 'median', from: [3, 4], to: [3, 1], label: 'h' },
      { id: 'u', from: [0, 0], to: [2, 3], label: 'u', isVector: true, color: 'chart-2' },
      { id: 'v', from: [0, 0], to: [6, 0.5], label: 'v', isVector: true, color: 'chart-3' },
    ],
  },
};
