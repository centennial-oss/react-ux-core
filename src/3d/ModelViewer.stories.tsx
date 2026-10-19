import type { Meta, StoryObj } from '@storybook/react-vite';
import { cubeObj, modelUrl, rocketStl, stackedRocketStl } from '../../test/models';
import { ModelViewer } from './ModelViewer';

// Models built in code and served as blob URLs, so the stories work offline.
const rocketUrl = modelUrl(rocketStl);
const cubeUrl = modelUrl(cubeObj);

const meta = {
  title: '3D/ModelViewer',
  component: ModelViewer,
  parameters: { layout: 'padded' },
  // WebGL output differs between GPUs and drivers, so these stay out of the visual snapshots.
  tags: ['!visual'],
} satisfies Meta<typeof ModelViewer>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A model rocket from an STL file (z up, millimetres) with a grid floor, axes, wireframe and measurement: press
 * Measure, then tap or click two points on the model. The view presets frame it from each side.
 */
export const Rocket: Story = {
  args: {
    src: rocketUrl,
    format: 'stl',
    title: 'Model rocket',
    unit: 'mm',
    hasGrid: true,
    hasAxes: true,
    hasMeasure: true,
    hasWireframeToggle: true,
  },
};

/** An OBJ cube on a turntable: it spins until the view is moved (and never with reduced motion). */
export const Turntable: Story = {
  args: {
    src: cubeUrl,
    format: 'obj',
    title: 'Calibration cube',
    controls: 'turntable',
    unit: 'cm',
  },
};

/** Above the triangle limit, a warning says the model may be slow to move. */
export const LargeModel: Story = {
  args: {
    src: modelUrl(stackedRocketStl(20)),
    format: 'stl',
    title: 'Stacked blocks',
    unit: 'mm',
    triangleLimit: 200,
  },
};

/** When the file can't load, the viewer says so and offers to try again. */
export const LoadFailed: Story = {
  tags: ['visual'],
  args: { src: '/missing-model.stl', title: 'Bracket', height: '16rem' },
};

/**
 * A real product model, when one is placed at `.storybook/public/media/product.glb` (glTF keeps its own materials).
 * Without the file, this shows the load error.
 */
export const ProductGlb: Story = {
  name: 'Product (glTF)',
  args: {
    src: 'media/product.glb',
    title: 'Product',
    controls: 'turntable',
    hasWireframeToggle: true,
  },
};
