import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFieldIds } from './PlainField';
import { PlainFieldFrame } from './PlainFieldFrame';

function Native({ isInvalid = false }: { isInvalid?: boolean }) {
  const ids = useFieldIds();
  return (
    <PlainFieldFrame
      ids={ids}
      htmlFor="native"
      label="Volume"
      description="Out of ten"
      errorMessage="Too loud"
      isInvalid={isInvalid}
      isRequired
    >
      <input
        id="native"
        type="range"
        aria-describedby={`${ids.descriptionId} ${ids.errorId}`}
        aria-invalid={isInvalid || undefined}
      />
    </PlainFieldFrame>
  );
}

function Group() {
  const ids = useFieldIds();
  return (
    <div role="group" aria-labelledby={ids.labelId}>
      <PlainFieldFrame ids={ids} label="Colours" infoTip="Pick any">
        <span>Swatches</span>
      </PlainFieldFrame>
    </div>
  );
}

describe('PlainFieldFrame', () => {
  it('labels a native input and gives the description and error their ids', () => {
    const { rerender } = render(<Native />);
    const input = screen.getByRole('slider', { name: 'Volume' });
    expect(input).toHaveAccessibleDescription('Out of ten');
    expect(screen.queryByText('Too loud')).toBeNull();
    // The required mark, as on React Aria fields.
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Native isInvalid />);
    expect(input).toHaveAccessibleDescription('Out of ten Too loud');
  });

  it('renders the label as a span naming another element, beside an info tip', () => {
    render(<Group />);
    const group = screen.getByRole('group', { name: 'Colours' });
    expect(screen.getByText('Colours').tagName).toBe('SPAN');
    expect(group).toContainElement(screen.getByRole('button', { name: 'More information' }));
  });
});
