import { render, screen } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../test/axe';
import { cubeObj, modelUrl, rocketInfo, rocketStl, stackedRocketStl } from '../../test/models';
import type { Messages } from '../provider/messages';
import { UIProvider } from '../provider/UIProvider';
import type { ModelViewerMessages } from './messages';
import { ModelViewer } from './ModelViewer';

const isDesktop = window.innerWidth >= 1024;
const isTouch = navigator.maxTouchPoints > 0;
const rocketUrl = modelUrl(rocketStl);
const cubeUrl = modelUrl(cubeObj);

afterAll(() => {
  URL.revokeObjectURL(rocketUrl);
  URL.revokeObjectURL(cubeUrl);
});

async function loaded(container: HTMLElement) {
  await expect
    .poll(() => container.querySelector('section')?.dataset.modelStatus, { timeout: 10_000 })
    .toBe('ready');
}

describe('ModelViewer', () => {
  it('loads an STL, reports its size and triangles, and describes it', async () => {
    const onLoad = vi.fn();
    const { container } = render(
      <ModelViewer src={rocketUrl} format="stl" title="Model rocket" units="mm" onLoad={onLoad} />,
    );
    await loaded(container);
    expect(onLoad).toHaveBeenCalledTimes(1);
    const [info] = onLoad.mock.lastCall as [typeof rocketInfo];
    expect(info.triangles).toBe(rocketInfo.triangles);
    expect(info.bounds.x).toBeCloseTo(rocketInfo.bounds.x);
    expect(info.bounds.y).toBeCloseTo(rocketInfo.bounds.y);
    expect(info.bounds.z).toBeCloseTo(rocketInfo.bounds.z);
    const image = screen.getByRole('img', { name: 'Model rocket' });
    expect(image).toHaveAccessibleDescription(
      '3D model of Model rocket, 40 mm × 40 mm × 96 mm, 72 triangles.',
    );
    expect(image.querySelector('canvas')).not.toBeNull();
  });

  it('loads an OBJ with quad faces', async () => {
    const onLoad = vi.fn();
    const { container } = render(
      <ModelViewer src={cubeUrl} format="obj" title="Cube" onLoad={onLoad} />,
    );
    await loaded(container);
    expect(onLoad).toHaveBeenCalledWith({ triangles: 12, bounds: { x: 2, y: 2, z: 2 } });
  });

  it('shows progress while loading, then an error with retry when the file is missing', async () => {
    const onError = vi.fn();
    render(<ModelViewer src="/no-such-model.stl" title="Bracket" onError={onError} />);
    expect(screen.getByRole('progressbar', { name: 'Loading model' })).toBeInTheDocument();
    expect(
      await screen.findByText('The model couldn’t load', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    // It tries again (and fails again).
    await expect.poll(() => onError.mock.calls.length, { timeout: 10_000 }).toBe(2);
    // onError runs before the error state renders again.
    expect(
      await screen.findByText('The model couldn’t load', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });

  it('fails clearly for a file it can’t read', async () => {
    render(<ModelViewer src={modelUrl('not a model')} title="Mystery" />);
    expect(
      await screen.findByText('The model couldn’t load', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });

  it('warns above the triangle limit', async () => {
    const { container } = render(
      <ModelViewer
        src={modelUrl(stackedRocketStl(10))}
        format="stl"
        title="Stack"
        triangleLimit={100}
      />,
    );
    await loaded(container);
    expect(
      screen.getByText('This model has 120 triangles, so it may be slow to move on some devices.'),
    ).toBeInTheDocument();
  });

  it.skipIf(!isDesktop)('view presets and toggles work by keyboard', async () => {
    const { container } = render(
      <ModelViewer src={rocketUrl} format="stl" title="Rocket" hasWireframeToggle hasMeasure />,
    );
    await loaded(container);
    const toolbar = screen.getByRole('toolbar', { name: 'View controls' });
    expect(toolbar).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Front' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Top' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    const wireframe = screen.getByRole('button', { name: 'Wireframe' });
    wireframe.focus();
    await userEvent.keyboard(' ');
    expect(wireframe).toHaveAttribute('aria-pressed', 'true');
  });

  it('measures between two points on the model, in model units', async () => {
    const onMeasure = vi.fn();
    const { container } = render(
      <ModelViewer
        src={rocketUrl}
        format="stl"
        title="Rocket"
        units="mm"
        hasMeasure
        onMeasure={onMeasure}
      />,
    );
    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: 'Front' }));
    await userEvent.click(screen.getByRole('button', { name: 'Measure' }));
    expect(screen.getByRole('status').textContent).toBe('Select a point on the model.');
    const canvas = container.querySelector('canvas');
    if (!canvas) {
      throw new Error('no canvas');
    }
    const { width, height } = canvas.getBoundingClientRect();
    // Two points on the body's front face, one above the other.
    await userEvent.click(canvas, { position: { x: width / 2, y: height / 2 } });
    expect(screen.getByRole('status').textContent).toBe('Select a second point.');
    await userEvent.click(canvas, { position: { x: width / 2, y: height / 2 - height / 8 } });
    await expect.poll(() => onMeasure.mock.lastCall?.[0] as number | null).toBeGreaterThan(1);
    const distance = onMeasure.mock.lastCall?.[0] as number;
    expect(distance).toBeLessThan(96);
    expect(screen.getByRole('status').textContent).toMatch(/^Distance: [\d.]+ mm$/);
    await userEvent.click(screen.getByRole('button', { name: 'Clear measurement' }));
    expect(onMeasure).toHaveBeenLastCalledWith(null);
  });

  it('turntable spins until stopped, and its button reflects it', async () => {
    const { container } = render(
      <ModelViewer src={cubeUrl} format="obj" title="Cube" controls="turntable" />,
    );
    await loaded(container);
    const turntable = screen.getByRole('button', { name: 'Turntable' });
    expect(turntable).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Iso' }));
    expect(turntable).toHaveAttribute('aria-pressed', 'false');
  });

  it.skipIf(!isTouch)('view presets work with a tap', async () => {
    const { container } = render(
      <ModelViewer src={cubeUrl} format="obj" title="Cube" controls="turntable" />,
    );
    await loaded(container);
    await commands.tap('button:has-text("Top")');
    expect(screen.getByRole('button', { name: 'Turntable' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('takes its strings from UIProvider messages', async () => {
    const overrides: Partial<ModelViewerMessages> = {
      modelViewFront: 'Vorne',
      modelTriangles: ({ count }) => `${count} Dreiecke`,
      modelDescription: ({ title, triangles }) => `${title}: ${triangles}`,
    };
    const { container } = render(
      <UIProvider messages={overrides as Partial<Messages>}>
        <ModelViewer src={cubeUrl} format="obj" title="Würfel" />
      </UIProvider>,
    );
    await loaded(container);
    expect(screen.getByRole('button', { name: 'Vorne' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Würfel' })).toHaveAccessibleDescription(
      'Würfel: 12 Dreiecke',
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ModelViewer
        src={rocketUrl}
        format="stl"
        title="Rocket"
        units="mm"
        hasGrid
        hasAxes
        hasMeasure
        hasWireframeToggle
        controls="turntable"
      />,
    );
    await loaded(container);
    await expectNoAxeViolations(container);
  });

  it('frees the canvas on unmount', async () => {
    const { container, unmount } = render(<ModelViewer src={cubeUrl} format="obj" title="Cube" />);
    await loaded(container);
    const canvas = container.querySelector('canvas');
    unmount();
    expect(canvas?.isConnected).toBe(false);
  });
});
