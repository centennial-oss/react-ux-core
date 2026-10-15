import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from './Separator';

describe('Separator', () => {
  it('has separator semantics in both orientations', () => {
    render(
      <>
        <Separator />
        <Separator orientation="vertical" />
      </>,
    );
    const [, vertical] = screen.getAllByRole('separator');
    expect(vertical).toHaveAttribute('aria-orientation', 'vertical');
  });
});
