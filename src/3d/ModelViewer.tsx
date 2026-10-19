// ModelViewer: a three.js viewer for glTF, STL and OBJ models (CAD previews, 3D-print previews, product views). It
// shows download progress, frames the model on load, offers view presets, orbit or turntable controls, a grid floor
// and axes, wireframe, and point-to-point measurement in model units, all coloured from the theme.
import { Box, Rotate3d, Ruler } from 'lucide-react';
import { useCallback, useEffect, useId, useState, type Ref } from 'react';
import { Toolbar, useLocale } from 'react-aria-components';
import { Banner } from '../components/Banner/Banner';
import { Button } from '../components/Button/Button';
import { ErrorState } from '../components/ErrorState/ErrorState';
import { IconButton } from '../components/IconButton/IconButton';
import { ProgressBar } from '../components/ProgressBar/ProgressBar';
import { Tooltip } from '../components/Tooltip/Tooltip';
import { cn } from '../utils/cn';
import { numberFormat } from '../utils/intl';
import { useLatest } from '../utils/useLatest';
import { useIsReducedMotion } from '../utils/useMediaQuery';
import { useThemeAttribute } from '../utils/useThemeAttribute';
import {
  detectFormat,
  formatLength,
  type ModelFormat,
  type ModelUnits,
  type ModelView,
} from './geometry';
import { loadModel } from './loadModel';
import { useModelViewerMessages } from './messages';
import { ModelScene, readSceneColors, type MeasureState, type ModelInfo } from './scene';

export interface ModelViewerProps {
  /** The model's URL: `.glb`, `.gltf`, `.stl` or `.obj`. */
  src: string;
  /** The file's format, when the URL doesn't end in its extension (a blob URL or an API endpoint). */
  format?: ModelFormat;
  /** Names the model for assistive technology, in its text description. */
  title: string;
  /** `orbit` (default): drag to rotate, pinch or scroll to zoom, right-drag or two fingers to pan. `turntable` spins slowly until the user moves the view (never with reduced motion). */
  controls?: 'orbit' | 'turntable';
  /** A grid floor under the model, sized to it. */
  hasGrid?: boolean;
  /** The model's x, y and z axes (red, green, blue), from the corner of its bounds. */
  hasAxes?: boolean;
  /** A Measure button: tap or click two points on the model to measure the distance between them. */
  hasMeasure?: boolean;
  /** What one model unit is, for the dimensions and measurements. Without it, numbers have no unit. */
  unit?: ModelUnits;
  /** A Wireframe button. */
  hasWireframeToggle?: boolean;
  /** The model's up axis. Defaults to `z` for STL (3D-printing and CAD convention) and `y` otherwise. */
  upAxis?: 'y' | 'z';
  /** Above this many triangles, a warning says the model may be slow. Defaults to 1,000,000. */
  triangleLimit?: number;
  /** Called once the model loads, with its triangle count and its size along its own axes. */
  onLoad?: (info: ModelInfo) => void;
  /** Called when the model can't load. */
  onError?: (error: Error) => void;
  /** Called with the measured distance (in model units) once two points are placed, and `null` when cleared. */
  onMeasure?: (distance: number | null) => void;
  /** The viewer's height on tablet and desktop (CSS). Phones use a 4:3 box. Defaults to `24rem`. */
  height?: string;
  className?: string;
  /** The root `section`. */
  ref?: Ref<HTMLElement>;
}

type Status = 'loading' | 'ready' | 'failed';

const views: readonly ModelView[] = ['front', 'top', 'right', 'iso'];
const noMeasure: MeasureState = { points: 0, distance: null };

/**
 * A 3D model viewer (three.js) for glTF, STL and OBJ files, with view presets, orbit or turntable controls, grid,
 * axes, wireframe and measurement. The canvas has a text description (title, dimensions and triangle count), and
 * every control is a button.
 */
