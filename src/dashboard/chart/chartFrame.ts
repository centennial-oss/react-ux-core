// What every chart widget gives its chart's frame: the frame's title only (WID-07), the widget's states drawn by the
// chart (WID-12), the frame's height, and the chart's toolbar folded into the widget's menu (WID-08, BI-02).

import type { ChartFrameOptions } from '../../chart/ChartFrame';
import type { WidgetPropsEnv } from '../widgets/define';

export type ChartWidgetFrameProps = Required<
  Pick<ChartFrameOptions, 'title' | 'isTitleHidden' | 'hasToolbar' | 'hasFullScreen' | 'height'>
> &
  Pick<
    ChartFrameOptions,
    | 'isLoading'
    | 'error'
    | 'onRetry'
    | 'emptyState'
    | 'exportFileName'
    | 'onActionsChange'
    | 'className'
  >;

/** The frame props a chart widget passes its chart. */
export function chartFrameProps(env: WidgetPropsEnv): ChartWidgetFrameProps {
  return {
    title: env.title,
    isTitleHidden: true,
    isLoading: env.isLoading,
    error: env.error,
    onRetry: env.onRetry,
    emptyState: env.emptyState,
    exportFileName: env.title,
    // The frame's menu offers View as table, Export and Reset zoom, and Expand instead of full screen.
    hasToolbar: false,
    onActionsChange: env.setActions,
    hasFullScreen: false,
    height: '100%',
    // The frame is the surface: no second background or border inside it (THEME-02).
    className: 'min-h-0 flex-1 bg-transparent px-2 pb-2',
  };
}
