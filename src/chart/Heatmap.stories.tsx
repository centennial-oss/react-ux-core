import type { Meta, StoryObj } from '@storybook/react-vite';
import { scores, studyDays, topics, weeks } from '../../test/heatmap';
import { CalendarHeatmap } from './CalendarHeatmap';
import { HeatmapChart } from './HeatmapChart';

const meta = {
  title: 'Chart/Heatmap',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Topics by weeks on a sequential scale, with values in the cells and weeks not yet practised hatched. */
export const QuizScores: Story = {
  render: () => (
    <HeatmapChart
      title="Quiz scores by topic"
      rows={topics}
      columns={weeks}
      values={scores}
      unit="%"
      scale={{ min: 0, max: 100 }}
      hasCellLabels
      exportFileName="quiz-scores"
    />
  ),
};

/** A diverging scale around a 70% passing grade, in five steps. */
export const DivergingInSteps: Story = {
  render: () => (
    <HeatmapChart
      title="Scores against the passing grade"
      rows={topics}
      columns={weeks}
      values={scores}
      unit="%"
      scale={{ type: 'diverging', min: 30, max: 100, midpoint: 70, steps: 5 }}
    />
  ),
};

/** Six months of study as a calendar: a column per week, a row per weekday. */
export const StudyCalendar: Story = {
  render: () => (
    <CalendarHeatmap
      title="Study sessions"
      start="2026-04-16"
      end="2026-10-15"
      values={studyDays('2026-04-16', 183)}
      unit="sessions"
      scale={{ colors: 'success' }}
    />
  ),
};

/** A new user's calendar: no activity yet, so every day is the lowest colour, with a notice under the grid. */
export const EmptyNewUser: Story = {
  name: 'Empty (new user)',
  render: () => (
    <CalendarHeatmap
      title="Study sessions"
      start="2026-04-17"
      end="2026-10-16"
      values={{}}
      unit="sessions"
    />
  ),
};

/** Every value equal: no range, so cells show no intensity and the legend has one entry. */
export const AllEqual: Story = {
  render: () => (
    <HeatmapChart
      title="Quiz scores by topic"
      rows={topics.slice(0, 3)}
      columns={weeks.slice(0, 4)}
      values={topics.slice(0, 3).map(() => weeks.slice(0, 4).map(() => 75))}
      unit="%"
      hasCellLabels
    />
  ),
};

/** A whole year fits on a desktop: cells shrink (down to 10 px) to fit the width, and month names thin out. */
export const YearAtAGlance: Story = {
  render: () => (
    <CalendarHeatmap
      title="Observing nights"
      start="2025-10-17"
      end="2026-10-16"
      values={studyDays('2025-10-17', 365)}
      unit="hours"
      scale={{ colors: 'success' }}
    />
  ),
};

/**
 * Fixed cell sizes (at least 24 px on touch screens). A calendar that still scrolls (on a phone) opens on its latest
 * weeks, and the scroll hint points back.
 */
export const FixedCellSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <CalendarHeatmap
          key={size}
          title={`Study sessions (${size})`}
          start="2026-07-17"
          end="2026-10-16"
          values={studyDays('2026-07-17', 92)}
          unit="sessions"
          cellSize={size}
        />
      ))}
    </div>
  ),
};
