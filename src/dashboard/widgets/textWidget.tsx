// The text widget (§10.6): a heading, note or annotation, with no data. The core type shows plain text with its line
// breaks; /dashboard/markdown's `markdownTextWidget` is the same type rendering Markdown, so documents work with
// either (the host registers one).

import { Type } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { AnyWidgetType, JsonObject } from '../types';
import { widgetFromComponent } from './define';
import { ScaledContent } from './ScaledContent';

/** The text widget's options. */
export interface TextWidgetOptions extends JsonObject {
  body: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  align: 'start' | 'center';
}

/** How much larger each size is than body text: a wall display's heading reads from across the room. */
const SIZE_SCALE: Record<TextWidgetOptions['size'], number> = {
  sm: 0.875,
  md: 1,
  lg: 1.5,
  xl: 2.25,
};

/** Draws the body: plain text here, Markdown in /dashboard/markdown. */
export type TextBodyRenderer = (body: string) => ReactNode;

/** Plain text, keeping its line breaks. */
const plainText: TextBodyRenderer = (body) => <p className="whitespace-pre-line text-fg">{body}</p>;

interface TextWidgetViewProps {
  body: string;
  size: TextWidgetOptions['size'];
  align: TextWidgetOptions['align'];
  scale: number;
  isEditing: boolean;
  emptyText: string;
  renderBody: TextBodyRenderer;
}

function TextWidgetView({
  body,
  size,
  align,
  scale,
  isEditing,
  emptyText,
  renderBody,
}: TextWidgetViewProps) {
  const hasBody = body.trim() !== '';
  return (
    <ScaledContent
      scale={scale * SIZE_SCALE[size]}
      className={cn(
        'overflow-auto px-3 pb-2',
        align === 'center' && 'items-center justify-center text-center',
      )}
    >
      {hasBody ? (
        renderBody(body)
      ) : isEditing ? (
        <p className="text-sm text-fg-muted">{emptyText}</p>
      ) : null}
    </ScaledContent>
  );
}

/** A text widget type drawing its body with `renderBody`; both variants share the type id and options. */
export function createTextWidget(renderBody: TextBodyRenderer = plainText): AnyWidgetType {
  return widgetFromComponent<TextWidgetOptions, undefined, TextWidgetViewProps>({
    type: 'ccux.text',
    displayName: (messages) => messages.textWidget,
    description: (messages) => messages.textWidgetDescription,
    icon: Type,
    category: (messages) => messages.widgetCategoryLayout,
    dataShape: null,
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 2 },
    stackedHeight: 'content',
    defaultOptions: { body: '', size: 'md', align: 'start' },
    optionsSchema: [
      { type: 'textarea', name: 'body', label: (m) => m.optionBody, minRows: 4, maxRows: 16 },
      {
        type: 'pillbox',
        name: 'size',
        label: (m) => m.optionTextSize,
        items: [
          { id: 'sm', label: (m) => m.textSizeSmall },
          { id: 'md', label: (m) => m.textSizeMedium },
          { id: 'lg', label: (m) => m.textSizeLarge },
          { id: 'xl', label: (m) => m.textSizeExtraLarge },
        ],
      },
      {
        type: 'pillbox',
        name: 'align',
        label: (m) => m.optionAlign,
        items: [
          { id: 'start', label: (m) => m.alignStart },
          { id: 'center', label: (m) => m.alignCenter },
        ],
      },
    ],
    toProps: (_data, options, env) => ({
      body: typeof options.body === 'string' ? options.body : '',
      size: options.size in SIZE_SCALE ? options.size : 'md',
      align: options.align,
      scale: env.frameSize.scale,
      isEditing: env.mode === 'edit',
      emptyText: env.messages.textEmpty,
      renderBody,
    }),
    component: TextWidgetView,
  });
}

/** The text widget type (P1), with plain text. For Markdown, register /dashboard/markdown's `markdownTextWidget`. */
export const textWidget = createTextWidget();
