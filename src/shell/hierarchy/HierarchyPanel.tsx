import { ChevronLeft, Clock } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { ListBox, type Key } from 'react-aria-components';
import { Button } from '../../components/Button/Button';
import { listBoxClasses, ListBoxEmpty, Option } from '../../components/ListBox/ListBoxParts';
import { LiveRegion } from '../../components/LiveRegion/LiveRegion';
import { SearchField } from '../../components/SearchField/SearchField';
import { Spinner } from '../../components/Spinner/Spinner';

import { cn } from '../../utils/cn';
import type { HierarchyNode, HierarchyPath } from '../types';
import { visibleLabels, type Resolved, type ResolvedLevel } from './model';
import { useShellMessages } from '../messages';

/** Searches every leaf (bottom-level choice), returning full paths. */
export type SearchLeaves = (
  query: string,
  signal: AbortSignal,
) => Promise<readonly HierarchyPath[]>;

interface PanelProps {
  resolved: Resolved;
  /** A choice at one level. */
  onChoose: (depth: number, node: HierarchyNode) => void;
  /** A whole path, from Recent or the search. */
  onChoosePath: (path: HierarchyPath) => void;
  onRetry: (key: string) => void;
  recent?: readonly HierarchyPath[];
  searchLeaves?: SearchLeaves;
  /** One level at a time, search first (phones). */
  isCompact: boolean;
}

/** Filtering within a level once it has more choices than fit at a glance. */
const FILTER_THRESHOLD = 8;

function pathKey(path: HierarchyPath): string {
  return path.map((node) => node.id).join('/');
}

