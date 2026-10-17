import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Pagination } from './Pagination';

// Pagination's props are a union by `mode`, so the stories render it themselves rather than through args.
const meta: Meta = { title: 'Actions/Pagination', component: Pagination };
export default meta;
type Story = StoryObj;

/** Offset paging: the range shown, previous and next, and page numbers that collapse with an ellipsis. */
export const Offset: Story = {
  render: function OffsetStory() {
    const [pageIndex, setPageIndex] = useState(5);
    const [pageSize, setPageSize] = useState(25);
    return (
      <Pagination
        mode="offset"
        pageIndex={pageIndex}
        pageSize={pageSize}
        total={1203}
        onPageChange={setPageIndex}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
      />
    );
  },
};

/** Near either end, the first or last five pages show together. Several on one page each need their own label. */
export const Ends: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Pagination
        aria-label="Stars"
        mode="offset"
        pageIndex={0}
        pageSize={10}
        total={240}
        onPageChange={() => undefined}
      />
      <Pagination
        aria-label="Moons"
        mode="offset"
        pageIndex={23}
        pageSize={10}
        total={240}
        onPageChange={() => undefined}
      />
      <Pagination
        aria-label="Observatories"
        mode="offset"
        pageIndex={1}
        pageSize={10}
        total={42}
        onPageChange={() => undefined}
      />
    </div>
  ),
};

/** Cursor paging: only previous and next, with an approximate total when the server has one. */
export const Cursor: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Pagination
        aria-label="Readings"
        mode="cursor"
        hasPrevious={false}
        hasNext
        onPrevious={() => undefined}
        onNext={() => undefined}
        approximateTotal={1200}
      />
      <Pagination
        aria-label="Search results"
        mode="cursor"
        hasPrevious
        hasNext
        onPrevious={() => undefined}
        onNext={() => undefined}
        pageItemCount={25}
      />
    </div>
  ),
};

/** Compact (the default on phones): no page numbers or page-size choice. */
export const Compact: Story = {
  render: () => (
    <Pagination
      mode="offset"
      pageIndex={5}
      pageSize={25}
      total={1203}
      onPageChange={() => undefined}
      pageSizeOptions={[25, 50]}
      onPageSizeChange={() => undefined}
      isCompact
    />
  ),
};

/** Every control disabled, for example while a page loads. */
export const Disabled: Story = {
  render: () => (
    <Pagination
      mode="offset"
      pageIndex={2}
      pageSize={25}
      total={300}
      onPageChange={() => undefined}
      isDisabled
    />
  ),
};
