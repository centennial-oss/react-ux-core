import { render, screen } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { UIProvider } from '../../provider/UIProvider';
import { expectNoAxeViolations } from '../../../test/axe';
import { filledIcons } from '../../../test/rating';
import { RatingDisplay } from './RatingDisplay';

describe('RatingDisplay', () => {
  it('fills fractions exactly and is one named, unfocusable image', () => {
    const { container } = render(<RatingDisplay value={3.7} />);
    const image = screen.getByRole('img', { name: '3.7 out of 5' });
    expect(screen.queryByRole('slider')).toBeNull();
    expect(image.tagName).toBe('SPAN');
    expect(container.firstElementChild).toBe(image);
    expect(image).not.toHaveAttribute('tabindex');
    expect(filledIcons(image)).toBeCloseTo(3.7, 1);
  });

  it('is named "No rating" without a value', () => {
    render(<RatingDisplay value={null} />);
    expect(screen.getByRole('img', { name: 'No rating' })).toBeVisible();
  });

  it('formats with formatOptions and the provider locale', () => {
    render(
      <UIProvider locale="de-DE">
        <RatingDisplay value={4.25} maxValue={10} formatOptions={{ maximumFractionDigits: 2 }} />
      </UIProvider>,
    );
    expect(screen.getByRole('img', { name: '4,25 out of 10' })).toBeVisible();
  });

  it('takes custom icons, sizes and tones', () => {
    render(<RatingDisplay value={2} maxValue={3} icon={Heart} size="lg" tone="danger" />);
    const image = screen.getByRole('img', { name: '2 out of 3' });
    const icons = image.querySelectorAll('svg.lucide-heart');
    // Two fills and one outline.
    expect(icons).toHaveLength(3);
    expect(icons[0]?.getAttribute('class')).toContain('text-danger-fg');
    expect(icons[2]?.getAttribute('class')).toContain('text-border-strong');
    expect(icons[0]?.getBoundingClientRect().width).toBe(28);
  });

  it('draws the outline only under icons that aren’t full', () => {
    const { container } = render(
      <>
        <RatingDisplay value={5} />
        <RatingDisplay value={3.5} />
        <RatingDisplay value={0} />
      </>,
    );
    const [full, half, empty] = [...container.querySelectorAll('[role="img"]')];
    expect(full?.querySelectorAll('svg')).toHaveLength(5);
    // Three fills, a half icon's outline and fill, and an outline.
    expect(half?.querySelectorAll('svg')).toHaveLength(6);
    expect(empty?.querySelectorAll('svg')).toHaveLength(5);
  });

  it('fills from the right in right-to-left text', () => {
    render(
      <div dir="rtl">
        <RatingDisplay value={0.5} maxValue={1} />
      </div>,
    );
    const slot = screen.getByRole('img').querySelector(':scope > span');
    const clip = slot?.querySelector(':scope > span');
    expect(clip?.getBoundingClientRect().right).toBeCloseTo(
      slot?.getBoundingClientRect().right ?? 0,
    );
  });

  it('renders many cheaply: one svg per icon, and a second only for a part-filled one', () => {
    const { container } = render(
      <ul>
        {Array.from({ length: 200 }, (_, index) => (
          <li key={index}>
            <RatingDisplay value={(index % 6) * 1} />
          </li>
        ))}
      </ul>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(200);
    expect(container.querySelectorAll('svg')).toHaveLength(200 * 5);
  });

  it('takes the app’s strings from UIProvider', () => {
    render(
      <UIProvider messages={{ ratingValue: ({ value, max }) => `${value} von ${max}` }}>
        <RatingDisplay value={3} />
      </UIProvider>,
    );
    expect(screen.getByRole('img', { name: '3 von 5' })).toBeVisible();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <p>
        Rated <RatingDisplay value={4.6} size="sm" /> by 1,284 people
      </p>,
    );
    await expectNoAxeViolations(container);
  });
});
