import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Folder, Image, Inbox, Star } from 'lucide-react';
import { useState } from 'react';
import { listPeople, teams } from '../../../test/listItems';
import { people } from '../../../test/people';
import { enableVirtualizer } from '../../../test/virtualizer';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { EmptyState } from '../EmptyState';
import { IconButton } from '../IconButton';
import { MenuItem, MenuSeparator } from '../Menu';
import { Text } from '../Text';
import { itemText } from '../../utils/text';
import { ListView, moveListItems, type ListViewItem } from './ListView';

const statuses = [
  { tone: 'success', label: 'Online' },
  { tone: 'neutral', label: 'Away' },
  { tone: 'warning', label: 'Busy' },
] as const;

/** The eight people, with their picture, role and a status badge. */
const crew: ListViewItem[] = people.map((person, index) => {
  const status = statuses[index % statuses.length] ?? statuses[0];
  return {
    id: person.name.toLowerCase().replace(/\W+/g, '-'),
    label: person.name,
    description: ['Astronomer', 'Engineer', 'Archivist', 'Analyst'][index % 4],
    avatar: { name: person.name, src: 'src' in person ? person.src : undefined },
    meta: (
      <Badge variant="soft" tone={status.tone} size="sm">
        {status.label}
      </Badge>
    ),
  };
});

const files: ListViewItem[] = [
  {
    id: 'notes',
    label: 'Night log, Oct 12',
    description: 'Edited 2 hours ago',
    icon: FileText,
    meta: '12 KB',
  },
  {
    id: 'images',
    label: 'Survey images',
    description: '1,204 files',
    icon: Folder,
    meta: '3.1 GB',
  },
  {
    id: 'nebula',
    label: 'nebula-ha.png',
    description: 'Edited yesterday',
    icon: Image,
    meta: '8.4 MB',
  },
  {
    id: 'budget',
    label: 'Budget 2027',
    description: 'Shared with Archive',
    icon: FileText,
    meta: '44 KB',
  },
];

const meta = {
  title: 'Display/ListView',
  component: ListView,
  args: { 'aria-label': 'People', items: crew },
  // Lets React Aria's virtualizer run under the story test runner (see test/virtualizer.ts).
  beforeEach: enableVirtualizer,
} satisfies Meta<typeof ListView>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Rich rows: a picture, a title and description, a status badge, and an actions menu at the end. */
export const RichRows: Story = {
  render: () => (
    <div className="max-w-xl">
      <ListView
        aria-label="People"
        items={crew}
        rowActions={() => (
          <>
            <MenuItem id="message">Message</MenuItem>
            <MenuItem id="profile">View profile</MenuItem>
            <MenuSeparator />
            <MenuItem id="remove" tone="danger">
              Remove
            </MenuItem>
          </>
        )}
      />
    </div>
  ),
};

/** Many rows chosen with checkboxes (Space toggles the focused row), controlled, with a bar of bulk actions. */
export const MultipleSelection: Story = {
  render: function MultipleSelectionStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set(['grace-hopper', 'vera-rubin']));
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <div className="flex min-h-hit items-center justify-between gap-2">
          <Text variant="small">{selected.size} selected</Text>
          <Button
            variant="outline"
            size="sm"
            isDisabled={selected.size === 0}
            onPress={() => {
              setSelected(new Set());
            }}
          >
            Clear
          </Button>
        </div>
        <ListView
          aria-label="People"
          items={crew}
          selectionMode="multiple"
          selectedKeys={selected}
          onSelectionChange={setSelected}
        />
      </div>
    );
  },
};

/** One row at a time: choosing another row replaces the choice. */
export const SingleSelection: Story = {
  tags: ['!visual'],
  render: function SingleSelectionStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set(['nebula']));
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <ListView
          aria-label="Files"
          items={files}
          selectionMode="single"
          selectedKeys={selected}
          onSelectionChange={setSelected}
        />
        <Text variant="small">Chosen: {[...selected].join(', ') || 'nothing'}</Text>
      </div>
    );
  },
};

