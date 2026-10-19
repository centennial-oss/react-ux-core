import { ArrowDown } from 'lucide-react';
import { Button } from '../components/Button/Button';
import { cn } from './cn';

export interface JumpToLatestButtonProps {
  /** The button's text, such as "Jump to latest (3 new)". */
  label: string;
  onPress: () => void;
  /** Classes for the bar the button floats in, at the bottom of the scrolling area. */
  className?: string;
}

/** The "Jump to latest" button floating over the bottom of a paused, bottom-anchored list (see useFollowScroll). */
export function JumpToLatestButton({ label, onPress, className }: JumpToLatestButtonProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-3 flex justify-center',
        className,
      )}
    >
      <Button
        size="sm"
        variant="solid"
        tone="accent"
        icon={ArrowDown}
        onPress={onPress}
        className="pointer-events-auto shadow-raised"
      >
        {label}
      </Button>
    </div>
  );
}
