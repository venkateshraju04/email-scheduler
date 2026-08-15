import React from 'react';
import { cn } from './Button';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gray';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            'border-transparent bg-[#4CAF50] text-white hover:bg-[#45a049]': variant === 'default',
            'border-transparent bg-green-100 text-green-800': variant === 'success',
            'border-transparent bg-yellow-100 text-yellow-800': variant === 'warning',
            'border-transparent bg-red-100 text-red-800': variant === 'error',
            'border-transparent bg-gray-100 text-gray-800': variant === 'gray',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