/** Rows that open something: press a row (or Enter) to activate it; the star is its own button. */
export const RowActions: Story = {
  tags: ['!visual'],
  render: function RowActionsStory() {
    const [opened, setOpened] = useState('nothing yet');
    const [starred, setStarred] = useState<Set<string>>(new Set(['images']));
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <ListView
          aria-label="Files"
          items={files}
          onAction={(id) => {
            setOpened(id);
          }}
          renderActions={(item) => (
            <IconButton
              icon={Star}
              size="sm"
              variant="ghost"
              tone={starred.has(item.id) ? 'warning' : 'neutral'}
              aria-label={`Star ${itemText(item)}`}
              isSelected={starred.has(item.id)}
              onChange={(isSelected) => {
                setStarred((current) => {
                  const next = new Set(current);
                  if (isSelected) {
                    next.add(item.id);
                  } else {
                    next.delete(item.id);
                  }
                  return next;
                });
              }}
            />
          )}
        />
        <Text variant="small">Opened: {opened}</Text>
      </div>
    );
  },
};

const team = listPeople(80);
const sections = teams.map((name) => ({
  id: name,
  title: name,
  items: team
    .filter((person) => person.team === name)
    .map((person) => ({ ...person, avatar: { name: person.label, src: person.src } })),
}));

/** Rows grouped by team. Each heading sticks to the top while its rows scroll past. */
export const Grouped: Story = {
  render: () => (
    <div className="max-w-xl">
      <ListView aria-label="People by team" sections={sections} maxHeight="24rem" />
    </div>
  ),
};

const thousands = listPeople(10_000);
const thousandsBySection = teams.map((name) => ({
  id: name,
  title: name,
  items: thousands.filter((person) => person.team === name),
}));

/** 10,000 rows, grouped, choosable: only the rows in view are drawn. */
export const Virtualized: Story = {
  tags: ['!visual'],
  render: function VirtualizedStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    return (
      <div className="flex max-w-xl flex-col gap-3">
        <Text variant="small">
          {thousands.length.toLocaleString()} people, {selected.size.toLocaleString()} selected
        </Text>
        <ListView
          aria-label="Everyone"
          sections={thousandsBySection}
          selectionMode="multiple"
          selectedKeys={selected}
          onSelectionChange={setSelected}
          isVirtualized
          maxHeight="28rem"
          density="compact"
        />
      </div>
    );
  },
};

/** Pages of rows load as the end scrolls into view, with a spinner row meanwhile. */
export const LoadMore: Story = {
  tags: ['!visual'],
  render: function LoadMoreStory() {
    const [count, setCount] = useState(30);
    const [isLoadingMore, setLoadingMore] = useState(false);
    return (
      <div className="max-w-xl">
        <ListView
          aria-label="People"
          items={listPeople(count)}
          isVirtualized
          maxHeight="24rem"
          hasMore={count < 300}
          isLoadingMore={isLoadingMore}
          onLoadMore={() => {
            setLoadingMore(true);
            setTimeout(() => {
              setCount((current) => current + 30);
              setLoadingMore(false);
            }, 800);
          }}
        />
      </div>
    );
  },
};

/** `shouldLoadOnScroll={false}`: a "Load more" button asks for the next page instead. */
export const LoadMoreButton: Story = {
  render: () => (
    <div className="max-w-xl">
      <ListView
        aria-label="People"
        items={listPeople(5)}
        hasMore
        shouldLoadOnScroll={false}
        onLoadMore={() => undefined}
      />
    </div>
  ),
};

/** Drag a row by its handle (or focus the handle and press Enter, then the arrows) to reorder; the app applies it. */
export const Reorderable: Story = {
  render: function ReorderableStory() {
    const [items, setItems] = useState(files);
    return (
      <div className="max-w-xl">
        <ListView
          aria-label="Files"
          items={items}
          isReorderable
          onMove={(move) => {
            setItems((current) => moveListItems(current, move));
          }}
        />
      </div>
    );
  },
};

/** Compact rows for dense data. */
export const Compact: Story = {
  render: () => (
    <div className="max-w-xl">
      <ListView aria-label="Files" items={files} density="compact" selectionMode="multiple" />
    </div>
  ),
};

/** The first load shows placeholder rows; with nothing to show, the default empty state or the app's own. */
export const LoadingAndEmpty: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-3">
      <ListView aria-label="Loading" items={[]} isLoading />
      <ListView aria-label="No people" items={[]} />
      <ListView
        aria-label="Inbox"
        items={[]}
        emptyState={<EmptyState icon={Inbox} title="Inbox zero" hint="Nothing needs you." />}
      />
    </div>
  ),
};
