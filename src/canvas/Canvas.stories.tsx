import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { Canvas } from './Canvas';
import { CanvasItem } from './CanvasItem';
import { useCanvas } from './context';

const meta = {
  title: 'Canvas/Canvas',
  component: Canvas,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Canvas>;
export default meta;
type Story = StoryObj<typeof meta>;

interface Room {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const observatory: Room[] = [
  { id: 'dome', label: 'Telescope dome', x: 40, y: 40, width: 200, height: 160 },
  { id: 'control', label: 'Control room', x: 280, y: 40, width: 160, height: 100 },
  { id: 'lab', label: 'Optics lab', x: 280, y: 160, width: 160, height: 80 },
  { id: 'archive', label: 'Plate archive', x: 40, y: 240, width: 120, height: 80 },
  { id: 'visitor', label: 'Visitor centre', x: 200, y: 280, width: 240, height: 100 },
];

function RoomShape({ room }: { room: Room }) {
  return (
    <div className="flex size-full items-start rounded-control border border-border-strong bg-surface-2 p-2 text-sm text-fg">
      {room.label}
    </div>
  );
}

/** Rooms that can be moved with a drag or the arrow keys, snapping to the grid; Delete removes the selection. */
function FloorPlanDemo({ hasRulers = true }: { hasRulers?: boolean }) {
  const [rooms, setRooms] = useState(observatory);
  return (
    <Canvas
      aria-label="Observatory floor plan"
      height="26rem"
      defaultViewport={{ x: -8, y: -8, zoom: 1 }}
      defaultSelection={['control']}
      grid={{ size: 20 }}
      rulers={hasRulers ? { unit: 'm' } : undefined}
      onDelete={(ids) => {
        setRooms((current) => current.filter((room) => !ids.includes(room.id)));
      }}
    >
      {rooms.map((room) => (
        <CanvasItem
          key={room.id}
          id={room.id}
          x={room.x}
          y={room.y}
          width={room.width}
          height={room.height}
          aria-label={room.label}
          onMoveEnd={(position) => {
            setRooms((current) =>
              current.map((other) => (other.id === room.id ? { ...other, ...position } : other)),
            );
          }}
        >
          <RoomShape room={room} />
        </CanvasItem>
      ))}
    </Canvas>
  );
}

/** A floor plan on a 20-unit grid with rulers in metres. Drags snap to the grid (hold Alt to place freely). */
export const FloorPlan: Story = {
  render: () => <FloorPlanDemo />,
};

/** The same plan without rulers. */
export const WithoutRulers: Story = {
  render: () => <FloorPlanDemo hasRulers={false} />,
};

/** An empty canvas: the grid, the controls and nothing else. */
export const Empty: Story = {
  args: { 'aria-label': 'Empty sketch', grid: { size: 24 }, height: '16rem' },
};

const STAR_COUNT = 2000;

/**
 * 2,000 rectangles (a star chart's catalogue) with a minimap. Panning and zooming move one layer, so no item
 * re-renders; marquee selection and grid-snapped drags still work.
 */
export const TwoThousandShapes: Story = {
  render: function Render() {
    const [positions, setPositions] = useState(() =>
      Array.from({ length: STAR_COUNT }, (_, index) => ({
        x: (index % 50) * 40 + ((index * 7) % 13),
        y: Math.floor(index / 50) * 40 + ((index * 11) % 17),
      })),
    );
    // Memoized, so the canvas's own frames never rebuild 2,000 elements.
    const items = useMemo(
      () =>
        positions.map((position, index) => (
          <CanvasItem
            key={index}
            id={String(index)}
            x={position.x}
            y={position.y}
            width={24}
            height={16}
            aria-label={`Star ${String(index + 1)}`}
            onMoveEnd={(next) => {
              setPositions((current) =>
                current.map((other, otherIndex) => (otherIndex === index ? next : other)),
              );
            }}
          >
            <div className="size-full rounded-sm bg-accent-solid" />
          </CanvasItem>
        )),
      [positions],
    );
    return (
      <Canvas
        aria-label="Star catalogue"
        height="28rem"
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        grid={{ size: 20, isVisible: false }}
        hasMinimap
      >
        {items}
      </Canvas>
    );
  },
};

function Readout() {
  const { viewport, selection } = useCanvas();
  return (
    <p className="absolute top-2 right-2 z-10 rounded-control border border-border bg-surface-1 px-2 py-1 text-xs text-fg-muted tabular-nums">
      x {Math.round(viewport.x)} · y {Math.round(viewport.y)} · {selection.length} selected
    </p>
  );
}

/**
 * Single selection with no marquee: a drag on empty space pans. The overlay reads the canvas with `useCanvas()`.
 */
export const SingleSelectionWithReadout: Story = {
  render: () => (
    <Canvas
      aria-label="Observatory floor plan"
      height="22rem"
      defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
      selectionMode="single"
      defaultSelection={['dome']}
      overlay={<Readout />}
    >
      {observatory.map((room) => (
        <CanvasItem
          key={room.id}
          id={room.id}
          x={room.x}
          y={room.y}
          width={room.width}
          height={room.height}
          aria-label={room.label}
          isMovable={false}
        >
          <RoomShape room={room} />
        </CanvasItem>
      ))}
    </Canvas>
  ),
};
