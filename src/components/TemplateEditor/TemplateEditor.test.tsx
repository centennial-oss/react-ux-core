import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { renderTemplate, smsParts, unknownKeywords, type TemplateEditorKeyword } from './template';
import { TemplateEditor } from './TemplateEditor';

const keywords: TemplateEditorKeyword[] = [
  { keyword: 'meter.serial', description: 'The meter’s serial number', example: 'S60R-04A3B2' },
  { keyword: 'customer.name', description: 'The customer’s name', example: 'Ada' },
  { keyword: 'customer.balance', description: 'The balance', example: 'KES 1,240.00' },
];

describe('template helpers', () => {
  it('fills known keywords and leaves unknown ones', () => {
    expect(renderTemplate('Hi {{customer.name}}, {{ meter.serial }} {{other}}', keywords)).toBe(
      'Hi Ada, S60R-04A3B2 {{other}}',
    );
    expect(unknownKeywords('{{other}} {{customer.name}} {{other}}', keywords)).toEqual(['other']);
  });

  it('counts SMS parts', () => {
    expect(smsParts(0)).toBe(0);
    expect(smsParts(160)).toBe(1);
    expect(smsParts(161)).toBe(2);
    expect(smsParts(306)).toBe(2);
    expect(smsParts(307)).toBe(3);
  });
});

function Editor({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TemplateEditor label="Message" keywords={keywords} value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('TemplateEditor', () => {
  it('suggests keywords after {{ and inserts the chosen one', async () => {
    render(<Editor />);
    const message = screen.getByRole('textbox', { name: 'Message' });
    await userEvent.click(message);
    await userEvent.keyboard('Hello {{{{cust');
    const list = await screen.findByRole('listbox', { name: 'Keywords' });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(message).toHaveAttribute('aria-activedescendant');

    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('value')).toHaveTextContent('Hello {{customer.balance}}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(message).toHaveFocus();
  });

  it('closes the suggestions with Escape', async () => {
    render(<Editor />);
    await userEvent.click(screen.getByRole('textbox', { name: 'Message' }));
    await userEvent.keyboard('{{{{');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows the message with sample values and counts it in SMS parts', () => {
    render(<Editor initial="Balance for {{customer.name}}" />);
    expect(screen.getByText('Balance for Ada')).toBeInTheDocument();
    expect(
      screen.getByText('15 of 160 characters with the sample values · 1 SMS'),
    ).toBeInTheDocument();
  });

  it('inserts a keyword from the list at the caret', async () => {
    render(<Editor initial="Hi " />);
    const message = screen.getByRole('textbox', { name: 'Message' });
    await userEvent.click(message);
    await userEvent.keyboard('{End}');
    await userEvent.click(screen.getByRole('button', { name: 'Keywords' }));
    await userEvent.click(screen.getByRole('button', { name: 'Insert {{customer.name}}' }));
    expect(screen.getByTestId('value')).toHaveTextContent('Hi {{customer.name}}');
  });

  it('has no accessibility violations, with suggestions open', async () => {
    const { container } = render(<Editor />);
    await userEvent.click(screen.getByRole('textbox', { name: 'Message' }));
    await userEvent.keyboard('{{{{');
    await screen.findByRole('listbox');
    await expectNoAxeViolations(container);
  });
});
