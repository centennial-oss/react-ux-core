import { ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type Ref } from 'react';
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger,
  Popover as AriaPopover,
} from 'react-aria-components';
import { Dialog } from '../../components/Dialog/Dialog';
import { popoverClasses } from '../../components/Overlay/styles';

import { cn } from '../../utils/cn';
import { useIsPhone } from '../../utils/useMediaQuery';
import type { HierarchyLevel, HierarchyNode, HierarchyPath } from '../types';
import { HierarchyPanel, type SearchLeaves } from './HierarchyPanel';
import {
  resolvePath,
  useHierarchyLoader,
  useLoadMissing,
  visibleLabels,
  type HierarchySource,
  type LoadChildren,
} from './model';
import { useShellMessages } from '../messages';

interface HierarchyPickerOwnProps {
  /** The current scope, one node per level from the top. Controlled. */
  value: HierarchyPath;
  /** Called with the full path when the user chooses a scope (at the bottom level, from Recent or the search). */
  onSelect: (path: HierarchyPath) => void;
  /** Search across every bottom-level choice, returning full paths. Adds a search field to the panel. */
  searchLeaves?: SearchLeaves;
  /** Recently used scopes, most recent first. */
  recent?: readonly HierarchyPath[];
  /** Opens the panel on first render. */
  defaultOpen?: boolean;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

export type HierarchyPickerProps = HierarchyPickerOwnProps &
  (
    | {
        /** The whole tree. */
        tree: readonly HierarchyNode[];
        /** Names the levels (column headings), from the top. */
        levels?: readonly HierarchyLevel[];
        loadChildren?: never;
      }
    | {
        /** The levels, from the top. */
        levels: readonly HierarchyLevel[];
        /** Loads a level's choices under a parent (`null` at the top level). */
        loadChildren: LoadChildren;
        tree?: never;
      }
  );

/**
 * A scope switcher over levels (for example Organisation ▸ Region ▸ Location). The trigger shows the current path;
 * the panel has a column per level, a search across all bottom-level choices and a Recent list, and becomes a
 * full-screen sheet on phones. Levels with exactly one choice are chosen automatically and hidden; when every level
 * has one choice, the picker renders nothing.
 */
export function HierarchyPicker(props: HierarchyPickerProps) {
  const { value, onSelect, searchLeaves, recent, defaultOpen = false, className, ref } = props;
  const messages = useShellMessages();
  const isPhone = useIsPhone();
  const { tree, levels, loadChildren } = props;
  const source = useMemo<HierarchySource>(
    () => (loadChildren ? { levels, loadChildren } : { tree, levels }),
    [tree, levels, loadChildren],
  );
  const [isOpen, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState<HierarchyPath>(value);
  // A choice whose next levels are still loading: the scope is chosen once they arrive (one of them may have a
  // single choice, made for the user).
  const [isAwaitingLevels, setAwaitingLevels] = useState(false);

  const commit = (path: HierarchyPath) => {
    setAwaitingLevels(false);
    setOpen(false);
    onSelect(path);
  };
  const pending = useRef({ isAwaiting: false, draft, source, commit });
  useEffect(() => {
    pending.current = { isAwaiting: isOpen && isAwaitingLevels, draft, source, commit };
  });
  const { loaded, load, retry } = useHierarchyLoader(source, (nextLoaded) => {
    const waiting = pending.current;
    if (!waiting.isAwaiting) {
      return;
    }
    const resolved = resolvePath(waiting.source, waiting.draft, nextLoaded);
    if (resolved.isComplete) {
      waiting.commit(resolved.path);
    }
  });

  const current = resolvePath(source, value, loaded);
  const browsing = resolvePath(source, draft, loaded);
  useLoadMissing(load, isOpen ? [...current.missing, ...browsing.missing] : current.missing);

  const choose = (depth: number, node: HierarchyNode) => {
    const next = [...browsing.path.slice(0, depth), node];
    const resolved = resolvePath(source, next, loaded);
    if (resolved.isComplete) {
      commit(resolved.path);
      return;
    }
    setDraft(next);
    setAwaitingLevels(true);
  };

  const isSingleChoice =
    current.isComplete &&
    current.levels.length > 0 &&
    current.levels.every((level) => level.isSkipped);
  if (isSingleChoice) {
    return null;
  }

  const labels = visibleLabels(current.path, current);
  const path = labels.join(messages.pathSeparator);
  const panel = (
    <HierarchyPanel
      resolved={browsing}
      onChoose={choose}
      onChoosePath={commit}
      onRetry={retry}
      recent={recent}
      searchLeaves={searchLeaves}
      isCompact={isPhone}
    />
  );

  return (
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setDraft(value);
        }
        setAwaitingLevels(false);
        setOpen(open);
      }}
    >
      <AriaButton
        ref={ref}
        aria-label={path === '' ? messages.chooseScope : messages.currentScope({ path })}
        className={cn(
          'flex min-h-hit min-w-0 cursor-default items-center gap-1.5 rounded-control px-2 py-1 text-sm text-fg outline-none',
          'data-hovered:bg-surface-3 data-pressed:bg-surface-4 data-focus-visible:focus-ring',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate', isPhone ? 'max-w-[40vw]' : 'max-w-md')}>
          {/* Phones show only the innermost level; the full path is the button's name. */}
          {path === '' ? messages.chooseScope : isPhone ? labels.at(-1) : path}
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
      </AriaButton>
      {isPhone ? (
        <Dialog title={messages.chooseScope} classNames={{ body: 'flex flex-col' }}>
          {panel}
        </Dialog>
      ) : (
        <AriaPopover
          placement="bottom start"
          offset={8}
          className={cn(popoverClasses, 'max-h-[min(36rem,80vh)]')}
        >
          <AriaDialog aria-label={messages.chooseScope} className="p-3 outline-none">
            {panel}
          </AriaDialog>
        </AriaPopover>
      )}
    </DialogTrigger>
  );
}
