import { Check, MapPin, MousePointer2, Pencil, Pentagon, Plus, Square, Trash2 } from 'lucide-react';
import {
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from 'react';
import {
  GridList,
  GridListItem,
  ToggleButtonGroup,
  type Key,
  type Selection,
} from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { IconButton } from '../../components/IconButton/IconButton';
import { MenuItem } from '../../components/Menu/Menu';
import { MenuButton } from '../../components/Menu/MenuButtons';
import { Popover } from '../../components/Popover/Popover';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/mergeRefs';
import type { IconComponent } from '../../utils/icon';
import { toneSolidClasses } from '../../utils/toneClasses';
import { useControllableState } from '../../utils/useControllableState';
import { AnnotationEditor } from './AnnotationEditor';
import { AnnotationOverlay } from './AnnotationOverlay';
import {
  clampPoint,
  createAnnotation,
  moveAnnotation,
  moveVertex,
  rectBetween,
  resizeRect,
  resizeRectBy,
  type Point,
  type RectCorner,
} from './geometry';
import {
  ImageViewerBase,
  type ImageViewerApi,
  type StageInteraction,
  type StagePointer,
} from './ImageViewer';
import { useMediaImageMessages, type MediaImageStrings } from './messages';
import type { Annotation, AnnotationKind, AnnotationPoint, ImageFit, MediaImage } from './types';

const ALL_TOOLS: readonly AnnotationKind[] = ['pin', 'rect', 'polygon'];

/** The pointer tool: select and move, or draw a kind of annotation. */
type Tool = 'select' | AnnotationKind;

const toolIcons: Record<Tool, IconComponent> = {
  select: MousePointer2,
  pin: MapPin,
  rect: Square,
  polygon: Pentagon,
};

function kindLabel(kind: AnnotationKind, messages: MediaImageStrings): string {
  const labels: Record<AnnotationKind, string> = {
    pin: messages.annotatorKindPin,
    rect: messages.annotatorKindRect,
    polygon: messages.annotatorKindPolygon,
  };
  return labels[kind];
}

function toolLabel(tool: Tool, messages: MediaImageStrings): string {
  return tool === 'select' ? messages.annotatorToolSelect : kindLabel(tool, messages);
}

/** A press on the image that's moving or reshaping an annotation, or drawing a rectangle. */
type Drag =
  | { type: 'move'; start: Point; original: Annotation; isAlreadySelected: boolean }
  | { type: 'resize'; corner: RectCorner; original: Annotation & { kind: 'rect' } }
  | { type: 'vertex'; index: number; original: Annotation & { kind: 'polygon' } }
  | { type: 'draw'; start: Point; id: string };

/** Where the edit popover points: the annotation's marker on the image, or its row in the list. */
interface Editing {
  id: string;
  from: 'image' | 'list';
}

export interface ImageAnnotatorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className' | 'style' | 'children' | 'onChange' | 'defaultValue' | 'aria-label'
> {
  image: MediaImage;
  /** The annotations, controlled. */
  annotations?: readonly Annotation[];
  /** The initial annotations, uncontrolled. */
  defaultAnnotations?: readonly Annotation[];
  /** Called with the new list after every change (added, moved, resized, relabelled, deleted). */
  onChange?: (annotations: Annotation[]) => void;
  /** The drawing tools offered. Defaults to pins, rectangles and polygons. */
  tools?: readonly AnnotationKind[];
  /** Labels to choose from, such as "Bruise" and "Laceration". Without them the label is typed. */
  labelOptions?: readonly string[];
  /** Annotations can be selected and viewed but not added, moved or edited. */
  isReadOnly?: boolean;
  /** The selected annotation's id, controlled. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectionChange?: (id: string | null) => void;
  /** Makes ids for new annotations. Defaults to ids unique within the page. */
  createId?: () => string;
  /** The image area's height, as a CSS length. Defaults to `28rem`. */
  height?: string;
  fit?: ImageFit;
  maxZoom?: number;
  /** Names the annotator's image viewer. Defaults to the `imageViewer` message. */
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Pins, rectangles and polygons on an image, in fractional coordinates so they survive resizing. Built on
 * ImageViewer (zoom, pan and rotate still work): draw with the tools, drag to move, drag handles to resize, and edit
 * the label and note in a popover. Every annotation is also in a side list that follows the selection and is fully
 * keyboard editable; on the image, the arrow keys nudge the selected shape and Enter adds one in the middle of the
 * view.
 */
export function ImageAnnotator({
  image,
  annotations,
  defaultAnnotations,
  onChange,
  tools = ALL_TOOLS,
  labelOptions,
  isReadOnly = false,
  selectedId,
  defaultSelectedId,
  onSelectionChange,
  createId,
  height = '28rem',
  fit,
  maxZoom,
  'aria-label': ariaLabel,
  className,
  ref,
  ...rest
}: ImageAnnotatorProps) {
  const messages = useMediaImageMessages();
  const listLabelId = useId();
  const helpId = useId();
  const baseId = useId();
  const idCount = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rootRefs = useMemo(() => mergeRefs(ref, rootRef), [ref]);
  const viewerApi = useRef<ImageViewerApi>(null);

  const [items, setItemsState] = useControllableState<readonly Annotation[]>(
    annotations,
    defaultAnnotations ?? [],
    onChange
      ? (next) => {
          onChange([...next]);
        }
      : undefined,
  );
  const [selected, setSelected] = useControllableState<string | null>(
    selectedId,
    defaultSelectedId ?? null,
    onSelectionChange,
  );
  const [tool, setToolState] = useState<Tool>('select');
  const [preview, setPreview] = useState<Annotation | null>(null);
  const [draft, setDraft] = useState<AnnotationPoint[] | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const drag = useRef<Drag | null>(null);

  const offeredTools: readonly Tool[] = isReadOnly ? [] : ['select', ...tools];
  const activeTool: Tool = offeredTools.includes(tool) ? tool : 'select';

  const shown = useMemo(() => {
    if (!preview) {
      return items;
    }
    return items.some((item) => item.id === preview.id)
      ? items.map((item) => (item.id === preview.id ? preview : item))
      : [...items, preview];
  }, [items, preview]);
  const numbers = useMemo(
    () => new Map(shown.map((annotation, index) => [annotation.id, index + 1])),
    [shown],
  );
  const labelOf = (annotation: Annotation) =>
    annotation.label === '' ? messages.annotatorUnlabelled : annotation.label;

  const select = (id: string | null) => {
    if (id !== selected) {
      setSelected(id);
    }
  };
  const newId = () => {
    let id = createId?.();
    while (id === undefined || items.some((item) => item.id === id)) {
      idCount.current += 1;
      id = `${baseId}-${idCount.current}`;
    }
    return id;
  };
  const replace = (annotation: Annotation) => {
    setItemsState(items.map((item) => (item.id === annotation.id ? annotation : item)));
  };
  const add = (annotation: Annotation, shouldEdit: boolean) => {
    setItemsState([...items, annotation]);
    select(annotation.id);
    setAnnouncement(messages.annotatorAdded({ label: labelOf(annotation) }));
    if (shouldEdit) {
      setEditing({ id: annotation.id, from: 'image' });
    }
  };
  const remove = (annotation: Annotation) => {
    setItemsState(items.filter((item) => item.id !== annotation.id));
    if (selected === annotation.id) {
      select(null);
    }
    setEditing(null);
    setAnnouncement(messages.annotatorDeleted({ label: labelOf(annotation) }));
  };
  const addAt = (kind: AnnotationKind, centre: AnnotationPoint, shouldEdit: boolean) => {
    add(createAnnotation(kind, centre, { id: newId(), label: '' }), shouldEdit);
  };
  const addInView = (kind: AnnotationKind) => {
    addAt(kind, viewerApi.current?.getCentre() ?? { x: 0.5, y: 0.5 }, false);
  };
  const finishPolygon = () => {
    if (draft && draft.length >= 3) {
      add({ id: newId(), kind: 'polygon', label: '', points: draft }, true);
    }
    setDraft(null);
  };
  const setTool = (next: Tool) => {
    setToolState(next);
    setDraft(null);
  };

  /** Finds the annotation (and handle) an element on the image belongs to. */
  const hitTest = (target: Element | null) => {
    const element = target?.closest('[data-annotation-id], [data-annotation-handle]');
    if (!element || !rootRef.current?.contains(element)) {
      return null;
    }
    return {
      annotation: items.find((item) => item.id === element.getAttribute('data-annotation-id')),
      handle: element.getAttribute('data-annotation-handle'),
    };
  };

  const dragResult = (current: Drag, point: Point): Annotation => {
    switch (current.type) {
      case 'move':
        return moveAnnotation(
          current.original,
          point.x - current.start.x,
          point.y - current.start.y,
        );
      case 'resize':
        return resizeRect(current.original, current.corner, point);
      case 'vertex':
        return moveVertex(current.original, current.index, point);
      case 'draw':
        return { id: current.id, kind: 'rect', label: '', ...rectBetween(current.start, point) };
    }
  };

  const isOnImage = (point: Point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;

  const interaction: StageInteraction = {
    onPointerDown: ({ point, target }: StagePointer) => {
      // While a polygon is being drawn, taps add points and drags pan.
      if (isReadOnly || draft) {
        return false;
      }
      const hit = hitTest(target);
      const annotation = hit?.annotation;
      if (annotation) {
        const handle = hit.handle;
        if (handle && annotation.id === selected && annotation.kind === 'rect') {
          drag.current = { type: 'resize', corner: handle as RectCorner, original: annotation };
        } else if (handle?.startsWith('vertex-') && annotation.kind === 'polygon') {
          drag.current = { type: 'vertex', index: Number(handle.slice(7)), original: annotation };
        } else {
          drag.current = {
            type: 'move',
            start: point,
            original: annotation,
            isAlreadySelected: annotation.id === selected,
          };
          select(annotation.id);
        }
        return true;
      }
      if (activeTool === 'rect' && isOnImage(point)) {
        drag.current = { type: 'draw', start: clampPoint(point), id: newId() };
        return true;
      }
      return false;
    },
    onPointerMove: ({ point }) => {
      if (drag.current) {
        setPreview(dragResult(drag.current, point));
      }
    },
    onPointerUp: ({ point, isTap }) => {
      const current = drag.current;
      drag.current = null;
      setPreview(null);
      if (!current) {
        return;
      }
      if (current.type === 'draw') {
        // A tap draws a rectangle of the default size around the point.
        if (isTap) {
          addAt('rect', point, true);
        } else {
          add(dragResult(current, point), true);
        }
        return;
      }
      if (isTap) {
        // A tap on the selected annotation edits it.
        if (current.type === 'move' && current.isAlreadySelected) {
          setEditing({ id: current.original.id, from: 'image' });
        }
        return;
      }
      replace(dragResult(current, point));
    },
    onPointerCancel: () => {
      drag.current = null;
      setPreview(null);
    },
    onTap: ({ point, target }) => {
      const hit = hitTest(target);
      if (isReadOnly) {
        select(hit?.annotation?.id ?? null);
        return hit?.annotation !== undefined;
      }
      if (draft) {
        if (hit?.handle === 'draft-start' && draft.length >= 3) {
          finishPolygon();
        } else if (isOnImage(point)) {
          setDraft([...draft, clampPoint(point)]);
        }
        return true;
      }
      if ((activeTool === 'pin' || activeTool === 'polygon') && isOnImage(point)) {
        if (activeTool === 'pin') {
          addAt('pin', point, true);
        } else {
          select(null);
          setDraft([clampPoint(point)]);
        }
        return true;
      }
      select(null);
      return false;
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (draft) {
        switch (event.key) {
          case 'Enter':
            finishPolygon();
            return true;
          case 'Escape':
            setDraft(null);
            return true;
          case 'Backspace':
            setDraft(draft.length > 1 ? draft.slice(0, -1) : null);
            return true;
          default:
            return false;
        }
      }
      const current = items.find((item) => item.id === selected);
      if (event.key === 'Enter' && !isReadOnly) {
        if (current) {
          setEditing({ id: current.id, from: 'image' });
          return true;
        }
        if (activeTool !== 'select') {
          addInView(activeTool);
          return true;
        }
        return false;
      }
      if (event.key === 'Escape' && current) {
        select(null);
        return true;
      }
      if (isReadOnly || !current) {
        return false;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        remove(current);
        return true;
      }
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const direction = directions[event.key];
      if (!direction) {
        return false;
      }
      // Steps are about the same on screen whatever the zoom.
      const ratio = Math.max(1, viewerApi.current?.getZoomRatio() ?? 1);
      const step = (event.shiftKey ? 0.05 : 0.01) / ratio;
      const [dx, dy] = direction;
      replace(
        event.altKey && current.kind === 'rect'
          ? resizeRectBy(current, dx * step, dy * step)
          : moveAnnotation(current, dx * step, dy * step),
      );
      return true;
    },
  };

  // The edit popover's anchor, looked up when the popover positions itself (after the annotation has rendered).
  const anchorRef = useMemo<RefObject<Element | null>>(
    () => ({
      get current() {
        if (!editing) {
          return null;
        }
        const selector =
          editing.from === 'list' ? '[role="row"][data-key]' : '[data-annotation-marker]';
        const attribute = editing.from === 'list' ? 'data-key' : 'data-annotation-id';
        return (
          [...(rootRef.current?.querySelectorAll(selector) ?? [])].find(
            (element) => element.getAttribute(attribute) === editing.id,
          ) ?? null
        );
      },
      set current(_value) {
        // Read-only: the anchor is always looked up.
      },
    }),
    [editing],
  );
  const edited = editing ? items.find((item) => item.id === editing.id) : undefined;
  // The editor keeps its name while it animates closed, after the annotation is no longer being edited.
  const [editorLabel, setEditorLabel] = useState<string | undefined>(undefined);
  const currentEditorLabel = edited
    ? messages.annotatorEdit({ label: labelOf(edited) })
    : undefined;
  if (currentEditorLabel !== undefined && currentEditorLabel !== editorLabel) {
    setEditorLabel(currentEditorLabel);
  }

  const toolbarStart =
    offeredTools.length > 0 ? (
      <>
        <ToggleButtonGroup
          aria-label={messages.annotatorTools}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[activeTool]}
          onSelectionChange={(keys: Selection) => {
            const key: Key | undefined = keys === 'all' ? undefined : keys.values().next().value;
            const chosen = offeredTools.find((candidate) => candidate === key);
            if (chosen) {
              setTool(chosen);
            }
          }}
          className="flex flex-wrap items-center gap-0.5"
        >
          {offeredTools.map((candidate) => (
            <Tooltip key={candidate} content={toolLabel(candidate, messages)}>
              <IconButton
                id={candidate}
                icon={toolIcons[candidate]}
                aria-label={toolLabel(candidate, messages)}
                size="sm"
                isSelected={candidate === activeTool}
              />
            </Tooltip>
          ))}
        </ToggleButtonGroup>
        {draft !== null && draft.length >= 3 && (
          <Button size="sm" variant="soft" tone="accent" icon={Check} onPress={finishPolygon}>
            {messages.annotatorFinishShape}
          </Button>
        )}
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
      </>
    ) : undefined;

  return (
    <div {...rest} ref={rootRefs} className={cn('relative @container min-w-0', className)}>
      <div className="flex min-w-0 flex-col gap-4 @3xl:flex-row @3xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ImageViewerBase
            image={image}
            height={height}
            fit={fit}
            maxZoom={maxZoom}
            aria-label={ariaLabel}
            apiRef={viewerApi}
            helpId={isReadOnly ? undefined : helpId}
            interaction={interaction}
            toolbarStart={toolbarStart}
            stageClassName={activeTool === 'select' ? undefined : 'cursor-crosshair'}
            overlay={
              <AnnotationOverlay
                annotations={shown}
                numbers={numbers}
                selectedId={selected}
                draft={draft}
                isReadOnly={isReadOnly}
              />
            }
          />
          {activeTool === 'polygon' && (
            <p className="text-xs text-fg-muted">{messages.annotatorPolygonHelp}</p>
          )}
        </div>
        <section
          aria-labelledby={listLabelId}
          className="flex min-w-0 flex-col gap-2 @3xl:w-72 @3xl:shrink-0"
        >
          <div className="flex min-h-8 items-center justify-between gap-2">
            <span id={listLabelId} className="text-sm font-semibold text-fg">
              {messages.annotatorList}
            </span>
            {!isReadOnly && tools.length > 0 && (
              <MenuButton
                label={messages.annotatorAdd}
                icon={Plus}
                size="sm"
                onAction={(key) => {
                  const kind = tools.find((candidate) => candidate === key);
                  if (kind) {
                    addInView(kind);
                  }
                }}
              >
                {tools.map((kind) => (
                  <MenuItem key={kind} id={kind} icon={toolIcons[kind]}>
                    {kindLabel(kind, messages)}
                  </MenuItem>
                ))}
              </MenuButton>
            )}
          </div>
          <GridList
            aria-labelledby={listLabelId}
            items={items}
            dependencies={[isReadOnly, messages, numbers]}
            selectionMode="single"
            selectionBehavior="replace"
            selectedKeys={selected === null ? [] : [selected]}
            onSelectionChange={(keys) => {
              const key: Key | undefined = keys === 'all' ? undefined : keys.values().next().value;
              select(key === undefined ? null : String(key));
            }}
            onAction={
              isReadOnly
                ? undefined
                : (key) => {
                    setEditing({ id: String(key), from: 'list' });
                  }
            }
            renderEmptyState={() => (
              <p className="px-1 py-2 text-sm text-fg-muted">{messages.annotatorEmpty}</p>
            )}
            className="flex min-w-0 flex-col gap-1 outline-none"
          >
            {(annotation) => {
              const label = labelOf(annotation);
              const KindIcon = toolIcons[annotation.kind];
              return (
                <GridListItem
                  id={annotation.id}
                  textValue={label}
                  className={cn(
                    'relative flex min-w-0 cursor-pointer items-center gap-2 rounded-control border border-border bg-surface-1 px-2 py-1.5 text-sm text-fg outline-none',
                    'data-hovered:bg-surface-3 data-selected:border-accent-border data-selected:bg-accent-bg',
                    'data-focus-visible:ring-2 data-focus-visible:ring-focus data-focus-visible:ring-inset',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      toneSolidClasses[annotation.tone ?? 'accent'],
                    )}
                  >
                    {numbers.get(annotation.id)}
                  </span>
                  <KindIcon aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        'min-w-0 break-words',
                        annotation.label === '' && 'text-fg-muted italic',
                      )}
                    >
                      {label}
                    </span>
                    {annotation.note !== undefined && (
                      <span className="truncate text-xs text-fg-muted">{annotation.note}</span>
                    )}
                  </span>
                  {!isReadOnly && (
                    <span className="flex shrink-0 gap-0.5">
                      <IconButton
                        icon={Pencil}
                        size="sm"
                        aria-label={messages.annotatorEdit({ label })}
                        onPress={() => {
                          select(annotation.id);
                          setEditing({ id: annotation.id, from: 'list' });
                        }}
                      />
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        aria-label={messages.annotatorDelete({ label })}
                        onPress={() => {
                          remove(annotation);
                        }}
                      />
                    </span>
                  )}
                </GridListItem>
              );
            }}
          </GridList>
        </section>
      </div>
      {!isReadOnly && (
        <p id={helpId} className="sr-only">
          {messages.annotatorHelp}
        </p>
      )}
      <Popover
        isOpen={edited !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditing(null);
          }
        }}
        triggerRef={anchorRef}
        aria-label={currentEditorLabel ?? editorLabel}
      >
        {edited && (
          <AnnotationEditor
            annotation={edited}
            labelOptions={labelOptions}
            messages={messages}
            onChange={replace}
            onDelete={() => {
              remove(edited);
            }}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </Popover>
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
