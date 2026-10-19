import { render, screen } from '@testing-library/react';
import { Profiler, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { mergeRefs } from './mergeRefs';
import { useElementSize } from './useElementSize';
import { useElementWidth } from './useElementWidth';
import { useIsClamped } from './useIsClamped';
import { useIsOverflowing } from './useIsOverflowing';

function SizeProbe({ width, padding = 0 }: { width: number; padding?: number }) {
  const [ref, size] = useElementSize();
  const [borderRef, borderSize] = useElementSize({ box: 'border' });
  const [widthRef, onlyWidth] = useElementWidth();
  return (
    <>
      <div ref={ref} style={{ width, height: 20, padding, boxSizing: 'content-box' }} />
      <div ref={borderRef} style={{ width, height: 20, padding, boxSizing: 'content-box' }} />
      <div ref={widthRef} style={{ width, height: 20 }} />
      <output data-testid="size">
        {size ? `${String(size.width)}x${String(size.height)}` : 'none'}
      </output>
      <output data-testid="border">
        {borderSize ? `${String(borderSize.width)}x${String(borderSize.height)}` : 'none'}
      </output>
      <output data-testid="width">{onlyWidth ?? 'none'}</output>
    </>
  );
}

describe('useElementSize and useElementWidth', () => {
  it('measure the element and follow its resizes', async () => {
    const { rerender } = render(<SizeProbe width={120} />);
    await expect.poll(() => screen.getByTestId('size').textContent).toBe('120x20');
    expect(screen.getByTestId('width').textContent).toBe('120');
    rerender(<SizeProbe width={200} />);
    await expect.poll(() => screen.getByTestId('size').textContent).toBe('200x20');
    await expect.poll(() => screen.getByTestId('width').textContent).toBe('200');
  });

  it('report the content box by default and the border box on request', async () => {
    const { rerender } = render(<SizeProbe width={100} />);
    rerender(<SizeProbe width={100} padding={10} />);
    await expect.poll(() => screen.getByTestId('size').textContent).toBe('100x20');
    await expect.poll(() => screen.getByTestId('border').textContent).toBe('120x40');
  });
});

/** A bordered element whose width ref is merged inline, so React re-attaches it on every render. */
function MergedWidthProbe() {
  const own = useRef<HTMLDivElement>(null);
  const [widthRef, width] = useElementWidth();
  return (
    <>
      <div
        ref={mergeRefs(own, widthRef)}
        style={{ width: 120, height: 20, border: '1px solid', boxSizing: 'content-box' }}
      />
      <output data-testid="merged">{width ?? 'none'}</output>
    </>
  );
}

describe('useResizeMeasure', () => {
  it('settles when its ref is merged inline and re-attached every render', async () => {
    // The first reading (border box) and the observer's (content box) differ; re-measuring on every re-attach used to
    // flip between them every frame, forever.
    let commits = 0;
    render(
      <Profiler
        id="merged"
        onRender={() => {
          commits += 1;
        }}
      >
        <MergedWidthProbe />
      </Profiler>,
    );
    await expect.poll(() => screen.getByTestId('merged').textContent).toBe('120');
    const settled = commits;
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    expect(commits).toBe(settled);
  });
});

function OverflowProbe({ text, width }: { text: string; width: number }) {
  const [xRef, isOverflowingX] = useIsOverflowing({ axis: 'x', shouldObserveContent: true });
  const [clampRef, isClamped] = useIsClamped();
  return (
    <>
      <div ref={xRef} style={{ width, overflow: 'auto', whiteSpace: 'nowrap' }}>
        <span>{text}</span>
      </div>
      <div
        ref={clampRef}
        style={{ width, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
      >
        {text}
      </div>
      <output data-testid="x">{String(isOverflowingX)}</output>
      <output data-testid="clamped">{String(isClamped)}</output>
    </>
  );
}

describe('useIsOverflowing and useIsClamped', () => {
  it('follow the content as it grows and shrinks', async () => {
    const { rerender } = render(<OverflowProbe text="Short" width={300} />);
    await expect.poll(() => screen.getByTestId('x').textContent).toBe('false');
    expect(screen.getByTestId('clamped').textContent).toBe('false');
    rerender(<OverflowProbe text={'A much longer line of text '.repeat(10)} width={300} />);
    await expect.poll(() => screen.getByTestId('x').textContent).toBe('true');
    rerender(<OverflowProbe text={'A much longer line of text '.repeat(10)} width={120} />);
    await expect.poll(() => screen.getByTestId('clamped').textContent).toBe('true');
  });
});
