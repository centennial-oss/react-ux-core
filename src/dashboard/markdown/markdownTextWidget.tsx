// The text widget with a Markdown body (§10.6): the same type and options as the core `textWidget`, rendered through
// /markdown's Markdown (which needs the optional peers react-markdown and remark-gfm).

import { Markdown } from '../../markdown/Markdown';
import { createTextWidget } from '../widgets/textWidget';

/** The text widget type, rendering its body as Markdown. Register it instead of `textWidget`. */
export const markdownTextWidget = createTextWidget((body) => (
  // The frame's title is a level-3 heading; the body's headings sit under it.
  <Markdown headingLevel={4} isFullWidth>
    {body}
  </Markdown>
));
