// Manage dashboards (§13): a Tree of the collection's dashboards and their pages, with the selected item's actions
// beside it (stacked on phones, MGMT-09). Every change is staged; Apply sends one change set and Cancel drops it
// (MGMT-04). Locked items show a lock and offer only reordering (MGMT-07); actions the user can't take aren't shown.

import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useLocale } from 'react-aria-components';
import { Badge } from '../../components/Badge/Badge';
import { Banner } from '../../components/Banner/Banner';
import { Button } from '../../components/Button/Button';
import { ButtonGroup } from '../../components/ButtonGroup/ButtonGroup';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { Dialog } from '../../components/Dialog/Dialog';
import { InlineEdit } from '../../components/InlineEdit/InlineEdit';
import { LiveRegion, useAnnouncer } from '../../components/LiveRegion/LiveRegion';
import { MenuItem } from '../../components/Menu/Menu';
import { MenuButton } from '../../components/Menu/MenuButtons';
import type { TreeMove } from '../../components/Tree/move';
import { Tree } from '../../components/Tree/Tree';
import type { TreeNode } from '../../components/Tree/types';
import { errorMessageOf } from '../../utils/errors';
import { orderedDashboards } from '../Dashboard/selection';
import { TemplatePicker } from '../Dashboard/WidgetPicker';
import {
  createDashboard,
  createPage,
  duplicateDashboard,
  duplicatePage,
} from '../document/document';
import { effectivePermissions } from '../document/permissions';
import { instantiatePage, type InstantiateTemplate } from '../document/templates';
import { uniqueTitle } from '../document/titles';
import { readText, useDashboardMessages } from '../messages';
import type {
  CollectionChangeResult,
  CollectionChangeSet,
  DashboardCollection,
  DashboardDocument,
  DashboardPermissions,
  PageTemplate,
  PermissionTarget,
} from '../types';
import {
  applyTreeMove,
  changeSetOf,
  dashboardKey,
  findNode,
  hasChanges,
  insertDashboard,
  insertPage,
  keyOf,
  moveNodeBy,
  movePageTo,
  pageKey,
  rebaseAfterApply,
  removeNode,
  renameNode,
  withOrder,
  type ManageNode,
} from './manage';

export interface ManageDashboardsDialogProps {
  /** The collection to manage. */
  collection: DashboardCollection;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Stores the staged changes (MGMT-04). Resolve with the dashboards that failed, if any (MGMT-06). */
  onApplyCollectionChanges: (changes: CollectionChangeSet) => Promise<CollectionChangeResult>;
  /** Called after Apply with the collection's dashboards as now stored (every change, or those that didn't fail). */
  onApplied?: (dashboards: DashboardDocument[]) => void;
  /** Narrows the permissions the collection grants (PERM-01). */
  getPermissions?: (target: PermissionTarget) => Partial<DashboardPermissions>;
  /** Offered for new dashboards and pages (NAV-13). */
  templates?: readonly PageTemplate[];
  instantiateTemplate?: InstantiateTemplate;
  /** Passed to `instantiateTemplate`. */
  runtimeContext?: unknown;
  /** The shared-content notice, restated here (PERM-03). */
  editNotice?: ReactNode;
}

interface ManageSession {
  /** The dashboards as stored, ordered. */
  baseline: DashboardDocument[];
  /** The dashboards as staged, in order. */
  staged: DashboardDocument[];
  selectedKey: string | null;
  expanded: Set<string>;
  /** Errors by dashboard id after a partly failed apply; `''` for a rejected apply. */
  failures: ReadonlyMap<string, unknown>;
}

function startManage(collection: DashboardCollection, locale: string): ManageSession {
  const baseline = orderedDashboards(collection, locale);
  return {
    baseline,
    staged: baseline,
    selectedKey: null,
    expanded: new Set(baseline.map((item) => dashboardKey(item.id))),
    failures: new Map(),
  };
}

const noDashboards: DashboardDocument[] = [];
const noFailures: ReadonlyMap<string, unknown> = new Map();

type TemplateTarget = { kind: 'dashboard' } | { kind: 'page'; dashboardId: string };

