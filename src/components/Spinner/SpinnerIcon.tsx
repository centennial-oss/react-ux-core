import { cn } from '../../utils/cn';

/**
 * The spinning indicator drawn by Spinner and Button. Decorative and hidden from assistive technology; the component
 * using it conveys the busy state (Spinner's label, Button's aria-busy).
 */
export function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn(
        'size-4 animate-spin motion-reduce:animate-[spin_2s_linear_infinite]',
        className,
      )}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
