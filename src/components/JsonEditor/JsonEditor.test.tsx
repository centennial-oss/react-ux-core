import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { checkJson } from './json';
import { JsonEditor } from './JsonEditor';

describe('checkJson', () => {
  it('parses valid JSON', () => {
    expect(checkJson('{"a": [1, true, null]}')).toEqual({
      isValid: true,
      value: { a: [1, true, null] },
    });
  });

  it.each([
    ['{"a": 1,}', 'trailingComma', 1, 8],
    ['{"a" 1}', 'colon', 1, 6],
    ['{\n  "a": 1\n  "b": 2\n}', 'objectSeparator', 3, 3],
    ['[1, 2', 'end', 1, 6],
    ['{a: 1}', 'propertyName', 1, 2],
    ['"line\nbreak"', 'unterminatedString', 1, 6],
    ['{"a": "\\x"}', 'escape', 1, 8],
    ['[1] 2', 'extraText', 1, 5],
    ['[01]', 'arraySeparator', 1, 3],
  ])('finds the problem in %j: %s at line %i, column %i', (text, code, line, column) => {
    const check = checkJson(text);
    expect(check.isValid).toBe(false);
    if (!check.isValid) {
      expect(check.problem).toMatchObject({ code, line, column });
    }
  });
});

function Editor({ initial, onChange }: { initial: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <JsonEditor
      label="Configuration"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('JsonEditor', () => {
  it('reports a problem with its line and column as you type', async () => {
    render(<Editor initial='{"a": 1}' />);
    const editor = screen.getByRole('textbox', { name: 'Configuration' });
    expect(screen.getByText('Valid JSON')).toBeInTheDocument();
    expect(editor).not.toHaveAttribute('aria-invalid');

    await userEvent.click(editor);
    await userEvent.keyboard('{End}{ArrowLeft},');
    expect(editor).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText('Line 1, column 8: Remove this comma: nothing follows it'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Valid JSON')).toBeNull();
  });

  it('formats valid JSON, and can’t format invalid JSON', async () => {
    const onChange = vi.fn();
    const { unmount } = render(<Editor initial='{"a":[1,2]}' onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Format' }));
    expect(onChange).toHaveBeenLastCalledWith('{\n  "a": [\n    1,\n    2\n  ]\n}');
    unmount();

    render(<Editor initial='{"a":' />);
    expect(screen.getByRole('button', { name: 'Format' })).toBeDisabled();
  });

  it('shows an outside error when the JSON itself is fine', () => {
    render(
      <JsonEditor label="Config" value="{}" isInvalid errorMessage="The server rejected this" />,
    );
    expect(screen.getByText('The server rejected this')).toBeInTheDocument();
  });

  it('has no Format button when read-only', () => {
    render(<JsonEditor label="Config" defaultValue="{}" isReadOnly />);
    expect(screen.queryByRole('button', { name: 'Format' })).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Editor initial='{"a": 1,}' />);
    await expectNoAxeViolations(container);
  });
});