/** The Manage dashboards dialog (§13), for the active collection. */
export function ManageDashboardsDialog({
  collection,
  isOpen,
  onOpenChange,
  onApplyCollectionChanges,
  onApplied,
  getPermissions,
  templates = [],
  instantiateTemplate,
  runtimeContext,
  editNotice,
}: ManageDashboardsDialogProps) {
  const messages = useDashboardMessages();
  const { locale } = useLocale();
  const { ref: announcerRef, announce } = useAnnouncer();
  const [session, setSession] = useState<ManageSession | null>(null);
  if (isOpen && !session) {
    setSession(startManage(collection, locale));
  } else if (!isOpen && session) {
    setSession(null);
  }
  const [isApplying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState<ManageNode | null>(null);
  const [templateTarget, setTemplateTarget] = useState<TemplateTarget | null>(null);

  const staged = session?.staged ?? noDashboards;
  const changes = useMemo(
    () => (session ? changeSetOf(collection.id, session.baseline, session.staged, locale) : null),
    [collection.id, session, locale],
  );
  const permissionsOf = (target: PermissionTarget) => effectivePermissions(target, getPermissions);
  const collectionPermissions = permissionsOf({ kind: 'collection', collection });
  const dashboardPermissions = (dashboard: DashboardDocument) =>
    permissionsOf({ kind: 'dashboard', collection, dashboard });
  const pagePermissions = (node: Extract<ManageNode, { kind: 'page' }>) =>
    permissionsOf({ kind: 'page', collection, dashboard: node.dashboard, page: node.page });
  /** Pages leave a dashboard only when neither is locked, and join one that takes new pages (MGMT-07). */
  const canMoveOut = (node: Extract<ManageNode, { kind: 'page' }>) =>
    pagePermissions(node).canEdit && pagePermissions(node).canReorder;
  const canTakePages = (dashboardId: string) => {
    const target = staged.find((item) => item.id === dashboardId);
    return target !== undefined && dashboardPermissions(target).canAddPage;
  };

  const update = (change: (current: ManageSession) => ManageSession) => {
    setSession((current) => (current ? change(current) : current));
  };
  const stage = (dashboards: DashboardDocument[], selectedKey?: string | null) => {
    update((current) => ({
      ...current,
      staged: dashboards,
      selectedKey: selectedKey === undefined ? current.selectedKey : selectedKey,
    }));
  };
  const selected = session?.selectedKey ? findNode(staged, session.selectedKey) : undefined;

  const titles = (node: ManageNode) =>
    node.kind === 'dashboard'
      ? staged.filter((item) => item.id !== node.dashboard.id).map((item) => item.title)
      : node.dashboard.pages.filter((page) => page.id !== node.page.id).map((page) => page.title);
  const validateTitle = (node: ManageNode) => (value: string) => {
    const title = value.trim();
    if (title === '') {
      return messages.titleRequired;
    }
    const taken = new Set(titles(node).map((item) => item.trim().toLocaleLowerCase()));
    return taken.has(title.toLocaleLowerCase()) ? messages.titleTaken : null;
  };

  const numbered = messages.titleNumbered;
  const addDashboard = (document?: DashboardDocument) => {
    const created =
      document ??
      createDashboard({
        title: uniqueTitle(
          messages.newDashboard,
          staged.map((item) => item.title),
          numbered,
        ),
        pageTitle: messages.newPage,
      });
    update((current) => ({
      ...current,
      staged: insertDashboard(current.staged, created),
      selectedKey: dashboardKey(created.id),
      expanded: new Set([...current.expanded, dashboardKey(created.id)]),
    }));
  };
  const addPage = (dashboardId: string, page = createPage({ title: messages.newPage })) => {
    const dashboard = staged.find((item) => item.id === dashboardId);
    if (!dashboard) {
      return;
    }
    const title = uniqueTitle(
      page.title,
      dashboard.pages.map((item) => item.title),
      numbered,
    );
    const created = { ...page, title };
    update((current) => ({
      ...current,
      staged: insertPage(current.staged, dashboardId, created),
      selectedKey: pageKey(dashboardId, created.id),
      expanded: new Set([...current.expanded, dashboardKey(dashboardId)]),
    }));
  };
  const duplicate = (node: ManageNode) => {
    if (node.kind === 'dashboard') {
      const title = uniqueTitle(
        messages.titleCopy({ title: node.dashboard.title }),
        staged.map((item) => item.title),
        numbered,
      );
      const copy = duplicateDashboard(node.dashboard, title);
      update((current) => ({
        ...current,
        staged: insertDashboard(current.staged, copy, node.dashboard.id),
        selectedKey: dashboardKey(copy.id),
        expanded: new Set([...current.expanded, dashboardKey(copy.id)]),
      }));
      return;
    }
    const title = uniqueTitle(
      messages.titleCopy({ title: node.page.title }),
      node.dashboard.pages.map((page) => page.title),
      numbered,
    );
    const copy = duplicatePage(node.page, title);
    stage(
      insertPage(staged, node.dashboard.id, copy, node.page.id),
      pageKey(node.dashboard.id, copy.id),
    );
  };
  const moveBy = (node: ManageNode, delta: -1 | 1) => {
    const next = moveNodeBy(staged, node, delta);
    if (!next) {
      return;
    }
    stage(next);
    const title = node.kind === 'dashboard' ? node.dashboard.title : node.page.title;
    const total = node.kind === 'dashboard' ? staged.length : node.dashboard.pages.length;
    announce(
      messages.itemMovedTo({
        item: title,
        position: node.index + delta + 1,
        total,
      }),
    );
  };
  const moveTo = (node: Extract<ManageNode, { kind: 'page' }>, dashboardId: string) => {
    const next = movePageTo(staged, node, dashboardId);
    const target = next?.find((item) => item.id === dashboardId);
    const moved = target?.pages.at(-1);
    if (!next || !target || !moved) {
      return;
    }
    stage(next, pageKey(dashboardId, moved.id));
    announce(messages.pageMovedTo({ title: node.page.title, dashboard: target.title }));
  };
  // Drag and drop in the tree (MGMT-02), with the same permissions as the buttons.
  const onMove = (move: TreeMove) => {
    const nodes = move.ids.map((id) => findNode(staged, id));
    const isAllowed = nodes.every((node) => {
      if (!node) {
        return false;
      }
      if (node.kind === 'dashboard') {
        return dashboardPermissions(node.dashboard).canReorder;
      }
      return move.parentId === dashboardKey(node.dashboard.id)
        ? pagePermissions(node).canReorder
        : canMoveOut(node);
    });
    const next = isAllowed ? applyTreeMove(staged, move, (_from, to) => canTakePages(to)) : null;
    if (next) {
      const [first] = nodes;
      const parent = move.parentId === null ? undefined : findNode(next, move.parentId);
      const key =
        first?.kind === 'page' && parent?.kind === 'dashboard'
          ? pageKey(parent.dashboard.id, parent.dashboard.pages[move.index]?.id ?? first.page.id)
          : session?.selectedKey;
      stage(next, key);
    } else if (move.ids.length > 0) {
      announce(messages.moveNotAllowed);
    }
  };

  const applyTemplate = async (template: PageTemplate) => {
    const target = templateTarget;
    setTemplateTarget(null);
    if (!target) {
      return;
    }
    try {
      const name = readText(template.name, messages);
      const page = await instantiatePage(template, name, {
        instantiate: instantiateTemplate,
        context: runtimeContext,
      });
      if (target.kind === 'page') {
        addPage(target.dashboardId, page);
      } else {
        addDashboard(
          createDashboard({
            title: uniqueTitle(
              name,
              staged.map((item) => item.title),
              numbered,
            ),
            pages: [page],
          }),
        );
      }
    } catch (error) {
      update((current) => ({ ...current, failures: new Map([['', error]]) }));
      announce(messages.templateFailed);
    }
  };

  const apply = async () => {
    if (!session || !changes) {
      return;
    }
    if (!hasChanges(changes)) {
      onOpenChange(false);
      return;
    }
    setApplying(true);
    try {
      const result = await onApplyCollectionChanges(changes);
      const failed = result?.failed ?? [];
      const stored = withOrder(session.staged, locale);
      if (failed.length === 0) {
        onApplied?.(stored);
        onOpenChange(false);
        return;
      }
      // Partly applied: what went through is stored; the rest stays staged to retry or cancel (MGMT-06).
      const baseline = rebaseAfterApply(
        session.baseline,
        changes,
        new Set(failed.map((item) => item.id)),
      );
      onApplied?.(baseline);
      update((current) => ({
        ...current,
        baseline,
        staged: stored,
        failures: new Map(failed.map((item) => [item.id, item.error])),
      }));
      announce(messages.applyFailed({ count: failed.length }));
    } catch (error) {
      update((current) => ({ ...current, failures: new Map([['', error]]) }));
      announce(messages.genericError);
    } finally {
      setApplying(false);
    }
  };

  const failures = session?.failures ?? noFailures;
  const items = useMemo(
    (): TreeNode[] =>
      staged.map((dashboard) => ({
        id: dashboardKey(dashboard.id),
        label: dashboard.title,
        icon: LayoutDashboard,
        badge: (
          <ItemBadges
            isLocked={dashboard.isLocked === true}
            isFailed={failures.has(dashboard.id)}
            lockedText={messages.locked}
            failedText={messages.notApplied}
          />
        ),
        children: dashboard.pages.map((page) => ({
          id: pageKey(dashboard.id, page.id),
          label: page.title,
          icon: FileText,
          badge: (
            <ItemBadges
              isLocked={page.isLocked === true}
              isFailed={false}
              lockedText={messages.locked}
              failedText={messages.notApplied}
            />
          ),
        })),
      })),
    [staged, failures, messages],
  );

  const actions = (() => {
    if (!selected) {
      return <p className="text-sm text-fg-muted">{messages.manageNoSelection}</p>;
    }
    const isDashboard = selected.kind === 'dashboard';
    const title = isDashboard ? selected.dashboard.title : selected.page.title;
    const own = isDashboard ? dashboardPermissions(selected.dashboard) : pagePermissions(selected);
    const parent = dashboardPermissions(selected.dashboard);
    const siblings = isDashboard ? staged.length : selected.dashboard.pages.length;
    const canDuplicate = isDashboard ? collectionPermissions.canAddDashboard : parent.canAddPage;
    const canDelete = isDashboard ? own.canDeleteDashboard : own.canDeletePage;
    const moveTargets =
      !isDashboard && canMoveOut(selected)
        ? staged.filter(
            (item) => item.id !== selected.dashboard.id && dashboardPermissions(item).canAddPage,
          )
        : [];
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">
          {isDashboard ? messages.dashboardNode({ title }) : messages.pageNode({ title })}
        </h3>
        {own.canEdit ? (
          <InlineEdit
            key={keyOf(selected)}
            label={messages.itemTitle}
            value={title}
            size="sm"
            maxLength={200}
            validate={validateTitle(selected)}
            onSave={(value) => {
              stage(renameNode(staged, selected, value.trim()));
            }}
          />
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-fg-muted">
            <Lock aria-hidden className="size-4" />
            {messages.locked}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {own.canReorder && siblings > 1 && (
            <>
              <Button
                size="sm"
                variant="outline"
                icon={ArrowUp}
                isDisabled={selected.index === 0}
                onPress={() => {
                  moveBy(selected, -1);
                }}
              >
                {messages.moveUp({ item: title })}
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={ArrowDown}
                isDisabled={selected.index === siblings - 1}
                onPress={() => {
                  moveBy(selected, 1);
                }}
              >
                {messages.moveDown({ item: title })}
              </Button>
            </>
          )}
          {moveTargets.length > 0 && !isDashboard && (
            <MenuButton
              label={messages.moveTo}
              size="sm"
              onAction={(key) => {
                moveTo(selected, String(key));
              }}
            >
              {moveTargets.map((item) => (
                <MenuItem key={item.id} id={item.id}>
                  {item.title}
                </MenuItem>
              ))}
            </MenuButton>
          )}
          {isDashboard && own.canAddPage && (
            <Button
              size="sm"
              variant="outline"
              icon={Plus}
              onPress={() => {
                addPage(selected.dashboard.id);
              }}
            >
              {messages.addPageAction}
            </Button>
          )}
          {isDashboard && own.canAddPage && templates.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              icon={LayoutTemplate}
              onPress={() => {
                setTemplateTarget({ kind: 'page', dashboardId: selected.dashboard.id });
              }}
            >
              {messages.addPageFromTemplate}
            </Button>
          )}
          {canDuplicate && (
            <Button
              size="sm"
              variant="outline"
              icon={Copy}
              onPress={() => {
                duplicate(selected);
              }}
            >
              {messages.duplicate}
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="outline"
              tone="danger"
              icon={Trash2}
              onPress={() => {
                setDeleting(selected);
              }}
            >
              {messages.delete}
            </Button>
          )}
        </div>
      </div>
    );
  })();

  const failureList = [...failures.entries()];
  // A failed dashboard may be one staged for deletion: it's still in the baseline.
  const titleOf = (id: string) =>
    (staged.find((item) => item.id === id) ?? session?.baseline.find((item) => item.id === id))
      ?.title ?? id;
  return (
    <>
      <Dialog
        title={messages.manageDashboards}
        description={messages.manageDescription({ collection: collection.name })}
        size="lg"
        isOpen={isOpen}
        isBusy={isApplying}
        onOpenChange={onOpenChange}
        footer={(close) => (
          <ButtonGroup>
            <Button variant="outline" onPress={close}>
              {messages.cancel}
            </Button>
            <Button
              variant="solid"
              tone="accent"
              isPending={isApplying}
              isDisabled={changes === null || !hasChanges(changes)}
              onPress={() => {
                void apply();
              }}
            >
              {messages.apply}
            </Button>
          </ButtonGroup>
        )}
      >
        {session && (
          <div className="flex flex-col gap-3 pb-2">
            {editNotice !== undefined && editNotice !== null && editNotice !== '' && (
              <Banner tone="warning">{editNotice}</Banner>
            )}
            {failureList.length > 0 && (
              <Banner
                tone="danger"
                title={
                  failures.has('')
                    ? messages.genericError
                    : messages.applyFailed({ count: failureList.length })
                }
              >
                <ul className="list-none">
                  {failureList.map(([id, error]) => (
                    <li key={id}>
                      {id === ''
                        ? errorMessageOf(error, messages.genericError)
                        : `${titleOf(id)}: ${errorMessageOf(error, messages.genericError)}`}
                    </li>
                  ))}
                </ul>
              </Banner>
            )}
            {collectionPermissions.canAddDashboard && (
              <div role="group" aria-label={messages.collectionActions} className="flex gap-2">
                <Button
                  size="sm"
                  variant="soft"
                  tone="accent"
                  icon={Plus}
                  onPress={() => {
                    addDashboard();
                  }}
                >
                  {messages.newDashboardAction}
                </Button>
                {templates.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={LayoutTemplate}
                    onPress={() => {
                      setTemplateTarget({ kind: 'dashboard' });
                    }}
                  >
                    {messages.addDashboardFromTemplate}
                  </Button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Tree
                aria-label={messages.manageTree}
                items={items}
                selectedId={session.selectedKey}
                onSelectionChange={(id) => {
                  update((current) => ({ ...current, selectedKey: id }));
                }}
                expandedIds={session.expanded}
                onExpandedChange={(ids) => {
                  update((current) => ({ ...current, expanded: ids }));
                }}
                isReorderable={collectionPermissions.canReorder}
                onMove={onMove}
                canDropInside={(node) => node.id.startsWith('d')}
                className="max-h-96 min-h-48 overflow-auto rounded-md border border-border p-1"
              />
              <div>{actions}</div>
            </div>
          </div>
        )}
        <LiveRegion ref={announcerRef} />
      </Dialog>
      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        title={
          deleting?.kind === 'dashboard'
            ? messages.deleteDashboardTitle({ title: deleting.dashboard.title })
            : messages.deletePageTitle({ title: deleting?.page.title ?? '' })
        }
        body={
          deleting?.kind === 'dashboard'
            ? messages.deleteDashboardBody({ count: deleting.dashboard.pages.length })
            : messages.deletePageBody
        }
        tone="danger"
        confirmLabel={messages.delete}
        onConfirm={() => {
          if (deleting) {
            const parentKey = deleting.kind === 'page' ? dashboardKey(deleting.dashboard.id) : null;
            stage(removeNode(staged, deleting), parentKey);
          }
          setDeleting(null);
        }}
      />
      <TemplatePicker
        templates={templates}
        purpose={templateTarget?.kind ?? 'page'}
        isOpen={templateTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateTarget(null);
          }
        }}
        onSelect={(template) => {
          void applyTemplate(template);
        }}
      />
    </>
  );
}

/** A tree row's lock and "not applied" marks, in text as well as icons (A11Y-08). */
function ItemBadges({
  isLocked,
  isFailed,
  lockedText,
  failedText,
}: {
  isLocked: boolean;
  isFailed: boolean;
  lockedText: string;
  failedText: string;
}) {
  if (!isLocked && !isFailed) {
    return null;
  }
  return (
    <span className="flex gap-1">
      {isLocked && (
        <Badge icon={Lock} size="sm">
          {lockedText}
        </Badge>
      )}
      {isFailed && (
        <Badge tone="danger" size="sm">
          {failedText}
        </Badge>
      )}
    </span>
  );
}
