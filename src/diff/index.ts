// Public API for @centennial-oss/react-ux-core/diff: DiffViewer, PlanReview and the diff helpers behind them. The
// diff algorithm is built in, so this entry point has no optional peers.
export { DiffViewer, type DiffLayoutMode, type DiffViewerProps } from './DiffViewer';
export { PlanReview, type PlanReviewProps } from './PlanReview';
export {
  buildHunks,
  diffLines,
  diffSequences,
  diffWords,
  sortKeysDeep,
  splitLines,
  stringifyStructural,
  structuralNormalize,
  wordDiffRanges,
  type DiffChange,
  type DiffGap,
  type DiffHunk,
  type DiffLayout,
  type DiffLine,
  type DiffRange,
  type DiffSpan,
} from './diff';
export {
  countPlan,
  isDestructivePlan,
  planDiffTexts,
  type PlanCounts,
  type PlannedChange,
  type PlanPlaceholderText,
} from './plan';
export {
  defaultDiffMessages,
  useDiffMessages,
  type DiffMessages,
  type DiffStrings,
  type PlanAction,
} from './messages';
