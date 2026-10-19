import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { expectNoAxeViolations } from '../../../test/axe';
import { Button } from '../Button';
import { Accordion, CollapsibleCard, Disclosure } from './Disclosure';

describe('Disclosure', () => {
  it('toggles with a real button that reports aria-expanded', async () => {
    const onExpandedChange = vi.fn();
    render(
      <Disclosure title="Advanced settings" onExpandedChange={onExpandedChange}>
        Hidden content
      </Disclosure>,
    );
    const trigger = screen.getByRole('button', { name: 'Advanced settings' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // The collapsed panel uses hidden="until-found" (content-visibility), so check real rendering visibility.
    expect(screen.getByText('Hidden content').checkVisibility()).toBe(false);
    expect(screen.getByRole('group', { hidden: true }).getBoundingClientRect().height).toBe(0);

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hidden content').checkVisibility()).toBe(true);
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it('is keyboard operable and sits inside a heading', async () => {
    render(
      <Disclosure title="Details" headingLevel={2}>
        Content
      </Disclosure>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Details' })).toBeInTheDocument();
    await userEvent.keyboard('{Tab}{Enter}');
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('follows isExpanded when controlled', async () => {
    function Controlled() {
      const [isExpanded, setExpanded] = useState(true);
      return (
        <Disclosure title="Details" isExpanded={isExpanded} onExpandedChange={setExpanded}>
          Content
        </Disclosure>
      );
    }
    render(<Controlled />);
    const trigger = screen.getByRole('button', { name: 'Details' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Accordion', () => {
  function Faq(props: { allowsMultipleExpanded?: boolean }) {
    return (
      <Accordion {...props}>
        <Disclosure id="billing" title="Billing">
          Billing answer
        </Disclosure>
        <Disclosure id="usage" title="Usage">
          Usage answer
        </Disclosure>
      </Accordion>
    );
  }

  it('opens one item at a time by default', async () => {
    render(<Faq />);
    await userEvent.click(screen.getByRole('button', { name: 'Billing' }));
    await userEvent.click(screen.getByRole('button', { name: 'Usage' }));
    expect(screen.getByRole('button', { name: 'Billing' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Usage' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens several with allowsMultipleExpanded', async () => {
    render(<Faq allowsMultipleExpanded />);
    await userEvent.click(screen.getByRole('button', { name: 'Billing' }));
    await userEvent.click(screen.getByRole('button', { name: 'Usage' }));
    expect(screen.getByRole('button', { name: 'Billing' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Usage' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('CollapsibleCard', () => {
  it('toggles from the header without its actions toggling it', async () => {
    const onPress = vi.fn();
    render(
      <CollapsibleCard
        title="Tariff"
        description="Commercial"
        actions={<Button onPress={onPress}>Edit</Button>}
      >
        Card body
      </CollapsibleCard>,
    );
    const trigger = screen.getByRole('button', { name: /Tariff/ });
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onPress).toHaveBeenCalled();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(screen.getByText('Card body').checkVisibility()).toBe(true);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        <CollapsibleCard title="Tariff" defaultExpanded>
          Body
        </CollapsibleCard>
        <Accordion defaultExpandedKeys={['a']}>
          <Disclosure id="a" title="A">
            A body
          </Disclosure>
          <Disclosure id="b" title="B">
            B body
          </Disclosure>
        </Accordion>
      </>,
    );
    await expectNoAxeViolations(container);
  });
});
