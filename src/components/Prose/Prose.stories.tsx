import type { Meta, StoryObj } from '@storybook/react-vite';
import { Prose } from './Prose';

const meta = {
  title: 'Display/Prose',
  component: Prose,
  args: { children: null },
} satisfies Meta<typeof Prose>;
export default meta;
type Story = StoryObj<typeof meta>;

const everything = (
  <>
    <h2>Kepler's laws of planetary motion</h2>
    <p>
      Johannes Kepler found that planets move in <strong>ellipses</strong>, not circles, with the
      Sun at one <em>focus</em>. His third law ties a planet's period to its distance:{' '}
      <code>T² ∝ a³</code>. See{' '}
      <a href="https://en.wikipedia.org/wiki/Kepler%27s_laws_of_planetary_motion">Kepler's laws</a>.
    </p>
    <h3>The three laws</h3>
    <ol>
      <li>Orbits are ellipses with the Sun at one focus.</li>
      <li>A planet sweeps out equal areas in equal times.</li>
      <li>The square of the period is proportional to the cube of the orbit's size.</li>
    </ol>
    <ul>
      <li>A planet moves fastest at perihelion, its closest point to the Sun.</li>
      <li>
        Earth's orbit is nearly circular: its eccentricity is <code>0.0167</code>.
      </li>
    </ul>
    <blockquote>
      Newton later showed that all three laws follow from his law of gravitation.
    </blockquote>
    <h4>Periods of the outer planets</h4>
    <table>
      <thead>
        <tr>
          <th scope="col">Planet</th>
          <th scope="col">Period</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Jupiter</td>
          <td>11.9 years</td>
        </tr>
        <tr>
          <td>Saturn</td>
          <td>29.5 years</td>
        </tr>
      </tbody>
    </table>
    <hr />
    <pre>
      <code>{'period_years = semi_major_axis_au ** 1.5'}</code>
    </pre>
  </>
);

/** Every element Prose styles, at the default size. */
export const AllElements: Story = {
  render: () => <Prose>{everything}</Prose>,
};

/** The small size, for explanations inside cards and dialogs. */
export const Small: Story = {
  render: () => <Prose size="sm">{everything}</Prose>,
};