/** The scope picker's panel: search across all leaves, Recent, and the levels. */
export function HierarchyPanel({
  resolved,
  onChoose,
  onChoosePath,
  onRetry,
  recent = [],
  searchLeaves,
  isCompact,
}: PanelProps) {
  const messages = useShellMessages();
  const [query, setQuery] = useState('');
  const isSearching = searchLeaves !== undefined && query.trim() !== '';
  return (
    <div className="flex min-h-0 flex-col gap-3">
      {searchLeaves && (
        <SearchField
          aria-label={messages.searchAll}
          placeholder={messages.searchAll}
          onSearch={setQuery}
          className="shrink-0"
        />
      )}
      {isSearching ? (
        <SearchResults
          query={query.trim()}
          searchLeaves={searchLeaves}
          resolved={resolved}
          onChoosePath={onChoosePath}
        />
      ) : (
        <>
          {recent.length > 0 && (
            <PathList
              label={messages.recent}
              paths={recent}
              resolved={resolved}
              onChoosePath={onChoosePath}
              isRecent
            />
          )}
          {isCompact ? (
            <DrillDown resolved={resolved} onChoose={onChoose} onRetry={onRetry} />
          ) : (
            <div className="flex min-h-0 gap-2 overflow-x-auto">
              {resolved.levels
                .filter((level) => !level.isSkipped)
                .map((level) => (
                  <LevelColumn
                    key={`${String(level.depth)}:${level.key ?? ''}`}
                    level={level}
                    onChoose={onChoose}
                    onRetry={onRetry}
                    className="w-56 shrink-0"
                  />
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LevelColumn({
  level,
  onChoose,
  onRetry,
  className,
}: {
  level: ResolvedLevel;
  onChoose: (depth: number, node: HierarchyNode) => void;
  onRetry: (key: string) => void;
  className?: string;
}) {
  const messages = useShellMessages();
  const headingId = useId();
  const [filter, setFilter] = useState('');
  const label = level.level?.label;
  const options = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase();
    return needle === ''
      ? level.options
      : level.options.filter((option) => option.label.toLocaleLowerCase().includes(needle));
  }, [level.options, filter]);
  return (
    <div className={cn('flex min-h-0 flex-col gap-2', className)}>
      {label !== undefined && (
        <p id={headingId} className="px-1 text-xs font-semibold text-fg-muted">
          {label}
        </p>
      )}
      {level.options.length > FILTER_THRESHOLD && (
        <SearchField
          size="sm"
          aria-label={messages.searchLevel({ level: label ?? '' })}
          value={filter}
          onChange={setFilter}
        />
      )}
      {level.status === 'loading' ? (
        <div className="flex justify-center py-6">
          <Spinner label={messages.loading} />
        </div>
      ) : level.status === 'error' ? (
        <div className="flex flex-col items-center gap-2 py-4 text-sm text-fg-muted">
          {messages.loadError}
          <Button
            size="sm"
            variant="outline"
            onPress={() => {
              if (level.key !== undefined) {
                onRetry(level.key);
              }
            }}
          >
            {messages.retry}
          </Button>
        </div>
      ) : (
        <ListBox
          aria-labelledby={label !== undefined ? headingId : undefined}
          aria-label={label === undefined ? messages.chooseScope : undefined}
          items={options}
          selectionMode="single"
          selectedKeys={level.selected ? [level.selected.id] : []}
          onSelectionChange={(keys) => {
            const [key] = keys === 'all' ? [] : [...keys];
            const node = level.options.find((option) => option.id === key);
            if (node) {
              onChoose(level.depth, node);
            }
          }}
          renderEmptyState={() => <ListBoxEmpty>{messages.noResults}</ListBoxEmpty>}
          className={cn(listBoxClasses, 'max-h-80 rounded-control border border-border')}
        >
          {(option) => (
            // The description is part of the option's name (not a separate description), so everything the
            // option shows is in its name (WCAG 2.5.3).
            <Option id={option.id} textValue={option.label}>
              <span className="flex flex-col whitespace-normal">
                <span>{option.label}</span>
                {option.description !== undefined && (
                  <span className="text-xs text-fg-muted">{option.description}</span>
                )}
              </span>
            </Option>
          )}
        </ListBox>
      )}
    </div>
  );
}

/** Phones: one level at a time, with Back to the level above. */
function DrillDown({
  resolved,
  onChoose,
  onRetry,
}: {
  resolved: Resolved;
  onChoose: (depth: number, node: HierarchyNode) => void;
  onRetry: (key: string) => void;
}) {
  const messages = useShellMessages();
  const visible = resolved.levels.filter((level) => !level.isSkipped);
  // The level the user went back to, or else the first one still to choose (or the last).
  const [backTo, setBackTo] = useState<number | null>(null);
  const shown =
    visible.find((level) => level.depth === backTo) ??
    visible.find((level) => !level.selected) ??
    visible.at(-1);
  if (!shown) {
    return null;
  }
  const previous = visible.filter((level) => level.depth < shown.depth).at(-1);
  return (
    <div className="flex min-h-0 flex-col gap-2">
      {previous?.selected && (
        <Button
          variant="ghost"
          size="sm"
          icon={ChevronLeft}
          aria-label={messages.backTo({ label: previous.level?.label ?? previous.selected.label })}
          onPress={() => {
            setBackTo(previous.depth);
          }}
          className="self-start rtl:[&_svg]:rotate-180"
        >
          {previous.level?.label ?? previous.selected.label}
        </Button>
      )}
      <LevelColumn
        key={`${String(shown.depth)}:${shown.key ?? ''}`}
        level={shown}
        onChoose={(depth, node) => {
          setBackTo(null);
          onChoose(depth, node);
        }}
        onRetry={onRetry}
      />
    </div>
  );
}

function PathList({
  label,
  paths,
  resolved,
  onChoosePath,
  isRecent = false,
}: {
  label: string;
  paths: readonly HierarchyPath[];
  resolved: Resolved;
  onChoosePath: (path: HierarchyPath) => void;
  isRecent?: boolean;
}) {
  const messages = useShellMessages();
  const headingId = useId();
  const byKey = useMemo(() => new Map(paths.map((path) => [pathKey(path), path])), [paths]);
  const choose = (key: Key) => {
    const path = byKey.get(String(key));
    if (path) {
      onChoosePath(path);
    }
  };
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <p id={headingId} className="px-1 text-xs font-semibold text-fg-muted">
        {label}
      </p>
      <ListBox
        aria-labelledby={headingId}
        items={paths.map((path) => ({ id: pathKey(path), path }))}
        onAction={choose}
        renderEmptyState={() => <ListBoxEmpty>{messages.noResults}</ListBoxEmpty>}
        className={cn(listBoxClasses, 'max-h-64')}
      >
        {({ id, path }) => {
          const text = visibleLabels(path, resolved).join(messages.pathSeparator);
          return (
            <Option id={id} textValue={text} icon={isRecent ? Clock : undefined}>
              {text}
            </Option>
          );
        }}
      </ListBox>
    </div>
  );
}

function SearchResults({
  query,
  searchLeaves,
  resolved,
  onChoosePath,
}: {
  query: string;
  searchLeaves: SearchLeaves;
  resolved: Resolved;
  onChoosePath: (path: HierarchyPath) => void;
}) {
  const messages = useShellMessages();
  const [result, setResult] = useState<{
    query: string;
    paths: readonly HierarchyPath[];
    isError: boolean;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    searchLeaves(query, controller.signal).then(
      (paths) => {
        if (!controller.signal.aborted) {
          setResult({ query, paths, isError: false });
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setResult({ query, paths: [], isError: true });
        }
      },
    );
    return () => {
      controller.abort();
    };
  }, [query, searchLeaves]);
  const isLoading = result?.query !== query;
  const announcement = isLoading
    ? messages.loading
    : result.isError
      ? messages.loadError
      : messages.resultCount({ count: result.paths.length });
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <LiveRegion>{announcement}</LiveRegion>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner label={messages.loading} />
        </div>
      ) : result.isError ? (
        <ListBoxEmpty>{messages.loadError}</ListBoxEmpty>
      ) : (
        <PathList
          label={messages.resultCount({ count: result.paths.length })}
          paths={result.paths}
          resolved={resolved}
          onChoosePath={onChoosePath}
        />
      )}
    </div>
  );
}
