import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/axe';
import { Checkbox } from '../Checkbox/Checkbox';
import { CheckboxGroup } from '../Checkbox/CheckboxGroup';
import { Radio, RadioGroup } from '../RadioGroup/RadioGroup';

function Quiz() {
  return (
    <RadioGroup label="Closest planet to the Sun?" value="venus" isReadOnly>
      <Radio value="venus" feedback={{ tone: 'danger', message: 'Your answer' }}>
        Venus
      </Radio>
      <Radio
        value="mercury"
        description="The smallest planet"
        feedback={{ tone: 'success', message: 'Correct answer' }}
      >
        Mercury
      </Radio>
      <Radio value="mars">Mars</Radio>
    </RadioGroup>
  );
}

describe('Option feedback', () => {
  it('describes each marked option with its tone and message', () => {
    render(<Quiz />);
    expect(screen.getByRole('radio', { name: 'Venus' })).toHaveAccessibleDescription(
      'Incorrect Your answer',
    );
    expect(screen.getByRole('radio', { name: 'Mercury' })).toHaveAccessibleDescription(
      'The smallest planet Correct Correct answer',
    );
    expect(screen.getByRole('radio', { name: 'Mars' })).not.toHaveAccessibleDescription();
  });

  it('names the tone icons', () => {
    render(<Quiz />);
    expect(screen.getByRole('img', { name: 'Incorrect' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Correct' })).toBeInTheDocument();
  });

  it('keeps a read-only group with feedback looking enabled', () => {
    render(<Quiz />);
    const option = screen.getByRole('radio', { name: 'Venus' });
    expect(option).not.toBeDisabled();
    const row = option.closest('label');
    expect(row).not.toHaveAttribute('data-disabled');
    expect(getComputedStyle(row as Element).opacity).toBe('1');
  });

  it('marks checkboxes too, and hides the icon when asked, keeping the tone in words', () => {
    render(
      <CheckboxGroup label="Gas giants" value={['jupiter']} isReadOnly>
        <Checkbox value="jupiter" feedback={{ tone: 'success', message: 'Your answer' }}>
          Jupiter
        </Checkbox>
        <Checkbox value="saturn" feedback={{ tone: 'warning', icon: null }}>
          Saturn
        </Checkbox>
      </CheckboxGroup>,
    );
    expect(screen.getByRole('checkbox', { name: 'Jupiter' })).toHaveAccessibleDescription(
      'Correct Your answer',
    );
    expect(screen.getByRole('checkbox', { name: 'Saturn' })).toHaveAccessibleDescription('Warning');
    expect(screen.queryByRole('img', { name: 'Warning' })).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Quiz />);
    await expectNoAxeViolations(container);
  });
});
