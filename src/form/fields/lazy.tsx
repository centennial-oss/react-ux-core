// The form's parts whose code loads the first time a form shows them: the renderers for built-in types with large,
// rarely used inputs, and the rating stars in view mode. ConfigForm doesn't bundle them up front. Their placeholders
// carry `data-field-status="loading"`, for tests and screenshots to wait on.

import type { ComponentType, ReactNode } from 'react';
import { fieldRootClasses } from '../../components/Field/Field';
import { useFieldIds } from '../../components/Field/PlainField';
import { PlainFieldFrame } from '../../components/Field/PlainFieldFrame';
import type { RatingDisplayProps } from '../../components/Rating/RatingDisplay';
import { Skeleton } from '../../components/Skeleton/Skeleton';
import { lazyComponent } from '../../utils/lazyComponent';
import type { FieldRenderer, FieldRendererProps } from '../types';

interface FrameConfig {
  label?: ReactNode;
  description?: ReactNode;
  infoTip?: ReactNode;
}

/**
 * A field renderer whose code `load` fetches the first time a form shows the type. Until then the field shows its
 * label, description and error around a placeholder that `controlClassName` sizes like the input, so the form
 * doesn't move when it arrives. The value and validation are the form's, so they work while it loads.
 */
export function lazyField<TConfig extends FrameConfig, T>(
  load: () => Promise<ComponentType<FieldRendererProps<TConfig, T>>>,
  controlClassName: string,
): FieldRenderer {
  function FieldPlaceholder({ field, config }: FieldRendererProps<TConfig, T>) {
    const ids = useFieldIds();
    return (
      <div aria-busy="true" data-field-status="loading" className={fieldRootClasses()}>
        <PlainFieldFrame
          ids={ids}
          label={config.label}
          description={config.description}
          infoTip={config.infoTip}
          isRequired={field.isRequired}
          isInvalid={field.isInvalid}
          errorMessage={field.errorMessage}
        >
          <Skeleton shape="rect" className={controlClassName} />
        </PlainFieldFrame>
      </div>
    );
  }
  return lazyComponent(load, FieldPlaceholder) as FieldRenderer;
}

/** Icons as wide as RatingDisplay's (`md`, 1.25rem each) while it loads. */
function RatingPlaceholder({ maxValue = 5 }: RatingDisplayProps) {
  return (
    <span data-field-status="loading">
      <Skeleton
        shape="rect"
        width={`${String(maxValue * 1.25)}rem`}
        className="inline-block h-5 align-middle"
      />
    </span>
  );
}

/** RatingDisplay for view mode, loaded the first time a form shows a rating. */
export const LazyRatingDisplay = lazyComponent(
  () => import('../../components/Rating/RatingDisplay').then((module) => module.RatingDisplay),
  RatingPlaceholder,
);