export function ModelViewer({
  src,
  format,
  title,
  controls = 'orbit',
  hasGrid = false,
  hasAxes = false,
  hasMeasure = false,
  unit: units,
  hasWireframeToggle = false,
  upAxis,
  triangleLimit = 1_000_000,
  onLoad,
  onError,
  onMeasure,
  height = '24rem',
  className,
  ref,
}: ModelViewerProps) {
  const messages = useModelViewerMessages();
  const { locale } = useLocale();
  const theme = useThemeAttribute();
  const isReducedMotion = useIsReducedMotion();
  const descriptionId = useId();
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [scene, setScene] = useState<ModelScene | null>(null);
  const [isUnsupported, setUnsupported] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [progress, setProgress] = useState<number | null>(null);
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isWireframe, setWireframe] = useState(false);
  const [isMeasuring, setMeasuring] = useState(false);
  const [measure, setMeasure] = useState<MeasureState>(noMeasure);
  const [isSpinChosen, setSpinChosen] = useState(true);
  const isTurntable = controls === 'turntable' && !isReducedMotion;
  const isSpinning = isTurntable && isSpinChosen && status === 'ready';

  const latest = useLatest({ onLoad, onError, onMeasure });

  // Start over when the model changes (React's "adjust state when a prop changes" pattern).
  const loadKey = [src, format, upAxis, attempt].join('\n');
  const [currentKey, setCurrentKey] = useState(loadKey);
  if (loadKey !== currentKey) {
    setCurrentKey(loadKey);
    setStatus('loading');
    setProgress(null);
    setInfo(null);
    setMeasure(noMeasure);
  }

  // The scene lives as long as its viewport element.
  const viewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      setViewport(node);
      if (!node) {
        return;
      }
      let instance: ModelScene;
      try {
        instance = new ModelScene(node, readSceneColors(node));
      } catch {
        // No WebGL.
        setUnsupported(true);
        return;
      }
      instance.onInteract = () => {
        setSpinChosen(false);
      };
      instance.onMeasure = (state) => {
        setMeasure(state);
        latest.current.onMeasure?.(state.distance);
      };
      const observer = new ResizeObserver(() => {
        instance.resize();
      });
      observer.observe(node);
      setScene(instance);
      return () => {
        observer.disconnect();
        instance.dispose();
        setScene(null);
      };
    },
    [latest],
  );

  useEffect(() => {
    if (!scene) {
      return;
    }
    let isCancelled = false;
    const resolved = format ?? detectFormat(src);
    loadModel(src, resolved, (fraction) => {
      if (!isCancelled) {
        setProgress(fraction);
      }
    })
      .then((model) => {
        if (isCancelled) {
          return;
        }
        const loaded = scene.setModel(model, upAxis ?? (resolved === 'stl' ? 'z' : 'y'));
        setInfo(loaded);
        setStatus('ready');
        latest.current.onLoad?.(loaded);
      })
      .catch((reason: unknown) => {
        if (!isCancelled) {
          setStatus('failed');
          latest.current.onError?.(reason instanceof Error ? reason : new Error(String(reason)));
        }
      });
    return () => {
      isCancelled = true;
      scene.clearModel();
    };
  }, [scene, src, format, upAxis, attempt, latest]);

  // Colours follow the theme live.
  useEffect(() => {
    if (scene && viewport) {
      scene.setColors(readSceneColors(viewport));
    }
  }, [scene, viewport, theme]);

  useEffect(() => {
    scene?.setHelpers(hasGrid, hasAxes);
  }, [scene, hasGrid, hasAxes]);

  useEffect(() => {
    scene?.setWireframe(isWireframe);
  }, [scene, isWireframe]);

  useEffect(() => {
    scene?.setTurntable(isSpinning);
  }, [scene, isSpinning]);

  useEffect(() => {
    scene?.setMeasuring(hasMeasure && isMeasuring);
  }, [scene, hasMeasure, isMeasuring]);

  const isReady = status === 'ready' && !isUnsupported;
  const viewLabels: Record<ModelView, string> = {
    front: messages.modelViewFront,
    top: messages.modelViewTop,
    right: messages.modelViewRight,
    iso: messages.modelViewIso,
  };

  let dimensions = '';
  let triangles = '';
  if (info) {
    dimensions = messages.modelDimensions({
      x: formatLength(info.bounds.x, units, locale),
      y: formatLength(info.bounds.y, units, locale),
      z: formatLength(info.bounds.z, units, locale),
    });
    triangles = messages.modelTriangles({
      count: numberFormat(locale).format(info.triangles),
    });
  }

  let measureText = '';
  if (hasMeasure && isMeasuring && isReady) {
    if (measure.distance !== null) {
      measureText = messages.modelDistance({
        distance: formatLength(measure.distance, units, locale),
      });
    } else {
      measureText = measure.points === 0 ? messages.modelMeasureStart : messages.modelMeasureNext;
    }
  }

  return (
    <section
      ref={ref}
      aria-label={title}
      aria-busy={(status === 'loading' && !isUnsupported) || undefined}
      data-model-status={isUnsupported ? 'unsupported' : status}
      className={cn('flex min-w-0 flex-col gap-2', className)}
    >
      {info && info.triangles > triangleLimit && (
        <Banner tone="warning">
          {messages.modelLargeWarning({
            count: numberFormat(locale).format(info.triangles),
          })}
        </Banner>
      )}
      <Toolbar aria-label={messages.modelControls} className="flex flex-wrap items-center gap-1">
        {views.map((view) => (
          <Button
            key={view}
            size="sm"
            variant="outline"
            isDisabled={!isReady}
            onPress={() => {
              setSpinChosen(false);
              scene?.setView(view);
            }}
          >
            {viewLabels[view]}
          </Button>
        ))}
        <span className="ms-auto flex items-center gap-1">
          {isTurntable && (
            <Tooltip content={messages.modelTurntable}>
              <IconButton
                icon={Rotate3d}
                aria-label={messages.modelTurntable}
                size="sm"
                isDisabled={!isReady}
                isSelected={isSpinning}
                onChange={setSpinChosen}
              />
            </Tooltip>
          )}
          {hasWireframeToggle && (
            <Tooltip content={messages.modelWireframe}>
              <IconButton
                icon={Box}
                aria-label={messages.modelWireframe}
                size="sm"
                isDisabled={!isReady}
                isSelected={isWireframe}
                onChange={setWireframe}
              />
            </Tooltip>
          )}
          {hasMeasure && (
            <Tooltip content={messages.modelMeasure}>
              <IconButton
                icon={Ruler}
                aria-label={messages.modelMeasure}
                size="sm"
                isDisabled={!isReady}
                isSelected={isMeasuring}
                onChange={setMeasuring}
              />
            </Tooltip>
          )}
        </span>
      </Toolbar>
      <div
        className="relative w-full overflow-hidden rounded-card border border-border bg-surface-2 max-sm:aspect-[4/3] sm:h-(--model-height)"
        // eslint-disable-next-line no-restricted-syntax -- dynamic geometry: the viewer's height.
        style={{ '--model-height': height } as React.CSSProperties}
      >
        <div
          ref={viewportRef}
          role="img"
          aria-label={title}
          aria-describedby={info ? descriptionId : undefined}
          className={cn(
            'absolute inset-0',
            !isReady && 'invisible',
            isMeasuring && 'cursor-crosshair',
          )}
        />
        {isUnsupported ? (
          <ErrorState
            title={messages.modelUnsupported}
            description={messages.modelUnsupportedHint}
            className="absolute inset-0 justify-center"
          />
        ) : status === 'failed' ? (
          <ErrorState
            title={messages.modelLoadFailed}
            description={messages.modelLoadFailedHint}
            onRetry={() => {
              setAttempt((count) => count + 1);
            }}
            className="absolute inset-0 justify-center"
          />
        ) : (
          status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <ProgressBar
                label={messages.modelLoading}
                value={progress === null ? undefined : progress * 100}
                isIndeterminate={progress === null}
                className="max-w-xs"
              />
            </div>
          )
        )}
      </div>
      {(info !== null || measureText !== '') && (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          {info && (
            // The same facts as the canvas's description, which screen readers already hear.
            <p aria-hidden="true" className="flex flex-wrap gap-x-3 text-fg-muted tabular-nums">
              <span>{dimensions}</span>
              <span>{triangles}</span>
            </p>
          )}
          <div className="ms-auto flex items-center gap-2">
            <p role="status" className="font-medium text-fg tabular-nums">
              {measureText}
            </p>
            {measure.points > 0 && isMeasuring && (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  scene?.clearMeasure();
                }}
              >
                {messages.modelClearMeasure}
              </Button>
            )}
          </div>
        </div>
      )}
      {info && (
        <p id={descriptionId} className="sr-only">
          {messages.modelDescription({ title, dimensions, triangles })}
        </p>
      )}
    </section>
  );
}
