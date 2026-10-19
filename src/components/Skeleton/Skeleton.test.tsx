import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders the requested number of text lines, hidden from assistive technology', () => {
    const { container } = render(<Skeleton lineCount={3} />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root?.children).toHaveLength(3);
  });

  it('sizes circles and rectangles from props', () => {
    const { container } = render(
      <>
        <Skeleton shape="circle" width={48} />
        <Skeleton shape="rect" width="10rem" height={80} />
      </>,
    );
    const [circle, rect] = [...container.children] as HTMLElement[];
    expect(circle?.style.width).toBe('48px');
    expect(circle?.style.height).toBe('48px');
    expect(rect?.style.width).toBe('10rem');
    expect(rect?.style.height).toBe('80px');
  });

  it('shapes placeholders from its children while loading, then shows them', () => {
    const { rerender } = render(
      <Skeleton isLoading>
        <p>Real content</p>
      </Skeleton>,
    );
    const wrapper = screen.getByText('Real content').parentElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(wrapper).toHaveAttribute('inert');

    rerender(
      <Skeleton isLoading={false}>
        <p>Real content</p>
      </Skeleton>,
    );
    expect(screen.getByText('Real content').parentElement).not.toHaveAttribute('aria-hidden');
  });
});
