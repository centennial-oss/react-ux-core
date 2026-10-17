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
