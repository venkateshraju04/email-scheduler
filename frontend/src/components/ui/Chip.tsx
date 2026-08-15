import React from 'react';
import { X } from 'lucide-react';
import { cn } from './Button';

interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  onRemove?: () => void;
}

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, label, onRemove, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800',
          className
        )}
        {...props}
      >
        <span>{label}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:ring-offset-1"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {label}</span>
          </button>
        )}
      </div>
    );
  }
);
Chip.displayName = 'Chip';
